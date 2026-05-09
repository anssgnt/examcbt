// Supabase Edge Function: set_student_online
// Deploy:
// supabase functions deploy set_student_online --no-verify-jwt
//
// Tujuan:
// - Update online status siswa secara aman (service role)
// - Rate limit untuk mencegah spam refresh (client nakal)
// - Sekalian cek reset_flags + broadcast terbaru

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OnlinePayload = {
  examId: string;
  userId: string;
  progress?: number;
  total?: number;
  status?: string;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json(500, { success: false, error: "Missing server env" });

    const payload = (await req.json()) as OnlinePayload;
    const examId = String(payload?.examId || "").trim();
    const userId = String(payload?.userId || "").trim();
    if (!examId || !userId) return json(400, { success: false, error: "Invalid payload" });

    const now = Date.now();
    const id = `${examId}_${userId}`;
    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    // 1) Reset flags check (selalu diprioritaskan)
    const rfRes = await fetch(
      `${supabaseUrl}/rest/v1/reset_flags?exam_id=eq.${encodeURIComponent(examId)}&user_id=eq.${encodeURIComponent(userId)}&select=id`,
      { headers }
    );
    if (rfRes.ok) {
      const rows = await rfRes.json();
      if (Array.isArray(rows) && rows.length > 0) {
        await fetch(
          `${supabaseUrl}/rest/v1/reset_flags?exam_id=eq.${encodeURIComponent(examId)}&user_id=eq.${encodeURIComponent(userId)}`,
          { method: "DELETE", headers }
        );
        return json(200, { success: true, sessionReset: true });
      }
    }

    // 2) Rate limit online update (min 60s)
    // Ambil last_seen jika ada
    let lastSeen = 0;
    try {
      const getRes = await fetch(
        `${supabaseUrl}/rest/v1/online_status?id=eq.${encodeURIComponent(id)}&select=last_seen`,
        { headers }
      );
      if (getRes.ok) {
        const rows = await getRes.json();
        if (Array.isArray(rows) && rows.length > 0 && typeof rows[0]?.last_seen === "number") {
          lastSeen = rows[0].last_seen;
        }
      }
    } catch (_) {}

    const MIN_GAP_MS = 60_000;
    const shouldUpdate = !lastSeen || (now - lastSeen) >= MIN_GAP_MS;
    if (shouldUpdate) {
      const upsert = {
        id,
        exam_id: examId,
        user_id: userId,
        last_seen: now,
        progress: Number(payload.progress || 0),
        total: Number(payload.total || 0),
        status: String(payload.status || "MENGERJAKAN"),
      };
      const upRes = await fetch(`${supabaseUrl}/rest/v1/online_status`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(upsert),
      });
      if (!upRes.ok) {
        const t = await upRes.text();
        return json(500, { success: false, error: `online_status upsert failed: ${t}` });
      }
    }

    // 3) Broadcast check (ambil 1 terbaru)
    const bcRes = await fetch(
      `${supabaseUrl}/rest/v1/broadcasts?exam_id=eq.${encodeURIComponent(examId)}&order=timestamp.desc&limit=1`,
      { headers }
    );
    if (bcRes.ok) {
      const bcRows = await bcRes.json();
      if (Array.isArray(bcRows) && bcRows.length > 0) {
        return json(200, { success: true, broadcast: bcRows[0], throttled: !shouldUpdate });
      }
    }

    return json(200, { success: true, throttled: !shouldUpdate });
  } catch (e) {
    return json(500, { success: false, error: String(e) });
  }
});


// Supabase Edge Function: set_status_sync
// Deploy:
// supabase functions deploy set_status_sync --no-verify-jwt
//
// Tujuan: siswa melaporkan sudah sync (untuk dashboard proktor).
// Rate limit untuk mencegah spam.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  examId: string;
  userId: string;
  ready?: boolean;
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

    const p = (await req.json()) as Payload;
    const examId = String(p?.examId || "").trim();
    const userId = String(p?.userId || "").trim();
    const ready = p?.ready !== false;
    if (!examId || !userId) return json(400, { success: false, error: "Invalid payload" });

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    // Rate limit by existing row timestamp (if column exists)
    const id = `${examId}_${userId}`;
    let last = 0;
    try {
      const getRes = await fetch(`${supabaseUrl}/rest/v1/status_sync?exam_id=eq.${encodeURIComponent(examId)}&user_id=eq.${encodeURIComponent(userId)}&select=timestamp`, { headers });
      if (getRes.ok) {
        const rows = await getRes.json();
        if (Array.isArray(rows) && rows.length > 0 && typeof rows[0]?.timestamp === "number") last = rows[0].timestamp;
      }
    } catch (_) {}

    const now = Date.now();
    if (last && (now - last) < 30_000) return json(200, { success: true, throttled: true });

    const row = { id, exam_id: examId, user_id: userId, ready, timestamp: now };
    const upRes = await fetch(`${supabaseUrl}/rest/v1/status_sync`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(row),
    });
    if (!upRes.ok) return json(500, { success: false, error: await upRes.text() });
    return json(200, { success: true });
  } catch (e) {
    return json(500, { success: false, error: String(e) });
  }
});


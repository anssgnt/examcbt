// Supabase Edge Function: sync_answer_delta
// Deploy:
// supabase functions deploy sync_answer_delta --no-verify-jwt

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SyncPayload = {
  id_ujian: string;
  id_siswa: string;
  answerDelta?: Record<string, unknown>;
  timeRemaining?: number;
  violations?: number;
};

const MIN_SYNC_GAP_MS = 8_000; // rate limit per siswa (anti spam / bug loop)
const MAX_DELTA_KEYS = 60;     // batasi perubahan per request
const MAX_PAYLOAD_BYTES = 40_000; // ~40KB

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: "Missing server env" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Quick size guard (hindari payload bengkak)
    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return json(413, { success: false, error: "Payload too large" });
    }
    const payload = JSON.parse(raw || "{}") as SyncPayload;
    const examId = String(payload?.id_ujian || "");
    const userId = String(payload?.id_siswa || "");
    if (!examId || !userId) {
      return json(400, { success: false, error: "Invalid payload" });
    }

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    const syncId = `${examId}_${userId}`;
    const getRes = await fetch(
      `${supabaseUrl}/rest/v1/sync_answers?id=eq.${encodeURIComponent(syncId)}&select=answers,last_sync`,
      { headers }
    );
    const currentRows = getRes.ok ? await getRes.json() : [];
    const lastSync = (
      Array.isArray(currentRows) &&
      currentRows.length > 0 &&
      typeof currentRows[0]?.last_sync === "number"
    ) ? currentRows[0].last_sync : 0;

    // Rate limit: jika terlalu cepat, abaikan update (tetap 200 agar client tidak panik)
    const now = Date.now();
    if (lastSync && (now - lastSync) < MIN_SYNC_GAP_MS) {
      return json(200, { success: true, throttled: true, mergedCount: 0 });
    }

    const mergedAnswers: Record<string, unknown> = (
      Array.isArray(currentRows) && currentRows.length > 0 && currentRows[0]?.answers && typeof currentRows[0].answers === "object"
    ) ? { ...currentRows[0].answers } : {};

    const delta = (payload.answerDelta && typeof payload.answerDelta === "object") ? payload.answerDelta : {};
    const deltaKeys = Object.keys(delta);
    if (deltaKeys.length > MAX_DELTA_KEYS) {
      return json(400, { success: false, error: "Delta too large" });
    }
    deltaKeys.forEach((qId) => {
      const value = delta[qId];
      if (value === null || value === undefined) delete mergedAnswers[qId];
      else mergedAnswers[qId] = value;
    });

    const upsertPayload = {
      id: syncId,
      exam_id: examId,
      user_id: userId,
      answers: mergedAnswers,
      time_remaining: Number(payload.timeRemaining || 0),
      violations: Number(payload.violations || 0),
      last_sync: now,
    };

    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/sync_answers`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(upsertPayload),
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      return json(500, { success: false, error: `Upsert failed: ${errText}` });
    }

    return json(200, { success: true, mergedCount: Object.keys(mergedAnswers).length });
  } catch (e) {
    return json(500, { success: false, error: String(e) });
  }
});

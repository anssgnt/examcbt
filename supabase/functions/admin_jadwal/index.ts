// Supabase Edge Function: admin_jadwal
// Deploy:
// supabase functions deploy admin_jadwal --no-verify-jwt
//
// Catatan:
// - Ini dipakai admin panel untuk CRUD jadwal_ujian saat RLS hardening aktif.
// - Auth sederhana: adminPass dikirim dari client (session) lalu diverifikasi terhadap config admin_pass.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  action: "upsert" | "delete";
  adminPass: string;
  id: string;
  data?: Record<string, unknown>;
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
    const action = p?.action;
    const adminPass = String(p?.adminPass || "");
    const id = String(p?.id || "").trim();
    const data = (p?.data && typeof p.data === "object") ? p.data : {};
    if (!action || !adminPass || !id) return json(400, { success: false, error: "Invalid payload" });

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    // Verify admin pass against config table (key = 'admin_pass')
    const confRes = await fetch(`${supabaseUrl}/rest/v1/config?key=eq.admin_pass&select=value`, { headers });
    if (!confRes.ok) return json(500, { success: false, error: "Config read failed" });
    const confRows = await confRes.json();
    const stored = (Array.isArray(confRows) && confRows.length > 0) ? confRows[0]?.value : null;
    const storedPass = (stored && typeof stored === "object")
      ? (stored.pass || stored.value || stored)
      : stored;
    if (!storedPass || adminPass !== String(storedPass)) return json(403, { success: false, error: "Forbidden" });

    if (action === "delete") {
      const delRes = await fetch(`${supabaseUrl}/rest/v1/jadwal_ujian?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
      });
      if (!delRes.ok) return json(500, { success: false, error: await delRes.text() });
      return json(200, { success: true });
    }

    // upsert
    const row = { id, ...data };
    const upRes = await fetch(`${supabaseUrl}/rest/v1/jadwal_ujian`, {
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


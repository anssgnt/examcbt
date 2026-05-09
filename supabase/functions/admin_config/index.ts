// Supabase Edge Function: admin_config
// Deploy:
// supabase functions deploy admin_config --no-verify-jwt
//
// Admin-only config writes for:
// - config/security
// - config/identity
// - config/admin_pass (optional)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  adminPass: string;
  key: "security" | "identity" | "admin_pass";
  value: unknown;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function getStoredAdminPass(supabaseUrl: string, headers: Record<string, string>) {
  const confRes = await fetch(`${supabaseUrl}/rest/v1/config?key=eq.admin_pass&select=value`, { headers });
  if (!confRes.ok) return null;
  const confRows = await confRes.json();
  const stored = (Array.isArray(confRows) && confRows.length > 0) ? confRows[0]?.value : null;
  const storedPass = (stored && typeof stored === "object") ? (stored.pass || stored.value || stored) : stored;
  return storedPass ? String(storedPass) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json(500, { success: false, error: "Missing server env" });

    const p = (await req.json()) as Payload;
    const adminPass = String(p?.adminPass || "");
    const key = p?.key;
    const value = p?.value;
    if (!adminPass || !key) return json(400, { success: false, error: "Invalid payload" });

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    const storedPass = await getStoredAdminPass(supabaseUrl, headers);
    if (!storedPass || adminPass !== storedPass) return json(403, { success: false, error: "Forbidden" });

    if (key === "admin_pass") {
      // Upsert admin_pass value
      const upRes = await fetch(`${supabaseUrl}/rest/v1/config`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ key: "admin_pass", value }),
      });
      if (!upRes.ok) return json(500, { success: false, error: await upRes.text() });
      return json(200, { success: true });
    }

    const upRes = await fetch(`${supabaseUrl}/rest/v1/config`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ key, value: JSON.stringify(value ?? {}) }),
    });
    if (!upRes.ok) return json(500, { success: false, error: await upRes.text() });
    return json(200, { success: true });
  } catch (e) {
    return json(500, { success: false, error: String(e) });
  }
});


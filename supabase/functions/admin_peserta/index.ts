// Supabase Edge Function: admin_peserta
// Deploy:
// supabase functions deploy admin_peserta --no-verify-jwt
//
// Admin CRUD peserta (RLS safe).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  action: "upsert_one" | "upsert_many" | "delete_one";
  adminPass: string;
  peserta?: { id: string; nama?: string; kelas?: string };
  pesertaList?: Array<{ id: string; nama?: string; kelas?: string }>;
  id?: string;
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

function cleanOne(p: { id: string; nama?: string; kelas?: string }) {
  return {
    id: String(p.id),
    nama: String(p.nama || ""),
    kelas: String(p.kelas || ""),
  };
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
    if (!action || !adminPass) return json(400, { success: false, error: "Invalid payload" });

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };
    const storedPass = await getStoredAdminPass(supabaseUrl, headers);
    if (!storedPass || adminPass !== storedPass) return json(403, { success: false, error: "Forbidden" });

    if (action === "delete_one") {
      const id = String(p?.id || "").trim();
      if (!id) return json(400, { success: false, error: "Missing id" });
      const delRes = await fetch(`${supabaseUrl}/rest/v1/peserta?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers });
      if (!delRes.ok) return json(500, { success: false, error: await delRes.text() });
      return json(200, { success: true });
    }

    if (action === "upsert_one") {
      if (!p.peserta?.id) return json(400, { success: false, error: "Missing peserta" });
      const row = cleanOne(p.peserta);
      const upRes = await fetch(`${supabaseUrl}/rest/v1/peserta`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(row),
      });
      if (!upRes.ok) return json(500, { success: false, error: await upRes.text() });
      return json(200, { success: true });
    }

    // upsert_many
    const list = Array.isArray(p.pesertaList) ? p.pesertaList : [];
    if (list.length === 0) return json(400, { success: false, error: "Empty list" });
    const clean = list.filter(x => x && x.id).map(cleanOne);
    const upRes = await fetch(`${supabaseUrl}/rest/v1/peserta`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(clean),
    });
    if (!upRes.ok) return json(500, { success: false, error: await upRes.text() });
    return json(200, { success: true, upserted: clean.length });
  } catch (e) {
    return json(500, { success: false, error: String(e) });
  }
});


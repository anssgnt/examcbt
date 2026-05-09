// Supabase Edge Function: admin_banksoal
// Deploy:
// supabase functions deploy admin_banksoal --no-verify-jwt
//
// Admin CRUD bank soal + kunci (RLS safe).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SoalRow = {
  id: string | number;
  pertanyaan?: string;
  tipe?: string;
  gambar?: string;
  opsi?: unknown;
  bobot?: number;
};

type Payload =
  | { action: "upsert_soal_bulk"; adminPass: string; bankId: string; soal: Record<string, SoalRow> }
  | { action: "upsert_kunci_bulk"; adminPass: string; bankId: string; kunci: Record<string, unknown> }
  | { action: "delete_bank"; adminPass: string; bankId: string };

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
    const adminPass = String((p as any)?.adminPass || "");
    const bankId = String((p as any)?.bankId || "").trim();
    const action = (p as any)?.action;
    if (!adminPass || !action || !bankId) return json(400, { success: false, error: "Invalid payload" });

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };
    const storedPass = await getStoredAdminPass(supabaseUrl, headers);
    if (!storedPass || adminPass !== storedPass) return json(403, { success: false, error: "Forbidden" });

    if (action === "delete_bank") {
      const delSoal = await fetch(`${supabaseUrl}/rest/v1/soal?bank_id=eq.${encodeURIComponent(bankId)}`, { method: "DELETE", headers });
      const delKunci = await fetch(`${supabaseUrl}/rest/v1/kunci?bank_id=eq.${encodeURIComponent(bankId)}`, { method: "DELETE", headers });
      if (!delSoal.ok) return json(500, { success: false, error: await delSoal.text() });
      if (!delKunci.ok) return json(500, { success: false, error: await delKunci.text() });
      return json(200, { success: true });
    }

    if (action === "upsert_soal_bulk") {
      const soal = (p as any).soal || {};
      const keys = Object.keys(soal);
      if (keys.length === 0) return json(400, { success: false, error: "Empty soal" });
      const rows = keys.map((qid) => {
        const src = soal[qid] || {};
        const parsedId = Number.isNaN(parseInt(String(qid), 10)) ? String(qid) : parseInt(String(qid), 10);
        const qType = String((src as any).tipe || "PG");
        const row: Record<string, unknown> = {
          bank_id: bankId,
          id: parsedId,
          pertanyaan: String((src as any).pertanyaan || ""),
          tipe: qType,
          gambar: String((src as any).gambar || ""),
          opsi: Array.isArray((src as any).opsi) ? (src as any).opsi : ((src as any).opsi ?? []),
          bobot: Number((src as any).bobot || 1) || 1,
          // Selalu include kiri/kanan agar semua row punya kolom yang sama (PGRST102 fix)
          kiri: qType === "JODOH" && Array.isArray((src as any).kiri) ? (src as any).kiri : [],
          kanan: qType === "JODOH" && Array.isArray((src as any).kanan) ? (src as any).kanan : [],
        };
        return row;
      });
      const upRes = await fetch(`${supabaseUrl}/rest/v1/soal`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(rows),
      });
      if (!upRes.ok) return json(500, { success: false, error: await upRes.text() });
      return json(200, { success: true, upserted: rows.length });
    }

    // upsert_kunci_bulk
    const kunci = (p as any).kunci || {};
    const keys = Object.keys(kunci);
    if (keys.length === 0) return json(400, { success: false, error: "Empty kunci" });
    const rows = keys.map((qid) => {
      const parsedId = Number.isNaN(parseInt(String(qid), 10)) ? String(qid) : parseInt(String(qid), 10);
      return { bank_id: bankId, id: parsedId, kunci: (kunci as any)[qid] };
    });
    const upRes = await fetch(`${supabaseUrl}/rest/v1/kunci`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(rows),
    });
    if (!upRes.ok) return json(500, { success: false, error: await upRes.text() });
    return json(200, { success: true, upserted: rows.length });
  } catch (e) {
    return json(500, { success: false, error: String(e) });
  }
});


// Supabase Edge Function: submit_exam
// Deploy:
// supabase functions deploy submit_exam --no-verify-jwt

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SubmitPayload = {
  examId: string;
  user: { id: string; name?: string; kelas?: string };
  usedTime?: string;
  violations?: number;
  detail?: string;
  answers?: Record<string, unknown>;
  score?: number | null;
};

function normalizeAnswer(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function isEqualIgnoreCase(a: string, b: string): boolean {
  return a.toUpperCase() === b.toUpperCase();
}

function gradeOne(qType: string, correctAnsRaw: unknown, userAns: unknown): boolean {
  const correctAns = normalizeAnswer(correctAnsRaw);
  if (userAns === undefined || userAns === null) return false;

  if (qType === "PG" || qType === "BS") {
    return isEqualIgnoreCase(normalizeAnswer(userAns), correctAns);
  }

  if (qType === "KOMPLEKS") {
    if (!Array.isArray(userAns)) return false;
    const cArr = correctAns.split(",").map((s) => s.trim().toUpperCase()).sort();
    const uArr = userAns.map((s) => normalizeAnswer(s).toUpperCase()).sort();
    return JSON.stringify(cArr) === JSON.stringify(uArr);
  }

  if (qType === "ISIAN") {
    return normalizeAnswer(userAns).toLowerCase() === correctAns.toLowerCase();
  }

  if (qType === "JODOH") {
    if (typeof userAns !== "object" || Array.isArray(userAns)) return false;
    const cPairs: Record<string, string> = {};
    correctAns.split(";").forEach((p) => {
      const pt = p.split("=");
      if (pt.length === 2) cPairs[pt[0].trim()] = pt[1].trim();
    });
    const keys = Object.keys(cPairs);
    if (keys.length === 0) return false;
    for (const k of keys) {
      const val = (userAns as Record<string, unknown>)[k];
      if (normalizeAnswer(val) !== cPairs[k]) return false;
    }
    return true;
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
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

    const payload = (await req.json()) as SubmitPayload;
    if (!payload?.examId || !payload?.user?.id) {
      return new Response(JSON.stringify({ success: false, error: "Invalid payload" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const examId = String(payload.examId);
    const userId = String(payload.user.id);
    const resultId = `${examId}_${userId}`;

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    // Idempotent check
    const existingRes = await fetch(`${supabaseUrl}/rest/v1/hasil?id=eq.${encodeURIComponent(resultId)}&select=skor,id,detail`, { headers });
    if (existingRes.ok) {
      const existingRows = await existingRes.json();
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        const existing = existingRows[0];
        let existingDetail = {};
        try {
          existingDetail = typeof existing.detail === 'string'
            ? JSON.parse(existing.detail)
            : (existing.detail || {});
        } catch (_) {}
        return new Response(JSON.stringify({ 
          success: true, 
          alreadySubmitted: true, 
          score: existing.skor ?? 0,
          detail: existingDetail
        }), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch schedule to know question bank
    const schRes = await fetch(`${supabaseUrl}/rest/v1/jadwal_ujian?id=eq.${encodeURIComponent(examId)}&select=id,nama_soal`, { headers });
    const schRows = schRes.ok ? await schRes.json() : [];
    if (!Array.isArray(schRows) || schRows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Exam not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const bankId = schRows[0].nama_soal;

    const [qRes, kRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/soal?bank_id=eq.${encodeURIComponent(bankId)}&select=id,tipe,bobot`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/kunci?bank_id=eq.${encodeURIComponent(bankId)}&select=id,kunci`, { headers }),
    ]);

    const questions = qRes.ok ? await qRes.json() : [];
    const keys = kRes.ok ? await kRes.json() : [];
    const questionById: Record<string, { tipe?: string; bobot?: number }> = {};
    questions.forEach((q: any) => { questionById[String(q.id)] = q; });

    let totalPoints = 0;
    let maxPoints = 0;
    const answers = payload.answers || {};
    const detailResult: Record<string, { answer: unknown; correct: boolean }> = {};

    keys.forEach((k: any) => {
      const qId = String(k.id);
      const q = questionById[qId] || {};
      const bobot = Number(q.bobot) || 1;
      const qType = String(q.tipe || "PG");
      const userAns = answers[qId];
      maxPoints += bobot;
      const isCorrect = gradeOne(qType, k.kunci, userAns);
      if (isCorrect) totalPoints += bobot;
      detailResult[qId] = {
        answer: userAns !== undefined && userAns !== null ? userAns : "-",
        correct: isCorrect,
      };
    });

    const finalScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

    const insertPayload = {
      id: resultId,
      exam_id: examId,
      user_id: userId,
      nama: payload.user.name || userId,
      kelas: payload.user.kelas || "-",
      skor: finalScore,
      // Simpan detail dari server (sudah ada correct=true/false per soal)
      detail: JSON.stringify(detailResult),
      waktu: payload.usedTime || "",
      violations: Number(payload.violations || 0),
      timestamp: Date.now(),
    };

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/hasil`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(insertPayload),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return new Response(JSON.stringify({ success: false, error: `Insert failed: ${errText}` }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      score: finalScore,
      detail: detailResult  // ✅ Kembalikan detail ke client agar result page bisa tampilkan Benar/Salah/Kosong
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { violations } = body;

    if (!violations || !Array.isArray(violations)) {
      return new Response(
        JSON.stringify({ error: "Invalid violations data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-violations] Syncing ${violations.length} violations...`);

    // Transform Firebase violations to Supabase format
    const transformedViolations = violations.map((v: any) => ({
      timestamp: v.timestamp || new Date().toISOString(),
      nama: v.nama || "Unknown",
      kelas: v.kelas || "",
      exam_id: v.examId || v.exam_id || "",
      tipe: v.tipe || "Pelanggaran",
      user_id: v.userId || v.user_id || "",
      waktu: v.waktu || new Date().toLocaleString("id-ID"),
    }));

    // Insert or upsert violations to Supabase
    const { data, error } = await supabase
      .from("pelanggaran")
      .upsert(transformedViolations, { onConflict: "user_id,exam_id,timestamp" });

    if (error) {
      console.error("[sync-violations] Error:", error);
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-violations] Successfully synced ${data?.length || 0} violations`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${data?.length || 0} violations`,
        data,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sync-violations] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

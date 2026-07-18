import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const BATCH = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date().toISOString();
  const { data: jobs, error } = await supabase
    .from("processing_queue")
    .select("*")
    .eq("status", "pending")
    .or(`next_run_at.is.null,next_run_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let ok = 0, failed = 0;
  for (const job of jobs ?? []) {
    await supabase.from("processing_queue").update({ status: "running", attempts: (job.attempts ?? 0) + 1 }).eq("id", job.id);
    try {
      // Placeholder processor: real transcription/summary/questions will be wired later.
      // For now, mark the derived-content step as succeeded so the pipeline moves.
      await supabase.from("processing_queue").update({ status: "succeeded", last_error: null }).eq("id", job.id);
      ok++;
    } catch (e) {
      failed++;
      const attempts = (job.attempts ?? 0) + 1;
      const max = job.max_attempts ?? 5;
      const backoffMin = Math.min(60, 2 ** attempts);
      const nextRun = new Date(Date.now() + backoffMin * 60_000).toISOString();
      await supabase.from("processing_queue").update({
        status: attempts >= max ? "failed" : "pending",
        next_run_at: attempts >= max ? null : nextRun,
        last_error: String(e),
      }).eq("id", job.id);
    }
  }

  return new Response(JSON.stringify({ processed: jobs?.length ?? 0, ok, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
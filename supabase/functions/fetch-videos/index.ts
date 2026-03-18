import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.trim().match(p);
    if (m) return m[1];
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SHEETS_ID = Deno.env.get("GOOGLE_SHEETS_ID");
    const API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");

    if (!SHEETS_ID || !API_KEY) {
      return new Response(
        JSON.stringify({ videos: [], error: "Spreadsheet not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read column B from the "Links" sheet
    const range = encodeURIComponent("Links!B:B");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${range}?key=${API_KEY}&majorDimension=ROWS`;

    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      console.error("Sheets API error:", res.status, errText);
      return new Response(
        JSON.stringify({ videos: [], error: "Failed to read spreadsheet" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const rows: string[][] = data.values ?? [];

    // Also read column A for titles (optional)
    const rangeA = encodeURIComponent("Links!A:A");
    const urlA = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${rangeA}?key=${API_KEY}&majorDimension=ROWS`;
    const resA = await fetch(urlA);
    const dataA = resA.ok ? await resA.json() : { values: [] };
    const rowsA: string[][] = dataA.values ?? [];

    const videos: { id: string; title: string; embedUrl: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i]?.[0]?.trim();
      if (!cell) continue;

      const ytId = extractYouTubeId(cell);
      if (!ytId) continue;

      const title = rowsA[i]?.[0]?.trim() || `Vídeo ${videos.length + 1}`;

      videos.push({
        id: ytId,
        title,
        embedUrl: `https://www.youtube.com/embed/${ytId}`,
      });
    }

    return new Response(JSON.stringify({ videos }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-videos error:", e);
    return new Response(
      JSON.stringify({ videos: [], error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

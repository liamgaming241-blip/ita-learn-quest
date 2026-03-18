import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type FolderRecord = {
  folderId: string;
  folderName: string;
};

function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  const normalized = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return match[1];
  }

  return null;
}

async function listFolderFiles(folderId: string, apiKey: string) {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const fields = encodeURIComponent("files(id,name,mimeType)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&key=${apiKey}&fields=${fields}&pageSize=1000`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drive API error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  return (data.files ?? []) as Array<{ id: string; name: string; mimeType: string }>;
}

async function findLinksSpreadsheet(folderId: string, apiKey: string) {
  const files = await listFolderFiles(folderId, apiKey);

  return files.find(
    (file) =>
      file.mimeType === "application/vnd.google-apps.spreadsheet" &&
      file.name.trim().toLowerCase() === "links"
  ) ?? null;
}

async function readSheetColumn(spreadsheetId: string, range: string, apiKey: string) {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}&majorDimension=ROWS`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sheets API error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  return (data.values ?? []) as string[][];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");

    if (!authHeader || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY || !GOOGLE_DRIVE_API_KEY) {
      return new Response(JSON.stringify({ videos: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", videos: [] }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [{ data: subjects, error: subjectsError }, { data: topics, error: topicsError }] = await Promise.all([
      supabase.from("subjects").select("name, drive_folder_id").eq("user_id", user.id).not("drive_folder_id", "is", null),
      supabase.from("topics").select("name, drive_folder_id").eq("user_id", user.id).not("drive_folder_id", "is", null),
    ]);

    if (subjectsError) throw subjectsError;
    if (topicsError) throw topicsError;

    const folders = new Map<string, FolderRecord>();

    for (const subject of subjects ?? []) {
      if (subject.drive_folder_id) {
        folders.set(subject.drive_folder_id, { folderId: subject.drive_folder_id, folderName: subject.name });
      }
    }

    for (const topic of topics ?? []) {
      if (topic.drive_folder_id) {
        folders.set(topic.drive_folder_id, { folderId: topic.drive_folder_id, folderName: topic.name });
      }
    }

    const videos: Array<{ id: string; title: string; embedUrl: string; sourceFolder: string }> = [];

    for (const folder of folders.values()) {
      try {
        const spreadsheet = await findLinksSpreadsheet(folder.folderId, GOOGLE_DRIVE_API_KEY);
        if (!spreadsheet) continue;

        const [titles, links] = await Promise.all([
          readSheetColumn(spreadsheet.id, "Links!A:A", GOOGLE_DRIVE_API_KEY).catch(() => []),
          readSheetColumn(spreadsheet.id, "Links!B:B", GOOGLE_DRIVE_API_KEY),
        ]);

        for (let i = 0; i < links.length; i++) {
          const rawLink = links[i]?.[0]?.trim();
          if (!rawLink) continue;

          const videoId = extractYouTubeId(rawLink);
          if (!videoId) continue;

          const sheetTitle = titles[i]?.[0]?.trim();
          videos.push({
            id: videoId,
            title: sheetTitle || `${folder.folderName} • Vídeo ${videos.length + 1}`,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            sourceFolder: folder.folderName,
          });
        }
      } catch (error) {
        console.error(`Failed to process folder ${folder.folderName}:`, error);
      }
    }

    return new Response(JSON.stringify({ videos }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-videos error:", error);
    return new Response(
      JSON.stringify({ videos: [], error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

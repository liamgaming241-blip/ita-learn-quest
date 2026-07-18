import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getDriveAccessToken } from "../_shared/google.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const fileId = url.searchParams.get("id");
  const token =
    url.searchParams.get("token") ||
    req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!fileId) return new Response("Missing id", { status: 400, headers: corsHeaders });
  if (!token) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: claimsData } = await supabase.auth.getClaims(token);
  const uid = claimsData?.claims?.sub;
  if (!uid) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
  if (!isAdmin) {
    const { data: hasAccess } = await supabase.rpc("has_active_subscription", { _user_id: uid });
    if (!hasAccess) return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // Verify file exists in registry
  const { data: file } = await supabase
    .from("drive_files").select("mime_type,name").eq("drive_file_id", fileId).maybeSingle();
  if (!file) return new Response("Not found", { status: 404, headers: corsHeaders });

  const accessToken = await getDriveAccessToken();
  const range = req.headers.get("Range");
  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}`, ...(range ? { Range: range } : {}) } },
  );

  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", file.mime_type || "application/octet-stream");
  headers.set("Accept-Ranges", "bytes");
  const cl = driveRes.headers.get("Content-Length"); if (cl) headers.set("Content-Length", cl);
  const cr = driveRes.headers.get("Content-Range"); if (cr) headers.set("Content-Range", cr);
  headers.set("Cache-Control", "private, max-age=3600");

  return new Response(driveRes.body, { status: driveRes.status, headers });
});
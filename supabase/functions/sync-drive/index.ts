import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { driveFetch } from "../_shared/google.ts";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  md5Checksum?: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
}

const FOLDER = "application/vnd.google-apps.folder";

async function listFolder(folderId: string): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const fields = encodeURIComponent(
      "nextPageToken, files(id,name,mimeType,md5Checksum,size,modifiedTime,parents)",
    );
    const url = `/files?q=${q}&fields=${fields}&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ""}&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    const res = await driveFetch(url);
    if (!res.ok) throw new Error(`drive list failed: ${res.status} ${await res.text()}`);
    const j = await res.json();
    out.push(...(j.files ?? []));
    pageToken = j.nextPageToken;
  } while (pageToken);
  return out;
}

async function walk(rootId: string) {
  const all: (DriveFile & { path: string })[] = [];
  const stack: { id: string; path: string }[] = [{ id: rootId, path: "" }];
  const seen = new Set<string>();
  while (stack.length) {
    const { id, path } = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const children = await listFolder(id);
    for (const c of children) {
      const p = `${path}/${c.name}`;
      all.push({ ...c, path: p });
      if (c.mimeType === FOLDER) stack.push({ id: c.id, path: p });
    }
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth: require admin
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await supabase.auth.getClaims(token);
    const uid = claimsData?.claims?.sub;
    if (!uid) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const body = await req.json().catch(() => ({}));
  const trigger = body?.trigger === "scheduled" ? "scheduled" : "manual";

  const { data: settings } = await supabase.from("app_settings").select("*").maybeSingle();
  const rootId = settings?.content_root_folder_id;
  if (!rootId) {
    return new Response(JSON.stringify({ error: "content_root_folder_id not set" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: runRow, error: runErr } = await supabase
    .from("sync_runs")
    .insert({ trigger, status: "running", started_at: new Date().toISOString() })
    .select()
    .single();
  if (runErr) return new Response(JSON.stringify({ error: runErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const log = (level: string, message: string, ctx: any = {}, drive_file_id: string | null = null) =>
    supabase.from("sync_logs").insert({ sync_run_id: runRow.id, level, message, context: ctx, drive_file_id });

  let added = 0, modified = 0, removed = 0, errors = 0;
  try {
    const files = await walk(rootId);
    const seenIds = new Set(files.map((f) => f.id));

    const { data: existing } = await supabase.from("drive_files").select("*");
    const existingById = new Map((existing ?? []).map((r: any) => [r.drive_file_id, r]));

    for (const f of files) {
      const prev = existingById.get(f.id);
      const row = {
        drive_file_id: f.id,
        name: f.name,
        mime_type: f.mimeType,
        parent_id: f.parents?.[0] ?? null,
        path: f.path,
        md5_checksum: f.md5Checksum ?? null,
        size: f.size ? Number(f.size) : null,
        modified_time: f.modifiedTime ?? null,
        status: "active",
        last_seen_at: new Date().toISOString(),
      };
      if (!prev) {
        const { data: inserted } = await supabase.from("drive_files").insert({ ...row, version: 1 }).select().single();
        added++;
        if (f.mimeType !== FOLDER && inserted) {
          await supabase.from("processing_queue").insert({ drive_file_id: f.id, job_type: "transcribe", status: "pending" });
        }
      } else {
        const changed = prev.md5_checksum !== row.md5_checksum || prev.modified_time !== row.modified_time;
        if (changed) {
          await supabase.from("file_versions").insert({
            drive_file_id: f.id,
            md5_checksum: prev.md5_checksum,
            size: prev.size,
            modified_time: prev.modified_time,
          });
          await supabase.from("drive_files").update({ ...row, version: (prev.version ?? 1) + 1 }).eq("drive_file_id", f.id);
          modified++;
          if (f.mimeType !== FOLDER) {
            await supabase.from("processing_queue").insert({ drive_file_id: f.id, job_type: "transcribe", status: "pending" });
          }
        } else {
          await supabase.from("drive_files").update({ last_seen_at: row.last_seen_at, status: "active" }).eq("drive_file_id", f.id);
        }
      }
    }

    // Removed files: existed but not seen this pass
    for (const [id, prev] of existingById) {
      if (!seenIds.has(id) && prev.status !== "removed") {
        await supabase.from("drive_files").update({ status: "removed" }).eq("drive_file_id", id);
        removed++;
      }
    }

    await supabase.from("sync_runs").update({
      status: "succeeded",
      finished_at: new Date().toISOString(),
      files_added: added,
      files_modified: modified,
      files_removed: removed,
      errors_count: errors,
    }).eq("id", runRow.id);

    await log("info", "sync complete", { added, modified, removed });

    // ---- Materialize subjects / topics / lessons from Drive tree ----
    try {
      const VIDEO_MIMES = new Set([
        "video/mp4","video/webm","video/ogg","video/quicktime","video/x-m4v",
        "video/x-matroska","video/matroska",
      ]);
      const PDF_MIMES = new Set(["application/pdf"]);
      const isLessonFile = (m: string) => VIDEO_MIMES.has(m) || PDF_MIMES.has(m);
      const fileType = (m: string) => (PDF_MIMES.has(m) ? "pdf" : "video");

      // top-level folders = subjects
      const topFolders = files.filter(
        (f) => f.mimeType === FOLDER && f.parents?.[0] === rootId,
      );

      let sortS = 0;
      for (const subj of topFolders) {
        const { data: subjectRow, error: sErr } = await supabase
          .from("subjects")
          .upsert(
            { drive_folder_id: subj.id, name: subj.name, folder_path: subj.path, sort_order: sortS++ },
            { onConflict: "drive_folder_id" },
          )
          .select("id")
          .single();
        if (sErr || !subjectRow) { await log("error", `subject upsert failed: ${subj.name}`, { err: sErr?.message }); continue; }

        // Immediate children of this subject
        const kids = files.filter((f) => f.parents?.[0] === subj.id);
        const subFolders = kids.filter((f) => f.mimeType === FOLDER);
        const looseFiles = kids.filter((f) => isLessonFile(f.mimeType));

        // Topics = subfolders; add a synthetic "Geral" topic for files loose under a subject
        const topics: { name: string; path: string; folderIdKey: string; parentDriveId: string; synthetic: boolean }[] =
          subFolders.map((f) => ({ name: f.name, path: f.path, folderIdKey: f.id, parentDriveId: f.id, synthetic: false }));
        if (looseFiles.length > 0) {
          topics.push({ name: "Geral", path: subj.path, folderIdKey: `subject:${subj.id}`, parentDriveId: subj.id, synthetic: true });
        }

        let sortT = 0;
        for (const t of topics) {
          const { data: topicRow, error: tErr } = await supabase
            .from("topics")
            .upsert(
              { subject_id: subjectRow.id, drive_folder_id: t.folderIdKey, name: t.name, folder_path: t.path, sort_order: sortT++ },
              { onConflict: "drive_folder_id" },
            )
            .select("id")
            .single();
          if (tErr || !topicRow) { await log("error", `topic upsert failed: ${t.name}`, { err: tErr?.message }); continue; }

          // Subtopics = folders inside the topic folder (only for real topics)
          const topicKids = t.synthetic ? [] : files.filter((f) => f.parents?.[0] === t.parentDriveId);
          const subSubFolders = topicKids.filter((f) => f.mimeType === FOLDER);
          const topicLooseFiles = t.synthetic
            ? looseFiles
            : topicKids.filter((f) => isLessonFile(f.mimeType));

          const subtopics: { name: string; path: string; folderIdKey: string; parentDriveId: string; synthetic: boolean }[] =
            subSubFolders.map((f) => ({ name: f.name, path: f.path, folderIdKey: f.id, parentDriveId: f.id, synthetic: false }));
          if (topicLooseFiles.length > 0 || subSubFolders.length === 0) {
            subtopics.push({
              name: "Geral",
              path: t.path,
              folderIdKey: `topic:${topicRow.id}`,
              parentDriveId: t.parentDriveId,
              synthetic: true,
            });
          }

          let sortSub = 0;
          for (const st of subtopics) {
            const { data: subtopicRow, error: stErr } = await supabase
              .from("subtopics")
              .upsert(
                { topic_id: topicRow.id, drive_folder_id: st.folderIdKey, name: st.name, folder_path: st.path, sort_order: sortSub++ },
                { onConflict: "drive_folder_id" },
              )
              .select("id")
              .single();
            if (stErr || !subtopicRow) { await log("error", `subtopic upsert failed: ${st.name}`, { err: stErr?.message }); continue; }

            // Lesson files: for synthetic subtopics use the topic's loose files; otherwise recurse under the subtopic folder
            const lessonFiles = st.synthetic
              ? topicLooseFiles
              : files.filter((f) => isLessonFile(f.mimeType) && f.path.startsWith(st.path + "/"));

            for (const lf of lessonFiles) {
              const { data: dfRow } = await supabase
                .from("drive_files").select("id").eq("drive_file_id", lf.id).maybeSingle();
              const { error: lErr } = await supabase
                .from("lessons")
                .upsert(
                  {
                    topic_id: topicRow.id,
                    subtopic_id: subtopicRow.id,
                    title: lf.name.replace(/\.[^.]+$/, ""),
                    file_type: fileType(lf.mimeType),
                    drive_file_id: lf.id,
                    drive_file_uuid: dfRow?.id ?? null,
                    file_path: lf.path,
                    file_size: lf.size ? Number(lf.size) : null,
                    processing_status: "ready",
                  },
                  { onConflict: "drive_file_id" },
                );
              if (lErr) await log("error", `lesson upsert failed: ${lf.name}`, { err: lErr.message }, lf.id);
            }
          }
        }
      }

      // Remove lessons whose drive file is gone
      const activeIds = files.filter((f) => f.mimeType !== FOLDER).map((f) => f.id);
      if (activeIds.length) {
        await supabase.from("lessons").delete().not("drive_file_id", "in", `(${activeIds.map((i) => `"${i}"`).join(",")})`);
      }

      await log("info", "materialization complete");
    } catch (e) {
      await log("error", `materialization failed: ${String(e)}`);
    }

    // Kick queue
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-queue`, {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      });
    } catch (_) { /* best-effort */ }

    return new Response(JSON.stringify({ ok: true, added, modified, removed, run_id: runRow.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    errors++;
    await log("error", String(e));
    await supabase.from("sync_runs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      files_added: added,
      files_modified: modified,
      files_removed: removed,
      errors_count: errors,
    }).eq("id", runRow.id);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
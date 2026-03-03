import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId, folderId } = await req.json();

    // Update job status
    await supabase.from("indexing_jobs").update({
      status: "validating",
      started_at: new Date().toISOString(),
    }).eq("id", jobId);

    // Since we can't directly access Google Drive API without OAuth tokens,
    // we'll create a demo indexing flow that simulates the structure.
    // In production, you'd need a GOOGLE_DRIVE_API_KEY or OAuth token.

    const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");

    let files: any[] = [];

    if (GOOGLE_DRIVE_API_KEY) {
      // Real Google Drive API integration
      files = await indexDriveFolder(folderId, GOOGLE_DRIVE_API_KEY, supabase, user.id, jobId);
    } else {
      // Without API key, update job with instructions
      await supabase.from("indexing_jobs").update({
        status: "failed",
        errors: [{ message: "GOOGLE_DRIVE_API_KEY not configured. Add it in Cloud secrets to enable Drive indexing." }],
      }).eq("id", jobId);

      return new Response(JSON.stringify({
        error: "Google Drive API key not configured. Please add GOOGLE_DRIVE_API_KEY in your project secrets.",
        instructions: "Go to https://console.cloud.google.com, create a project, enable Drive API, create an API key, then add it as a secret."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, filesIndexed: files.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("index-drive error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function indexDriveFolder(
  folderId: string,
  apiKey: string,
  supabase: any,
  userId: string,
  jobId: string
) {
  const allFiles: any[] = [];

  await supabase.from("indexing_jobs").update({ status: "indexing" }).eq("id", jobId);

  // List root folder children (subject folders)
  const rootChildren = await listDriveFolder(folderId, apiKey);

  // Expected subject pattern: NN_SUBJECT_NAME
  const subjectPattern = /^(\d+)_(.+)$/;
  const subjectFolders = rootChildren.filter(
    (f: any) => f.mimeType === "application/vnd.google-apps.folder" && subjectPattern.test(f.name)
  );

  if (subjectFolders.length === 0) {
    await supabase.from("indexing_jobs").update({
      status: "failed",
      errors: [{ message: "No valid subject folders found. Expected format: 01_MATEMATICA, 02_FISICA, etc." }],
    }).eq("id", jobId);
    return [];
  }

  let totalFiles = 0;
  let processedFiles = 0;

  // First pass: count all files
  for (const sf of subjectFolders) {
    const topicFolders = await listDriveFolder(sf.id, apiKey);
    for (const tf of topicFolders) {
      if (tf.mimeType === "application/vnd.google-apps.folder") {
        const files = await listDriveFolder(tf.id, apiKey);
        totalFiles += files.filter((f: any) => f.mimeType !== "application/vnd.google-apps.folder").length;
      }
    }
    // Also count direct files in subject folder
    totalFiles += topicFolders.filter((f: any) => f.mimeType !== "application/vnd.google-apps.folder").length;
  }

  await supabase.from("indexing_jobs").update({ total_files: totalFiles }).eq("id", jobId);

  // Second pass: create subjects, topics, lessons
  for (const sf of subjectFolders) {
    const match = sf.name.match(subjectPattern);
    if (!match) continue;

    const sortOrder = parseInt(match[1]);
    const subjectName = match[2].replace(/_/g, " ");

    // Create subject
    const { data: subject } = await supabase.from("subjects").insert({
      user_id: userId,
      name: subjectName,
      drive_folder_id: sf.id,
      folder_path: sf.name,
      sort_order: sortOrder,
    }).select().single();

    if (!subject) continue;

    const topicChildren = await listDriveFolder(sf.id, apiKey);
    const topicFolders = topicChildren.filter((f: any) => f.mimeType === "application/vnd.google-apps.folder");

    for (const tf of topicFolders) {
      const topicMatch = tf.name.match(/^(\d+)_(.+)$/);
      const topicName = topicMatch ? topicMatch[2].replace(/_/g, " ") : tf.name;
      const topicSort = topicMatch ? parseInt(topicMatch[1]) : 0;

      // Create topic
      const { data: topic } = await supabase.from("topics").insert({
        user_id: userId,
        subject_id: subject.id,
        name: topicName,
        drive_folder_id: tf.id,
        folder_path: `${sf.name}/${tf.name}`,
        sort_order: topicSort,
      }).select().single();

      if (!topic) continue;

      // List files in topic folder
      const topicFiles = await listDriveFolder(tf.id, apiKey);
      const supportedTypes = ["mp4", "mov", "mkv", "pdf", "docx"];

      for (const file of topicFiles) {
        if (file.mimeType === "application/vnd.google-apps.folder") continue;

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const fileType = supportedTypes.includes(ext) ? ext : inferFileType(file.mimeType);

        if (!fileType) continue;

        const { data: lesson } = await supabase.from("lessons").insert({
          user_id: userId,
          topic_id: topic.id,
          title: file.name,
          file_type: fileType,
          drive_file_id: file.id,
          file_path: `${sf.name}/${tf.name}/${file.name}`,
          file_size: parseInt(file.size ?? "0"),
          processing_status: "pending",
        }).select().single();

        if (lesson) allFiles.push(lesson);
        processedFiles++;

        await supabase.from("indexing_jobs").update({
          processed_files: processedFiles,
        }).eq("id", jobId);
      }
    }
  }

  // Trigger AI processing for video/text files
  await supabase.from("indexing_jobs").update({
    status: "processing",
  }).eq("id", jobId);

  // Process lessons with AI
  for (const lesson of allFiles) {
    try {
      await processLessonWithAI(supabase, lesson, userId);
    } catch (e) {
      console.error(`Failed to process lesson ${lesson.id}:`, e);
      await supabase.from("lessons").update({
        processing_status: "failed",
        processing_error: e instanceof Error ? e.message : "Unknown error",
      }).eq("id", lesson.id);
    }
  }

  await supabase.from("indexing_jobs").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    processed_files: totalFiles,
  }).eq("id", jobId);

  return allFiles;
}

async function listDriveFolder(folderId: string, apiKey: string) {
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&key=${apiKey}&fields=files(id,name,mimeType,size)&pageSize=1000`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.files ?? [];
}

function inferFileType(mimeType: string): string | null {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-matroska": "mkv",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  return map[mimeType] ?? null;
}

async function processLessonWithAI(supabase: any, lesson: any, userId: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return;

  await supabase.from("lessons").update({ processing_status: "processing" }).eq("id", lesson.id);

  // For PDFs and docs, we generate summary and questions based on filename/context
  // For videos, in production you'd extract audio and transcribe first
  const prompt = `Você é um professor especialista em preparação para o ITA (Instituto Tecnológico de Aeronáutica).

Com base no seguinte material de estudo:
- Título: ${lesson.title}
- Tipo: ${lesson.file_type}
- Caminho: ${lesson.file_path}

Gere:
1. Um resumo estruturado do tópico (baseado no título e contexto)
2. 5 pontos-chave em bullet points
3. 10 questões no estilo ITA (múltipla escolha A-E) com gabarito e explicação

Responda em JSON com este formato:
{
  "summary": "texto do resumo",
  "bullet_points": ["ponto 1", "ponto 2", ...],
  "questions": [
    {
      "question_text": "texto da questão",
      "options": [{"label": "A", "text": "..."}, {"label": "B", "text": "..."}, {"label": "C", "text": "..."}, {"label": "D", "text": "..."}, {"label": "E", "text": "..."}],
      "correct_option": "A",
      "explanation": "explicação",
      "difficulty": "medium"
    }
  ]
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Payment required");
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content ?? "";

  // Parse JSON from response
  let parsed: any;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in AI response");
    }
  } catch {
    throw new Error("Failed to parse AI response");
  }

  // Get subject_id and topic_id from lesson
  const { data: topicData } = await supabase
    .from("topics")
    .select("id, subject_id")
    .eq("id", lesson.topic_id)
    .single();

  // Save summary
  if (parsed.summary) {
    await supabase.from("summaries").insert({
      lesson_id: lesson.id,
      user_id: userId,
      content: parsed.summary,
      bullet_points: parsed.bullet_points ?? [],
    });
  }

  // Save questions
  if (parsed.questions && Array.isArray(parsed.questions)) {
    for (const q of parsed.questions) {
      await supabase.from("questions").insert({
        lesson_id: lesson.id,
        topic_id: lesson.topic_id,
        subject_id: topicData?.subject_id,
        user_id: userId,
        question_text: q.question_text,
        options: q.options,
        correct_option: q.correct_option,
        explanation: q.explanation,
        difficulty: q.difficulty ?? "medium",
      });
    }
  }

  await supabase.from("lessons").update({ processing_status: "completed" }).eq("id", lesson.id);
}

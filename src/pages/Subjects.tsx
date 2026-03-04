import { useState } from "react";
import { useSubjects, useTopics, useLessons } from "@/hooks/useSubjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, FileText, Video, File, X } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { supabase } from "@/integrations/supabase/client";

const fileTypeIcon = (type: string) => {
  if (["mp4", "mov", "mkv", "youtube"].includes(type)) return <Video className="h-4 w-4" />;
  if (type === "pdf") return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

const statusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "processing": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "failed": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
};

const isVideo = (type: string) => ["mp4", "mov", "mkv"].includes(type);

interface Lesson {
  id: string;
  title: string;
  file_type: string;
  file_url: string | null;
  drive_file_id: string | null;
  processing_status: string;
}

const Subjects = () => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const { data: subjects, isLoading: loadingSubjects } = useSubjects();
  const { data: topics } = useTopics(selectedSubject ?? undefined);
  const { data: lessons } = useLessons(selectedTopic ?? undefined);

  // Build video src from Drive or direct URL
  const getVideoSrc = (lesson: Lesson) => {
    if (lesson.file_url) return lesson.file_url;
    if (lesson.drive_file_id) {
      return `https://www.googleapis.com/drive/v3/files/${lesson.drive_file_id}?alt=media&key=${import.meta.env.VITE_GOOGLE_DRIVE_API_KEY ?? ""}`;
    }
    return "";
  };

  const getPdfSrc = (lesson: Lesson) => {
    if (lesson.file_url) return lesson.file_url;
    if (lesson.drive_file_id) {
      return `https://drive.google.com/file/d/${lesson.drive_file_id}/preview`;
    }
    return "";
  };

  // Lesson viewer
  if (activeLesson) {
    const src = isVideo(activeLesson.file_type) ? getVideoSrc(activeLesson) : getPdfSrc(activeLesson);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setActiveLesson(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-xl font-bold truncate flex-1">{activeLesson.title}</h1>
        </div>
        {isVideo(activeLesson.file_type) ? (
          <VideoPlayer src={src} title={activeLesson.title} className="aspect-video w-full max-h-[70vh]" />
        ) : activeLesson.file_type === "pdf" ? (
          <iframe src={src} className="w-full rounded-lg border border-border" style={{ height: "75vh" }} title={activeLesson.title} />
        ) : (
          <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">Visualização não disponível para este tipo de arquivo.</CardContent></Card>
        )}
      </div>
    );
  }

  // Lessons list
  if (selectedTopic && selectedSubject) {
    const topic = topics?.find((t) => t.id === selectedTopic);
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedTopic(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos Tópicos
        </Button>
        <h1 className="text-2xl font-bold">{topic?.name ?? "Aulas"}</h1>
        {!lessons?.length && <p className="text-muted-foreground">Nenhuma aula encontrada.</p>}
        <div className="space-y-2">
          {lessons?.map((l) => (
            <Card
              key={l.id}
              className="glass hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setActiveLesson(l as any)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  {fileTypeIcon(l.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.file_type.toUpperCase()}</p>
                </div>
                <Badge className={statusColor(l.processing_status)}>{l.processing_status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Topics list
  if (selectedSubject) {
    const subject = subjects?.find((s) => s.id === selectedSubject);
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedSubject(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar às Matérias
        </Button>
        <h1 className="text-2xl font-bold">{subject?.name ?? "Tópicos"}</h1>
        {!topics?.length && <p className="text-muted-foreground">Nenhum tópico encontrado.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics?.map((t) => (
            <Card key={t.id} className="glass hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTopic(t.id)}>
              <CardContent className="p-4">
                <h3 className="font-semibold">{t.name}</h3>
                <p className="text-sm text-muted-foreground">{(t as any).lessons?.[0]?.count ?? 0} aulas</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Subjects list
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Matérias</h1>
      {loadingSubjects && <p className="text-muted-foreground">Carregando...</p>}
      {!loadingSubjects && !subjects?.length && (
        <Card className="glass border-dashed">
          <CardContent className="p-12 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Indexe seu Google Drive para ver suas matérias.</p>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects?.map((s) => (
          <Card key={s.id} className="glass hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedSubject(s.id)}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary text-primary-foreground text-sm font-bold">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-sm text-muted-foreground">{(s as any).topics?.[0]?.count ?? 0} tópicos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Subjects;

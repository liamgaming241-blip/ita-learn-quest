import { motion } from "framer-motion";
import { useState } from "react";
import { useSubjects, useTopics, useLessons } from "@/hooks/useSubjects";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ChevronLeft, FileText, PlayCircle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/VideoPlayer";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const useLessonUrl = () => {
  return async (driveFileId: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    return `${SUPABASE_URL}/functions/v1/stream-file?id=${encodeURIComponent(driveFileId)}&token=${encodeURIComponent(token)}`;
  };
};

const Subjects = () => {
  const { data: subjects, isLoading } = useSubjects();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [lesson, setLesson] = useState<any | null>(null);
  const [lessonUrl, setLessonUrl] = useState<string | null>(null);
  const getUrl = useLessonUrl();

  const { data: topics, isLoading: topicsLoading } = useTopics(subjectId ?? undefined);
  const { data: lessons, isLoading: lessonsLoading } = useLessons(topicId ?? undefined);

  const openLesson = async (l: any) => {
    setLesson(l);
    if (l.drive_file_id) setLessonUrl(await getUrl(l.drive_file_id));
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!subjects?.length) {
    return (
      <Card className="surface-elevated border-dashed border-2 border-border/60">
        <CardContent className="p-12 text-center space-y-3">
          <BookOpen className="mx-auto h-10 w-10 text-accent" />
          <p className="text-muted-foreground">
            O conteúdo ainda está sendo sincronizado pelo administrador. Volte em breve.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Lesson viewer
  if (lesson) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setLesson(null); setLessonUrl(null); }}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h2 className="font-display font-extrabold text-xl">{lesson.title}</h2>
        {lesson.file_type === "video" && lessonUrl && (
          <VideoPlayer src={lessonUrl} title={lesson.title} className="aspect-video w-full" />
        )}
        {lesson.file_type === "pdf" && lessonUrl && (
          <iframe src={lessonUrl} className="w-full h-[80vh] rounded-lg border border-border" />
        )}
      </div>
    );
  }

  // Lessons list
  if (topicId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setTopicId(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Tópicos
        </Button>
        {lessonsLoading ? (
          <Skeleton className="h-40" />
        ) : !lessons?.length ? (
          <Card className="surface-elevated"><CardContent className="p-8 text-center text-muted-foreground">Nenhuma aula neste tópico ainda.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((l: any) => (
              <Card key={l.id} className="surface hover:border-accent/40 hover:shadow-elegant transition-all cursor-pointer" onClick={() => openLesson(l)}>
                <CardContent className="p-4 flex items-start gap-3">
                  {l.file_type === "pdf" ? <FileText className="h-6 w-6 text-accent shrink-0" /> : <PlayCircle className="h-6 w-6 text-accent shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{l.title}</p>
                    <p className="text-xs text-muted-foreground uppercase">{l.file_type}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Topics list
  if (subjectId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSubjectId(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Matérias
        </Button>
        {topicsLoading ? (
          <Skeleton className="h-40" />
        ) : !topics?.length ? (
          <Card className="surface-elevated"><CardContent className="p-8 text-center text-muted-foreground">Nenhum tópico ainda.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t: any) => (
              <Card key={t.id} className="surface hover:border-accent/40 hover:shadow-elegant transition-all cursor-pointer" onClick={() => setTopicId(t.id)}>
                <CardContent className="p-4 flex items-start gap-3">
                  <FolderOpen className="h-6 w-6 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{Array.isArray(t.lessons) ? t.lessons[0]?.count ?? 0 : 0} aulas</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s: any) => (
        <Card key={s.id} className="surface hover:border-accent/40 hover:shadow-elegant transition-all cursor-pointer" onClick={() => setSubjectId(s.id)}>
          <CardContent className="p-5 space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Matéria</p>
            <h3 className="font-display font-extrabold text-lg">{s.name}</h3>
            <p className="text-xs text-muted-foreground">
              {Array.isArray(s.topics) ? s.topics[0]?.count ?? 0 : 0} tópicos
            </p>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
};

export default Subjects;
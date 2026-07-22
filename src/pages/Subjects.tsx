import { motion } from "framer-motion";
import { useState } from "react";
import { useSubjects, useTopics, useLessons, useSubtopics } from "@/hooks/useSubjects";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ChevronLeft, ChevronRight, FileText, PlayCircle, FolderOpen, Layers } from "lucide-react";
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
  const [subject, setSubject] = useState<any | null>(null);
  const [topic, setTopic] = useState<any | null>(null);
  const [subtopic, setSubtopic] = useState<any | null>(null);
  const [lesson, setLesson] = useState<any | null>(null);
  const [lessonUrl, setLessonUrl] = useState<string | null>(null);
  const getUrl = useLessonUrl();

  const { data: topics, isLoading: topicsLoading } = useTopics(subject?.id);
  const { data: subtopics, isLoading: subtopicsLoading } = useSubtopics(topic?.id);
  const { data: lessons, isLoading: lessonsLoading } = useLessons(subtopic?.id);

  const openLesson = async (l: any) => {
    setLesson(l);
    if (l.drive_file_id) setLessonUrl(await getUrl(l.drive_file_id));
  };

  const Breadcrumb = () => {
    const parts: { label: string; onClick?: () => void }[] = [];
    if (subject) parts.push({ label: subject.name, onClick: () => { setTopic(null); setSubtopic(null); setLesson(null); } });
    if (topic) parts.push({ label: topic.name, onClick: () => { setSubtopic(null); setLesson(null); } });
    if (subtopic) parts.push({ label: subtopic.name, onClick: () => { setLesson(null); } });
    if (lesson) parts.push({ label: lesson.title });
    if (!parts.length) return null;
    return (
      <nav className="flex items-center flex-wrap gap-1 text-xs text-muted-foreground mb-2">
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {p.onClick && i < parts.length - 1 ? (
              <button onClick={p.onClick} className="hover:text-accent transition-colors">{p.label}</button>
            ) : (
              <span className="text-foreground font-medium">{p.label}</span>
            )}
          </span>
        ))}
      </nav>
    );
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
        <Breadcrumb />
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

  // Lessons list (subtopic selected)
  if (subtopic) {
    return (
      <div className="space-y-4">
        <Breadcrumb />
        <Button variant="ghost" size="sm" onClick={() => setSubtopic(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Subtópicos
        </Button>
        {lessonsLoading ? (
          <Skeleton className="h-40" />
        ) : !lessons?.length ? (
          <Card className="surface-elevated"><CardContent className="p-8 text-center text-muted-foreground">Nenhuma aula neste subtópico ainda.</CardContent></Card>
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

  // Subtopics list (topic selected)
  if (topic) {
    return (
      <div className="space-y-4">
        <Breadcrumb />
        <Button variant="ghost" size="sm" onClick={() => setTopic(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Tópicos
        </Button>
        {subtopicsLoading ? (
          <Skeleton className="h-40" />
        ) : !subtopics?.length ? (
          <Card className="surface-elevated"><CardContent className="p-8 text-center text-muted-foreground">Nenhum subtópico ainda.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subtopics.map((st: any) => (
              <Card key={st.id} className="surface hover:border-accent/40 hover:shadow-elegant transition-all cursor-pointer" onClick={() => setSubtopic(st)}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Layers className="h-6 w-6 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{st.name}</p>
                    <p className="text-xs text-muted-foreground">{Array.isArray(st.lessons) ? st.lessons[0]?.count ?? 0 : 0} aulas</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Topics list (subject selected)
  if (subject) {
    return (
      <div className="space-y-4">
        <Breadcrumb />
        <Button variant="ghost" size="sm" onClick={() => setSubject(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Matérias
        </Button>
        {topicsLoading ? (
          <Skeleton className="h-40" />
        ) : !topics?.length ? (
          <Card className="surface-elevated"><CardContent className="p-8 text-center text-muted-foreground">Nenhum tópico ainda.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t: any) => (
              <Card key={t.id} className="surface hover:border-accent/40 hover:shadow-elegant transition-all cursor-pointer" onClick={() => setTopic(t)}>
                <CardContent className="p-4 flex items-start gap-3">
                  <FolderOpen className="h-6 w-6 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{Array.isArray(t.subtopics) ? t.subtopics[0]?.count ?? 0 : 0} subtópicos</p>
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
        <Card key={s.id} className="surface hover:border-accent/40 hover:shadow-elegant transition-all cursor-pointer" onClick={() => setSubject(s)}>
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
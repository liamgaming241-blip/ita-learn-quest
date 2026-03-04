import { useState } from "react";
import { useIndexingJobs, useSubjects } from "@/hooks/useSubjects";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { FolderSync, Loader2, CheckCircle, AlertCircle, HardDrive, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function extractFolderId(input: string): string | null {
  if (/^[a-zA-Z0-9_-]{10,}$/.test(input.trim())) return input.trim();
  const match = input.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

const DriveSetup = () => {
  const { user } = useAuth();
  const { data: jobs, isLoading } = useIndexingJobs();
  const { data: subjects } = useSubjects();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [driveUrl, setDriveUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const startIndexing = async () => {
    const folderId = extractFolderId(driveUrl);
    if (!folderId) {
      toast({ title: "Link inválido", description: "Insira um link válido de pasta do Google Drive.", variant: "destructive" });
      return;
    }
    setConnecting(true);
    try {
      const { data: job, error } = await supabase.from("indexing_jobs").insert({
        user_id: user!.id, drive_folder_id: folderId, drive_folder_url: driveUrl, status: "pending",
      }).select().single();
      if (error) throw error;
      const { error: fnError } = await supabase.functions.invoke("index-drive", { body: { jobId: job.id, folderId } });
      if (fnError) {
        toast({ title: "Erro ao iniciar indexação", description: fnError.message, variant: "destructive" });
      } else {
        toast({ title: "Indexação iniciada!", description: "Acompanhe o progresso abaixo." });
      }
      queryClient.invalidateQueries({ queryKey: ["indexing_jobs"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const unlinkSubject = async (subjectId: string, subjectName: string) => {
    setDeleting(subjectId);
    try {
      // Get all topic IDs for this subject
      const { data: topicsData } = await supabase.from("topics").select("id").eq("subject_id", subjectId);
      const topicIds = topicsData?.map((t) => t.id) ?? [];

      if (topicIds.length > 0) {
        // Get all lesson IDs for these topics
        const { data: lessonsData } = await supabase.from("lessons").select("id").in("topic_id", topicIds);
        const lessonIds = lessonsData?.map((l) => l.id) ?? [];

        if (lessonIds.length > 0) {
          // Delete summaries, transcriptions, questions linked to lessons
          await supabase.from("summaries").delete().in("lesson_id", lessonIds);
          await supabase.from("transcriptions").delete().in("lesson_id", lessonIds);
          await supabase.from("questions").delete().in("lesson_id", lessonIds);
          await supabase.from("user_progress").delete().in("lesson_id", lessonIds);
          // Delete lessons
          await supabase.from("lessons").delete().in("topic_id", topicIds);
        }

        // Delete weak_topics and user_progress linked to topics
        await supabase.from("weak_topics").delete().in("topic_id", topicIds);
        await supabase.from("user_progress").delete().in("topic_id", topicIds);
        // Delete questions linked to subject/topics directly
        await supabase.from("questions").delete().eq("subject_id", subjectId);
        // Delete topics
        await supabase.from("topics").delete().eq("subject_id", subjectId);
      }

      // Delete subject-level progress and weak topics
      await supabase.from("weak_topics").delete().eq("subject_id", subjectId);
      await supabase.from("user_progress").delete().eq("subject_id", subjectId);
      // Delete subject
      await supabase.from("subjects").delete().eq("id", subjectId);

      toast({ title: "Matéria removida", description: `"${subjectName}" e todo conteúdo associado foram removidos.` });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["weak_topics"] });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const statusConfig: Record<string, { icon: any; color: string }> = {
    pending: { icon: Loader2, color: "text-muted-foreground" },
    validating: { icon: Loader2, color: "text-yellow-500" },
    indexing: { icon: Loader2, color: "text-blue-500" },
    processing: { icon: Loader2, color: "text-purple-500" },
    completed: { icon: CheckCircle, color: "text-green-500" },
    failed: { icon: AlertCircle, color: "text-red-500" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Google Drive</h1>
        <p className="text-muted-foreground">Conecte e gerencie suas pastas de estudos do Google Drive.</p>
      </div>

      {/* Connect new folder */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> Conectar Pasta do Drive</CardTitle>
          <CardDescription>Cole o link da sua pasta raiz ITA-ESTUDOS do Google Drive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="https://drive.google.com/drive/folders/... ou ID da pasta" value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} />
          <Button onClick={startIndexing} disabled={connecting || !driveUrl.trim()} className="gradient-primary">
            <FolderSync className="mr-2 h-4 w-4" /> {connecting ? "Conectando..." : "Conectar e Indexar"}
          </Button>
        </CardContent>
      </Card>

      {/* Indexed subjects management */}
      {subjects && subjects.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Matérias Indexadas</CardTitle>
            <CardDescription>Remova pastas que não são mais necessárias. Todo conteúdo associado será excluído.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary text-primary-foreground text-sm font-bold">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.folder_path ?? s.drive_folder_id ?? "—"}</p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" disabled={deleting === s.id}>
                      {deleting === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover "{s.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Essa ação irá excluir permanentemente a matéria, todos os tópicos, aulas, questões, resumos e progresso associados. Essa ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => unlinkSubject(s.id, s.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir tudo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Indexing jobs history */}
      {isLoading && <p className="text-muted-foreground">Carregando jobs...</p>}
      {jobs && jobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Histórico de Indexação</h2>
          {jobs.map((job) => {
            const cfg = statusConfig[job.status] ?? statusConfig.pending;
            const Icon = cfg.icon;
            const pct = job.total_files && job.total_files > 0 ? Math.round((job.processed_files ?? 0) / job.total_files * 100) : 0;
            return (
              <Card key={job.id} className="glass">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${cfg.color} ${job.status !== "completed" && job.status !== "failed" ? "animate-spin" : ""}`} />
                      <span className="font-medium text-sm">{job.drive_folder_id.slice(0, 20)}...</span>
                    </div>
                    <Badge variant="outline">{job.status}</Badge>
                  </div>
                  {job.total_files && job.total_files > 0 && (
                    <>
                      <Progress value={pct} className="h-2" />
                      <p className="text-xs text-muted-foreground">{job.processed_files ?? 0} / {job.total_files} arquivos processados</p>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DriveSetup;

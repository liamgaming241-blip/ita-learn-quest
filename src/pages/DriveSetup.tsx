import { useState } from "react";
import { useIndexingJobs } from "@/hooks/useSubjects";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  FolderSync, Loader2, CheckCircle, AlertCircle, HardDrive, Trash2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function extractFolderId(input: string): string | null {
  if (/^[a-zA-Z0-9_-]{10,}$/.test(input.trim())) return input.trim();
  const match = input.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

const DriveSetup = () => {
  const { user } = useAuth();
  const { data: jobs, isLoading } = useIndexingJobs();
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
        user_id: user!.id,
        drive_folder_id: folderId,
        drive_folder_url: driveUrl,
        status: "pending",
      }).select().single();
      if (error) throw error;

      const { error: fnError } = await supabase.functions.invoke("index-drive", {
        body: { jobId: job.id, folderId },
      });
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

  const deleteJob = async (jobId: string, folderId: string) => {
    setDeleting(jobId);
    try {
      // Delete related data (lessons, topics, subjects linked via drive_folder_id)
      // First get subjects for this folder
      const { data: subjects } = await supabase
        .from("subjects")
        .select("id")
        .eq("user_id", user!.id)
        .eq("drive_folder_id", folderId);

      if (subjects && subjects.length > 0) {
        const subjectIds = subjects.map((s) => s.id);

        // Get topics for these subjects
        const { data: topics } = await supabase
          .from("topics")
          .select("id")
          .in("subject_id", subjectIds);

        if (topics && topics.length > 0) {
          const topicIds = topics.map((t) => t.id);

          // Delete lessons for these topics
          await supabase.from("lessons").delete().in("topic_id", topicIds).eq("user_id", user!.id);
          // Delete topics
          await supabase.from("topics").delete().in("id", topicIds).eq("user_id", user!.id);
        }

        // Delete subjects
        await supabase.from("subjects").delete().in("id", subjectIds).eq("user_id", user!.id);
      }

      // Delete the job itself
      const { error } = await supabase.from("indexing_jobs").delete().eq("id", jobId).eq("user_id", user!.id);
      if (error) throw error;

      toast({ title: "Pasta removida", description: "Todos os dados associados foram removidos." });
      queryClient.invalidateQueries({ queryKey: ["indexing_jobs"] });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const statusConfig: Record<string, { icon: any; color: string }> = {
    pending: { icon: Loader2, color: "text-muted-foreground" },
    validating: { icon: Loader2, color: "text-warning" },
    indexing: { icon: Loader2, color: "text-info" },
    processing: { icon: Loader2, color: "text-primary" },
    completed: { icon: CheckCircle, color: "text-success" },
    failed: { icon: AlertCircle, color: "text-destructive" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Google Drive</h1>
        <p className="text-muted-foreground">Conecte e indexe sua pasta de estudos do Google Drive.</p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Conectar Pasta do Drive
          </CardTitle>
          <CardDescription>
            Cole o link da sua pasta raiz ITA-ESTUDOS do Google Drive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="https://drive.google.com/drive/folders/... ou ID da pasta"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
          />
          <Button onClick={startIndexing} disabled={connecting || !driveUrl.trim()} className="gradient-primary">
            <FolderSync className="mr-2 h-4 w-4" />
            {connecting ? "Conectando..." : "Conectar e Indexar"}
          </Button>
        </CardContent>
      </Card>

      {isLoading && <p className="text-muted-foreground">Carregando jobs...</p>}

      {jobs && jobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pastas Indexadas</h2>
          {jobs.map((job) => {
            const cfg = statusConfig[job.status] ?? statusConfig.pending;
            const Icon = cfg.icon;
            const pct = job.total_files && job.total_files > 0
              ? Math.round((job.processed_files ?? 0) / job.total_files * 100)
              : 0;
            const isActive = !["completed", "failed"].includes(job.status);
            return (
              <Card key={job.id} className="glass">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Icon className={`h-4 w-4 shrink-0 ${cfg.color} ${isActive ? "animate-spin" : ""}`} />
                      <span className="font-medium text-sm truncate">{job.drive_folder_id.slice(0, 24)}...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{job.status}</Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            disabled={deleting === job.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover pasta indexada?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso removerá todas as matérias, tópicos e aulas associadas a esta pasta do Drive. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteJob(job.id, job.drive_folder_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {job.total_files && job.total_files > 0 && (
                    <>
                      <Progress value={pct} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {job.processed_files ?? 0} / {job.total_files} arquivos processados
                      </p>
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

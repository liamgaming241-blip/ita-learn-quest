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
import { FolderSync, Loader2, CheckCircle, AlertCircle, HardDrive } from "lucide-react";

function extractFolderId(input: string): string | null {
  // Direct ID
  if (/^[a-zA-Z0-9_-]{10,}$/.test(input.trim())) return input.trim();
  // URL format
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

  const startIndexing = async () => {
    const folderId = extractFolderId(driveUrl);
    if (!folderId) {
      toast({ title: "Link inválido", description: "Insira um link válido de pasta do Google Drive.", variant: "destructive" });
      return;
    }

    setConnecting(true);
    try {
      // Create indexing job
      const { data: job, error } = await supabase.from("indexing_jobs").insert({
        user_id: user!.id,
        drive_folder_id: folderId,
        drive_folder_url: driveUrl,
        status: "pending",
      }).select().single();

      if (error) throw error;

      // Trigger edge function
      const { error: fnError } = await supabase.functions.invoke("index-drive", {
        body: { jobId: job.id, folderId },
      });

      if (fnError) {
        console.error("Edge function error:", fnError);
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
        <p className="text-muted-foreground">Conecte e indexe sua pasta de estudos do Google Drive.</p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Conectar Pasta do Drive
          </CardTitle>
          <CardDescription>
            Cole o link da sua pasta raiz ITA-ESTUDOS do Google Drive. A pasta deve seguir a estrutura com subpastas numeradas por matéria (01_MATEMATICA, 02_FISICA, etc.).
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
          <h2 className="text-lg font-semibold">Histórico de Indexação</h2>
          {jobs.map((job) => {
            const cfg = statusConfig[job.status] ?? statusConfig.pending;
            const Icon = cfg.icon;
            const pct = job.total_files && job.total_files > 0
              ? Math.round((job.processed_files ?? 0) / job.total_files * 100)
              : 0;
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

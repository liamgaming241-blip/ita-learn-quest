import { useState } from "react";
import { useSimulados, useQuestions } from "@/hooks/useSubjects";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Trophy, Plus, Play, CheckCircle } from "lucide-react";

const Simulados = () => {
  const { user } = useAuth();
  const { data: simulados, isLoading } = useSimulados();
  const { data: allQuestions } = useQuestions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [numQuestions, setNumQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(60);
  const [creating, setCreating] = useState(false);

  const createSimulado = async () => {
    if (!allQuestions || allQuestions.length === 0) {
      toast({ title: "Erro", description: "Nenhuma questão disponível para criar simulado.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(numQuestions, allQuestions.length));
      const { error } = await supabase.from("simulados").insert({
        user_id: user!.id,
        title: `Simulado ${(simulados?.length ?? 0) + 1}`,
        question_ids: selected.map((q) => q.id),
        total_questions: selected.length,
        time_limit_minutes: timeLimit,
        status: "pending",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["simulados"] });
      toast({ title: "Simulado criado!", description: `${selected.length} questões selecionadas.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Simulados</h1>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Novo Simulado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-muted-foreground">Nº de Questões</label>
              <Input type="number" min={1} max={100} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Tempo Limite (min)</label>
              <Input type="number" min={10} max={300} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={createSimulado} disabled={creating} className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "Criando..." : "Criar Simulado"}
          </Button>
        </CardContent>
      </Card>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {!isLoading && (!simulados || simulados.length === 0) && (
        <Card className="glass border-dashed">
          <CardContent className="p-12 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum simulado criado ainda.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {simulados?.map((s) => (
          <Card key={s.id} className="glass">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {s.total_questions} questões · {s.time_limit_minutes} min
                </p>
              </div>
              <div className="flex items-center gap-2">
                {s.status === "completed" && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {Number(s.score).toFixed(0)}%
                  </Badge>
                )}
                <Badge variant="outline">{s.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Simulados;

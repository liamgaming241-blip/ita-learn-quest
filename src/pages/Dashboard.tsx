import { useSubjects, useUserProgress, useQuestions, useSimulados, useWeakTopics, useLessons } from "@/hooks/useSubjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, FileQuestion, Trophy, TrendingDown, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const { data: subjects } = useSubjects();
  const { data: progress } = useUserProgress();
  const { data: questions } = useQuestions();
  const { data: simulados } = useSimulados();
  const { data: weakTopics } = useWeakTopics();

  const totalLessonsCompleted = progress?.filter((p) => p.completed).length ?? 0;
  const totalTimeSpent = progress?.reduce((acc, p) => acc + (p.time_spent_seconds ?? 0), 0) ?? 0;
  const totalQuestions = questions?.length ?? 0;
  const totalSimulados = simulados?.length ?? 0;
  const completedSimulados = simulados?.filter((s) => s.status === "completed").length ?? 0;
  const avgScore = completedSimulados > 0
    ? simulados!.filter((s) => s.status === "completed").reduce((a, s) => a + (Number(s.score) || 0), 0) / completedSimulados
    : 0;

  const stats = [
    { icon: BookOpen, label: "Matérias", value: subjects?.length ?? 0, color: "text-primary" },
    { icon: FileQuestion, label: "Questões Geradas", value: totalQuestions, color: "text-accent" },
    { icon: Trophy, label: "Simulados", value: `${completedSimulados}/${totalSimulados}`, color: "text-warning" },
    { icon: CheckCircle, label: "Aulas Concluídas", value: totalLessonsCompleted, color: "text-success" },
    { icon: TrendingDown, label: "Pontos Fracos", value: weakTopics?.length ?? 0, color: "text-destructive" },
    { icon: Clock, label: "Tempo de Estudo", value: `${Math.round(totalTimeSpent / 3600)}h`, color: "text-info" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo de volta! Aqui está seu progresso.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="glass">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {completedSimulados > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Desempenho nos Simulados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Média Geral</span>
              <span className="font-bold">{avgScore.toFixed(1)}%</span>
            </div>
            <Progress value={avgScore} className="h-3" />
          </CardContent>
        </Card>
      )}

      {subjects && subjects.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Suas Matérias</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <Card key={s.id} className="glass hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {(s as any).topics?.[0]?.count ?? 0} tópicos
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {(!subjects || subjects.length === 0) && (
        <Card className="glass border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">Nenhuma matéria indexada</h3>
            <p className="text-sm text-muted-foreground">
              Vá para "Google Drive" no menu para conectar e indexar seu conteúdo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;

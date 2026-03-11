import { useSubjects, useUserProgress, useQuestions, useSimulados, useWeakTopics } from "@/hooks/useSubjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, FileQuestion, Trophy, TrendingDown, CheckCircle, Clock, ArrowRight, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

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

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Estudante";

  const stats = [
    { icon: BookOpen, label: "Matérias", value: subjects?.length ?? 0, color: "text-primary", bg: "bg-primary/10" },
    { icon: FileQuestion, label: "Questões", value: totalQuestions, color: "text-accent", bg: "bg-accent/10" },
    { icon: Trophy, label: "Simulados", value: `${completedSimulados}/${totalSimulados}`, color: "text-warning", bg: "bg-warning/10" },
    { icon: CheckCircle, label: "Aulas Feitas", value: totalLessonsCompleted, color: "text-success", bg: "bg-success/10" },
    { icon: TrendingDown, label: "Pontos Fracos", value: weakTopics?.length ?? 0, color: "text-destructive", bg: "bg-destructive/10" },
    { icon: Clock, label: "Tempo Total", value: `${Math.round(totalTimeSpent / 3600)}h`, color: "text-info", bg: "bg-info/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary p-6 sm:p-8 text-primary-foreground">
        <div className="relative z-10">
          <p className="text-sm opacity-80 mb-1">Bem-vindo de volta,</p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{displayName} 👋</h1>
          <p className="text-sm opacity-80 max-w-md">
            Continue estudando e conquiste sua vaga no ITA. Cada questão resolvida te aproxima do objetivo.
          </p>
          <div className="flex gap-3 mt-5">
            <Button asChild size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-primary-foreground border-0">
              <Link to="/subjects"><BookOpen className="mr-2 h-4 w-4" /> Estudar</Link>
            </Button>
            <Button asChild size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-primary-foreground border-0">
              <Link to="/simulados"><Zap className="mr-2 h-4 w-4" /> Simulado</Link>
            </Button>
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-5 -bottom-10 h-32 w-32 rounded-full bg-white/5 blur-xl" />
      </div>

      {/* Stats grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {stats.map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label} className="glass border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{label}</p>
                <p className="text-xl font-bold tabular-nums">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Simulado performance */}
      {completedSimulados > 0 && (
        <Card className="glass border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Desempenho nos Simulados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Média Geral</span>
              <span className="font-bold text-lg">{avgScore.toFixed(1)}%</span>
            </div>
            <Progress value={avgScore} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Quick actions / subjects */}
      {subjects && subjects.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Suas Matérias</h2>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to="/subjects">Ver todas <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            {subjects.slice(0, 6).map((s) => (
              <Link key={s.id} to="/subjects">
                <Card className="glass border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-primary-foreground text-sm font-bold shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{s.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {(s as any).topics?.[0]?.count ?? 0} tópicos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <Card className="glass border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Comece sua jornada</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm">
              Conecte sua pasta do Google Drive para indexar automaticamente suas aulas e começar a estudar.
            </p>
            <Button asChild className="gradient-primary">
              <Link to="/drive-setup">
                <Zap className="mr-2 h-4 w-4" /> Conectar Google Drive
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;

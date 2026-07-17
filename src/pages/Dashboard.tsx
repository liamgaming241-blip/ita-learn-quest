import { useSubjects, useUserProgress, useQuestions, useSimulados, useWeakTopics } from "@/hooks/useSubjects";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, FileQuestion, Trophy, TrendingDown, CheckCircle, Clock,
  ArrowRight, Zap, Flame, Target, Brain, Activity, Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  const completedList = simulados?.filter((s) => s.status === "completed") ?? [];
  const completedSimulados = completedList.length;
  const avgScore = completedSimulados > 0
    ? completedList.reduce((a, s) => a + (Number(s.score) || 0), 0) / completedSimulados
    : 0;

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Cadete";

  const approvalReadiness = Math.min(100, Math.round(avgScore * 0.6 + Math.min(40, totalLessonsCompleted * 2)));
  const studyStreak = Math.max(1, Math.min(30, Math.round(totalTimeSpent / 3600)));
  const weeklyScore = avgScore || 0;

  const kpis = [
    { icon: Target, label: "Prontidão", value: `${approvalReadiness}%`, hint: "Rumo à aprovação", tone: "accent" as const },
    { icon: Flame, label: "Streak", value: `${studyStreak}d`, hint: "Consistência", tone: "warning" as const },
    { icon: Activity, label: "Semana", value: `${weeklyScore.toFixed(0)}%`, hint: "Performance", tone: "success" as const },
    { icon: Clock, label: "Horas", value: `${Math.round(totalTimeSpent / 3600)}h`, hint: "Tempo total", tone: "info" as const },
  ];

  const toneStyles = {
    accent: "text-accent bg-accent/10 border-accent/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    success: "text-success bg-success/10 border-success/20",
    info: "text-info bg-info/10 border-info/20",
  };

  const secondaryStats = [
    { icon: BookOpen, label: "Matérias", value: subjects?.length ?? 0 },
    { icon: FileQuestion, label: "Questões", value: totalQuestions },
    { icon: Trophy, label: "Simulados", value: `${completedSimulados}/${totalSimulados}` },
    { icon: CheckCircle, label: "Aulas concluídas", value: totalLessonsCompleted },
  ];

  return (
    <div className="space-y-8 animate-in-up">
      <section className="relative overflow-hidden rounded-2xl gradient-hero border border-border shadow-elegant">
        <div className="absolute inset-0 bg-grid opacity-[0.07] pointer-events-none" />
        <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
              <Sparkles className="h-3 w-3" />
              Mission Briefing
            </div>
            <h1 className="mt-4 font-display font-extrabold text-3xl sm:text-4xl leading-[1.05] text-primary-foreground">
              Bom retorno, <span className="text-gold">{displayName}</span>.
            </h1>
            <p className="mt-3 max-w-lg text-sm sm:text-base text-primary-foreground/70">
              À frente da aprovação. Sua central estratégica está calibrada — foco no que move o ponteiro hoje.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gradient-gold text-accent-foreground hover:opacity-90 shadow-gold font-semibold">
                <Link to="/subjects">
                  <Zap className="mr-2 h-4 w-4" /> Começar sessão
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border/40 bg-card/10 text-primary-foreground hover:bg-card/20 hover:text-primary-foreground backdrop-blur-sm">
                <Link to="/simulados">
                  <Trophy className="mr-2 h-4 w-4" /> Novo simulado
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card/10 backdrop-blur-md p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/60">Índice de Prontidão</p>
                <p className="mt-1 font-display font-extrabold text-4xl text-primary-foreground tabular-nums">
                  {approvalReadiness}<span className="text-accent">%</span>
                </p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-accent" />
              </div>
            </div>
            <Progress value={approvalReadiness} className="h-2 bg-card/20 [&>div]:bg-gradient-to-r [&>div]:from-accent [&>div]:to-accent/70" />
            <div className="mt-3 flex items-center justify-between text-[11px] text-primary-foreground/50">
              <span>Base</span>
              <span>Aprovação</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(({ icon: Icon, label, value, hint, tone }) => (
          <Card key={label} className="surface hover:-translate-y-0.5 transition-transform duration-200 border-border/60">
            <CardContent className="p-4">
              <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg border", toneStyles[tone])}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-4 text-[10px] uppercase font-semibold tracking-[0.18em] text-muted-foreground">{label}</p>
              <p className="mt-1 font-display font-extrabold text-2xl tabular-nums text-foreground">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="surface-elevated lg:col-span-2 border-border/60">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] uppercase font-semibold tracking-[0.2em] text-muted-foreground">Performance</p>
                <h2 className="font-display font-extrabold text-xl mt-1">Desempenho semanal</h2>
              </div>
              <Badge variant="outline" className="border-accent/30 text-accent bg-accent/5">
                <Activity className="mr-1 h-3 w-3" /> Ao vivo
              </Badge>
            </div>

            {completedSimulados > 0 ? (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Média geral</span>
                  <span className="font-display font-extrabold text-3xl tabular-nums">
                    {avgScore.toFixed(1)}<span className="text-base text-muted-foreground">%</span>
                  </span>
                </div>
                <Progress value={avgScore} className="h-2.5 [&>div]:bg-gradient-to-r [&>div]:from-accent [&>div]:to-accent/60" />

                <div className="mt-6 grid grid-cols-7 gap-1.5 h-24 items-end">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const sim = completedList[completedList.length - 1 - i];
                    const value = sim ? Number(sim.score) || 0 : 0;
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5 justify-end h-full">
                        <div
                          className={cn(
                            "w-full rounded-t transition-all duration-500",
                            value > 0 ? "bg-gradient-to-t from-accent/60 to-accent" : "bg-muted"
                          )}
                          style={{ height: `${Math.max(6, value)}%` }}
                        />
                        <span className="text-[9px] font-mono text-muted-foreground">D{i + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed border-border rounded-xl">
                <Activity className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Realize seu primeiro simulado para ativar a telemetria.</p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link to="/simulados">Iniciar simulado <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="surface-elevated border-border/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Brain className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold tracking-[0.2em] text-muted-foreground">Copilot</p>
                <h3 className="font-display font-extrabold text-lg leading-tight">Recomendações IA</h3>
              </div>
            </div>

            <div className="space-y-3">
              {(weakTopics && weakTopics.length > 0
                ? weakTopics.slice(0, 3).map((wt: any) => ({
                    title: wt.topics?.name ?? "Tópico prioritário",
                    subtitle: wt.subjects?.name ?? "Reforço recomendado",
                  }))
                : [
                    { title: "Comece pelos fundamentos", subtitle: "Assista às primeiras aulas" },
                    { title: "Meça sua linha de base", subtitle: "Faça um simulado curto" },
                    { title: "Ative suas fontes", subtitle: "Conecte o Google Drive" },
                  ]
              ).map((rec, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3 hover:border-accent/40 transition-colors">
                  <div className="mt-0.5 h-6 w-6 shrink-0 rounded-md bg-accent/10 text-accent flex items-center justify-center text-[11px] font-mono font-bold">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{rec.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{rec.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button asChild variant="outline" size="sm" className="w-full mt-4 border-accent/30 hover:bg-accent/10 hover:text-accent">
              <Link to="/weak-topics">
                Ver plano completo <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="surface lg:col-span-2 border-border/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <h3 className="font-display font-extrabold text-lg">Pontos fracos críticos</h3>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Link to="/weak-topics">Todos <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>

            {weakTopics && weakTopics.length > 0 ? (
              <ul className="space-y-2.5">
                {weakTopics.slice(0, 4).map((wt: any) => {
                  const accuracy = Number(wt.accuracy_rate) || 0;
                  const severity = wt.severity || "medium";
                  const sevColor =
                    severity === "critical" ? "bg-destructive"
                    : severity === "high" ? "bg-warning"
                    : "bg-info";
                  return (
                    <li key={wt.id} className="flex items-center gap-4 rounded-lg border border-border/50 bg-background/30 p-3 hover:border-border transition-colors">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", sevColor)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{wt.topics?.name ?? "Tópico"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{wt.subjects?.name ?? ""}</p>
                      </div>
                      <div className="w-32 hidden sm:block">
                        <Progress value={accuracy} className="h-1.5 [&>div]:bg-accent" />
                      </div>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground w-12 text-right">
                        {accuracy.toFixed(0)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">Resolva questões para mapear pontos fracos.</p>
            )}
          </CardContent>
        </Card>

        <Card className="surface border-border/60">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase font-semibold tracking-[0.2em] text-muted-foreground mb-4">Frota de estudo</p>
            <ul className="space-y-3.5">
              {secondaryStats.map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-muted-foreground flex-1">{label}</span>
                  <span className="font-display font-bold text-base tabular-nums">{value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {subjects && subjects.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-extrabold text-xl">Suas matérias</h2>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to="/subjects">Ver todas <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {subjects.slice(0, 8).map((s) => (
              <Link key={s.id} to="/subjects">
                <Card className="surface border-border/60 hover:border-accent/40 hover:-translate-y-0.5 transition-all cursor-pointer group h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-display font-extrabold shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{s.name}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          {(s as any).topics?.[0]?.count ?? 0} tópicos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <Card className="surface-elevated border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
              <Target className="h-8 w-8 text-accent" />
            </div>
            <h3 className="font-display font-extrabold text-xl mb-1">Ative sua mission control</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md">
              Conecte suas fontes de dados para calibrar o VANGUARD com seu material de estudo real.
            </p>
            <Button asChild size="lg" className="gradient-gold text-accent-foreground shadow-gold font-semibold">
              <Link to="/drive-setup">
                <Zap className="mr-2 h-4 w-4" /> Conectar fonte de dados
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
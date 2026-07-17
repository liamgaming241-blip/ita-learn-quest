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
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

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
  const readinessCount = useCountUp(approvalReadiness);

  const kpis = [
    { icon: Target, label: "Prontidão", value: `${approvalReadiness}%`, hint: "Rumo à aprovação", tone: "accent" as const },
    { icon: Flame, label: "Streak", value: `${studyStreak}d`, hint: "Consistência", tone: "warning" as const },
    { icon: Activity, label: "Semana", value: `${avgScore.toFixed(0)}%`, hint: "Performance", tone: "success" as const },
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* HERO */}
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-2xl gradient-hero border border-border shadow-elegant sheen"
      >
        <motion.div
          aria-hidden
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.8, 0.55] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/40 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-grid opacity-[0.06] pointer-events-none" />
        <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent"
            >
              <Sparkles className="h-3 w-3" />
              Mission Briefing
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }}
              className="mt-4 font-display font-extrabold text-3xl sm:text-4xl leading-[1.05] text-primary-foreground"
            >
              Bom retorno, <span className="text-gold">{displayName}</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38, duration: 0.5 }}
              className="mt-3 max-w-lg text-sm sm:text-base text-primary-foreground/70"
            >
              À frente da aprovação. Sua central estratégica está calibrada — foco no que move o ponteiro hoje.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.5 }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <Button asChild size="lg" className="gradient-gold text-accent-foreground hover:opacity-95 hover:scale-[1.03] shadow-gold font-semibold">
                <Link to="/subjects">
                  <Zap className="mr-2 h-4 w-4" /> Começar sessão
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border/40 bg-card/10 text-primary-foreground hover:bg-card/20 hover:text-primary-foreground backdrop-blur-sm hover:scale-[1.02]">
                <Link to="/simulados">
                  <Trophy className="mr-2 h-4 w-4" /> Novo simulado
                </Link>
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
            className="rounded-2xl border border-border/30 bg-card/10 backdrop-blur-md p-5 sm:p-6 glow-accent"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/60">Índice de Prontidão</p>
                <p className="mt-1 font-display font-extrabold text-4xl text-primary-foreground tabular-nums">
                  {readinessCount}<span className="text-accent">%</span>
                </p>
              </div>
              <motion.div
                animate={{ rotate: [0, 6, -6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="h-14 w-14 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center"
              >
                <Target className="h-6 w-6 text-accent" />
              </motion.div>
            </div>
            <div className="h-2 rounded-full bg-card/20 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${approvalReadiness}%` }}
                transition={{ delay: 0.5, duration: 1.1, ease: [0.22, 1, 0.36, 1] as const }}
                className="h-full bg-gradient-to-r from-accent to-accent/60"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-primary-foreground/50">
              <span>Base</span>
              <span>Aprovação</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* KPIs */}
      <motion.section variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(({ icon: Icon, label, value, hint, tone }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
            whileHover={{ y: -3 }}
          >
            <Card className="surface border-border/60 h-full">
              <CardContent className="p-4">
                <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg border", toneStyles[tone])}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-4 text-[10px] uppercase font-semibold tracking-[0.18em] text-muted-foreground">{label}</p>
                <p className="mt-1 font-display font-extrabold text-2xl tabular-nums text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.section>

      {/* PERFORMANCE + AI */}
      <motion.section variants={item} className="grid gap-4 lg:grid-cols-3">
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
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(6, value)}%` }}
                          transition={{ delay: 0.2 + i * 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
                          className={cn(
                            "w-full rounded-t",
                            value > 0 ? "bg-gradient-to-t from-accent/60 to-accent" : "bg-muted"
                          )}
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
          <motion.div
            aria-hidden
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 right-0 h-32 w-32 rounded-full bg-accent/10 blur-3xl pointer-events-none"
          />
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-2 mb-4">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="h-9 w-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center"
              >
                <Brain className="h-4 w-4 text-accent" />
              </motion.div>
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
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  whileHover={{ x: 3 }}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3 hover:border-accent/40 cursor-default"
                >
                  <div className="mt-0.5 h-6 w-6 shrink-0 rounded-md bg-accent/10 text-accent flex items-center justify-center text-[11px] font-mono font-bold">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{rec.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{rec.subtitle}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button asChild variant="outline" size="sm" className="w-full mt-4 border-accent/30 hover:bg-accent/10 hover:text-accent group">
              <Link to="/weak-topics">
                Ver plano completo <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.section>

      {/* WEAK TOPICS + STATS */}
      <motion.section variants={item} className="grid gap-4 lg:grid-cols-3">
        <Card className="surface lg:col-span-2 border-border/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <h3 className="font-display font-extrabold text-lg">Pontos fracos críticos</h3>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground group">
                <Link to="/weak-topics">Todos <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" /></Link>
              </Button>
            </div>

            {weakTopics && weakTopics.length > 0 ? (
              <ul className="space-y-2.5">
                {weakTopics.slice(0, 4).map((wt: any, i: number) => {
                  const accuracy = Number(wt.accuracy_rate) || 0;
                  const severity = wt.severity || "medium";
                  const sevColor =
                    severity === "critical" ? "bg-destructive"
                    : severity === "high" ? "bg-warning"
                    : "bg-info";
                  return (
                    <motion.li
                      key={wt.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.4 }}
                      className="flex items-center gap-4 rounded-lg border border-border/50 bg-background/30 p-3 hover:border-border hover:bg-background/60 cursor-default"
                    >
                      <span className={cn("h-2 w-2 rounded-full shrink-0", sevColor)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{wt.topics?.name ?? "Tópico"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{wt.subjects?.name ?? ""}</p>
                      </div>
                      <div className="w-32 hidden sm:block h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${accuracy}%` }}
                          transition={{ delay: 0.2 + i * 0.06, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
                          className="h-full bg-accent"
                        />
                      </div>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground w-12 text-right">
                        {accuracy.toFixed(0)}%
                      </span>
                    </motion.li>
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
              {secondaryStats.map(({ icon: Icon, label, value }, i) => (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-muted-foreground flex-1">{label}</span>
                  <span className="font-display font-bold text-base tabular-nums">{value}</span>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.section>

      {/* SUBJECTS */}
      {subjects && subjects.length > 0 ? (
        <motion.section variants={item}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-extrabold text-xl">Suas matérias</h2>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground group">
              <Link to="/subjects">Ver todas <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" /></Link>
            </Button>
          </div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {subjects.slice(0, 8).map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
                whileHover={{ y: -4 }}
              >
                <Link to="/subjects">
                  <Card className="surface border-border/60 hover:border-accent/40 cursor-pointer group h-full">
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
              </motion.div>
            ))}
          </div>
        </motion.section>
      ) : (
        <motion.div variants={item}>
          <Card className="surface-elevated border-dashed border-2 border-border/60">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="h-16 w-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4"
              >
                <Target className="h-8 w-8 text-accent" />
              </motion.div>
              <h3 className="font-display font-extrabold text-xl mb-1">Ative sua mission control</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-md">
                Conecte suas fontes de dados para calibrar o VANGUARD com seu material de estudo real.
              </p>
              <Button asChild size="lg" className="gradient-gold text-accent-foreground shadow-gold font-semibold hover:scale-[1.03]">
                <Link to="/drive-setup">
                  <Zap className="mr-2 h-4 w-4" /> Conectar fonte de dados
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dashboard;
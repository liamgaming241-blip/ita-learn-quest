import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubjects, useTopics, useSubtopics } from "@/hooks/useSubjects";
import { INSTITUTIONS, QbFilters, useExamCatalog, useExamSessions, useQbQuestions, useQbRecommendations, useQbStats, useStartExam, useSubmitExam } from "@/hooks/useQuestionBank";
import { QuestionSolver } from "@/components/qb/QuestionSolver";
import { Flame, Sparkles, Star, Target, Timer, TrendingUp, PlayCircle, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i);

const Questions = () => {
  const [tab, setTab] = useState("praticar");
  const [filters, setFilters] = useState<QbFilters>({ page: 0, pageSize: 25 });
  const [solverId, setSolverId] = useState<string | null>(null);
  const [solverIdx, setSolverIdx] = useState(0);

  const { data: subjects } = useSubjects();
  const { data: topics } = useTopics(filters.subjectId);
  const { data: subtopics } = useSubtopics(filters.topicId);
  const { data: list, isLoading } = useQbQuestions(filters);
  const { data: stats } = useQbStats();
  const { data: rec } = useQbRecommendations();
  const { data: catalog } = useExamCatalog();
  const { data: sessions } = useExamSessions();
  const startExam = useStartExam();
  const submitExam = useSubmitExam();

  const rows = list?.rows ?? [];
  const total = list?.count ?? 0;

  const updateFilter = (patch: Partial<QbFilters>) =>
    setFilters(f => ({ ...f, ...patch, page: 0 }));

  const solverList = solverId ? rows : [];
  const solverQid = solverId ?? (rows[solverIdx]?.id ?? null);

  const [examSession, setExamSession] = useState<{ id: string; qids: string[]; answers: Record<string, string>; idx: number } | null>(null);

  const beginExam = async (institution: string, year: number, phase: string | null) => {
    try {
      const id = await startExam.mutateAsync({ institution, year, phase, mode: "exam" });
      const { data } = await supabase.from("exam_sessions").select("question_ids").eq("id", id).maybeSingle();
      const qids = ((data?.question_ids as any) ?? []) as string[];
      setExamSession({ id, qids, answers: {}, idx: 0 });
      setTab("praticar");
    } catch (e: any) { toast.error(e.message); }
  };

  const finishExam = async () => {
    if (!examSession) return;
    try {
      const res: any = await submitExam.mutateAsync({ session_id: examSession.id, answers: examSession.answers });
      toast.success(`Prova finalizada: ${res.correct}/${res.total} (${Math.round(res.score)}%)`);
      setExamSession(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-black text-2xl tracking-tight">Banco de Questões</h1>
          <p className="text-sm text-muted-foreground">Provas oficiais ITA e IME · filtros inteligentes · progresso pessoal</p>
        </div>
        {stats && (
          <div className="flex gap-2 flex-wrap">
            <Stat icon={<Target className="h-3.5 w-3.5" />} label="Acurácia" value={`${stats.accuracy}%`} />
            <Stat icon={<Flame className="h-3.5 w-3.5" />} label="Streak" value={`${stats.streak}d`} />
            <Stat icon={<Star className="h-3.5 w-3.5" />} label="Dominadas" value={stats.mastered} />
            <Stat icon={<Timer className="h-3.5 w-3.5" />} label="Média" value={`${stats.avgTime}s`} />
          </div>
        )}
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="praticar">Praticar</TabsTrigger>
          <TabsTrigger value="provas">Provas Anteriores</TabsTrigger>
          <TabsTrigger value="progresso">Progresso</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="praticar" className="space-y-4">
          {examSession ? (
            <ExamRunner
              session={examSession}
              onAnswer={(qid, label) => setExamSession(s => s ? ({ ...s, answers: { ...s.answers, [qid]: label } }) : s)}
              onNav={(idx) => setExamSession(s => s ? ({ ...s, idx }) : s)}
              onFinish={finishExam}
              submitting={submitExam.isPending}
            />
          ) : solverQid ? (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" onClick={() => setSolverId(null)}><X className="h-4 w-4 mr-1" />Voltar à lista</Button>
              <QuestionSolver
                questionId={solverQid}
                mode="learning"
                index={solverIdx}
                total={rows.length}
                onNext={() => { setSolverIdx(i => Math.min(rows.length - 1, i + 1)); setSolverId(rows[Math.min(rows.length - 1, solverIdx + 1)]?.id ?? null); }}
                onPrev={() => { setSolverIdx(i => Math.max(0, i - 1)); setSolverId(rows[Math.max(0, solverIdx - 1)]?.id ?? null); }}
              />
            </div>
          ) : (
            <>
              <FiltersBar
                filters={filters}
                onChange={updateFilter}
                subjects={subjects ?? []}
                topics={topics ?? []}
                subtopics={subtopics ?? []}
              />
              {rec && rec.review.length > 0 && (
                <Card className="surface-elevated border-accent/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-accent">Recomendadas para revisar</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {rec.review.slice(0, 6).map((r: any) => (
                        <button key={r.id} className="text-left rounded-md border border-border/60 p-2 hover:border-accent/60"
                          onClick={() => { setSolverId(r.id); setSolverIdx(0); }}>
                          <div className="text-xs text-muted-foreground">{r.institution ?? "—"}{r.year ? ` · ${r.year}` : ""} · {(r as any).subjects?.name ?? ""}</div>
                          <div className="text-sm line-clamp-2">{r.title ?? r.question_text}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              <QuestionList rows={rows} total={total} isLoading={isLoading} onOpen={(id, idx) => { setSolverId(id); setSolverIdx(idx); }}
                page={filters.page ?? 0} pageSize={filters.pageSize ?? 25} onPage={(p) => setFilters(f => ({ ...f, page: p }))} />
            </>
          )}
        </TabsContent>

        <TabsContent value="provas" className="space-y-3">
          <p className="text-sm text-muted-foreground">Resolva provas oficiais completas em modo cronometrado.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(catalog ?? []).map(e => (
              <Card key={`${e.institution}-${e.year}-${e.phase ?? ""}`} className="surface-elevated hover:border-accent/50 transition">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display font-bold">{e.institution} {e.year}{e.phase ? ` · ${e.phase}` : ""}</div>
                    <div className="text-xs text-muted-foreground">{e.count} questões</div>
                  </div>
                  <Button size="sm" onClick={() => beginExam(e.institution, e.year, e.phase)} disabled={startExam.isPending}
                    className="gradient-gold text-accent-foreground"><PlayCircle className="h-4 w-4 mr-1" />Iniciar</Button>
                </CardContent>
              </Card>
            ))}
            {(!catalog || catalog.length === 0) && (
              <p className="text-sm text-muted-foreground">Nenhuma prova disponível ainda. Peça ao administrador para importar questões.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="progresso" className="space-y-3">
          {stats ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <BigStat label="Questões respondidas" value={stats.total} icon={<TrendingUp className="h-4 w-4" />} />
              <BigStat label="Acurácia" value={`${stats.accuracy}%`} icon={<Target className="h-4 w-4" />} />
              <BigStat label="Streak de estudo" value={`${stats.streak} dias`} icon={<Flame className="h-4 w-4" />} />
              <BigStat label="Dominadas" value={stats.mastered} icon={<Star className="h-4 w-4" />} />
              <Card className="surface-elevated sm:col-span-2 lg:col-span-4"><CardContent className="p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Atividade (90 dias)</div>
                <div className="grid grid-flow-col grid-rows-7 gap-1">
                  {stats.days.map(d => (
                    <div key={d.date} title={`${d.date}: ${d.count}`}
                      className="w-3 h-3 rounded-sm"
                      style={{ background: d.count === 0 ? "hsl(var(--muted))" : `hsl(var(--accent) / ${Math.min(0.2 + d.count / 10, 1)})` }} />
                  ))}
                </div>
              </CardContent></Card>
            </div>
          ) : <p className="text-sm text-muted-foreground">Carregando…</p>}
        </TabsContent>

        <TabsContent value="historico" className="space-y-2">
          {(sessions ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma prova finalizada ainda.</p>}
          {(sessions ?? []).map(s => (
            <Card key={s.id} className="surface"><CardContent className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{s.institution} {s.year} <span className="text-xs text-muted-foreground">· {s.status}</span></div>
                <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
              </div>
              <div className="text-sm tabular-nums">{s.correct}/{s.total} · <span className="text-accent">{s.score ? Math.round(Number(s.score)) : 0}%</span></div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="rounded-md border border-border/60 bg-card/50 px-3 py-1.5 flex items-center gap-2 text-xs">
    <span className="text-accent">{icon}</span>
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono tabular-nums font-semibold">{value}</span>
  </div>
);

const BigStat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <Card className="surface-elevated"><CardContent className="p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">{icon}{label}</div>
    <div className="text-2xl font-display font-black mt-1 tabular-nums">{value}</div>
  </CardContent></Card>
);

const FiltersBar = ({ filters, onChange, subjects, topics, subtopics }: any) => (
  <Card className="surface"><CardContent className="p-3 grid gap-2 md:grid-cols-6">
    <div className="relative md:col-span-2">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Buscar por palavra-chave" className="pl-8" value={filters.q ?? ""} onChange={e => onChange({ q: e.target.value })} />
    </div>
    <Select value={filters.institution ?? "all"} onValueChange={v => onChange({ institution: v === "all" ? undefined : v })}>
      <SelectTrigger><SelectValue placeholder="Banca" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas bancas</SelectItem>
        {INSTITUTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={filters.year ? String(filters.year) : "all"} onValueChange={v => onChange({ year: v === "all" ? null : Number(v) })}>
      <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos anos</SelectItem>
        {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={filters.subjectId ?? "all"} onValueChange={v => onChange({ subjectId: v === "all" ? undefined : v, topicId: undefined, subtopicId: undefined })}>
      <SelectTrigger><SelectValue placeholder="Matéria" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas matérias</SelectItem>
        {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={filters.difficulty ?? "all"} onValueChange={v => onChange({ difficulty: v === "all" ? undefined : v })}>
      <SelectTrigger><SelectValue placeholder="Dificuldade" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas</SelectItem>
        <SelectItem value="easy">Fácil</SelectItem>
        <SelectItem value="medium">Média</SelectItem>
        <SelectItem value="hard">Difícil</SelectItem>
      </SelectContent>
    </Select>
    {filters.subjectId && (
      <Select value={filters.topicId ?? "all"} onValueChange={v => onChange({ topicId: v === "all" ? undefined : v, subtopicId: undefined })}>
        <SelectTrigger><SelectValue placeholder="Tópico" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos tópicos</SelectItem>
          {topics.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
        </SelectContent>
      </Select>
    )}
    {filters.topicId && (
      <Select value={filters.subtopicId ?? "all"} onValueChange={v => onChange({ subtopicId: v === "all" ? undefined : v })}>
        <SelectTrigger><SelectValue placeholder="Subtópico" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos subtópicos</SelectItem>
          {subtopics.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>
    )}
    <Select value={filters.status ?? "all"} onValueChange={v => onChange({ status: v === "all" ? undefined : v as any })}>
      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        <SelectItem value="never">Nunca respondidas</SelectItem>
        <SelectItem value="answered">Já respondidas</SelectItem>
        <SelectItem value="correct">Acertei</SelectItem>
        <SelectItem value="incorrect">Errei</SelectItem>
        <SelectItem value="favorites">Favoritas</SelectItem>
        <SelectItem value="bookmarks">Salvas</SelectItem>
        <SelectItem value="review">Para revisar</SelectItem>
      </SelectContent>
    </Select>
  </CardContent></Card>
);

const QuestionList = ({ rows, total, isLoading, onOpen, page, pageSize, onPage }: any) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="text-xs text-muted-foreground">{total} questões</div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</Button>
        <Button size="sm" variant="ghost" disabled={(page + 1) * pageSize >= total} onClick={() => onPage(page + 1)}>Próxima</Button>
      </div>
    </div>
    {isLoading && <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>}
    {!isLoading && rows.length === 0 && (
      <Card className="surface border-dashed border-2"><CardContent className="p-8 text-center text-sm text-muted-foreground">
        Nenhuma questão encontrada com esses filtros.
      </CardContent></Card>
    )}
    {rows.map((q: any, idx: number) => (
      <button key={q.id} onClick={() => onOpen(q.id, idx)}
        className="w-full text-left rounded-lg border border-border/60 bg-card hover:border-accent/50 transition p-3 flex gap-3">
        <div className="flex-shrink-0 flex flex-col items-start gap-1">
          {q.institution && <Badge variant="outline" className="border-accent/30 text-accent text-[10px]">{q.institution}{q.year ? ` ${q.year}` : ""}</Badge>}
          {q.difficulty && <Badge variant="secondary" className="text-[10px]">{q.difficulty}</Badge>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground truncate">
            {q.subjects?.name ?? "—"}{q.topics?.name ? ` › ${q.topics.name}` : ""}{q.subtopics?.name ? ` › ${q.subtopics.name}` : ""}
          </div>
          <div className="text-sm line-clamp-2 mt-0.5">{q.title || q.question_text}</div>
        </div>
      </button>
    ))}
  </div>
);

const ExamRunner = ({ session, onAnswer, onNav, onFinish, submitting }: any) => {
  const qid = session.qids[session.idx];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Modo prova · {session.idx + 1}/{session.qids.length}</div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={session.idx === 0} onClick={() => onNav(session.idx - 1)}>Anterior</Button>
          <Button variant="ghost" size="sm" disabled={session.idx >= session.qids.length - 1} onClick={() => onNav(session.idx + 1)}>Próxima</Button>
          <Button size="sm" className="gradient-gold text-accent-foreground" onClick={onFinish} disabled={submitting}>{submitting ? "Enviando…" : "Finalizar prova"}</Button>
        </div>
      </div>
      <QuestionSolver
        questionId={qid}
        mode="exam"
        hideCorrection
        examSessionId={session.id}
        index={session.idx}
        total={session.qids.length}
        onNext={() => session.idx < session.qids.length - 1 ? onNav(session.idx + 1) : undefined}
        onPrev={() => session.idx > 0 ? onNav(session.idx - 1) : undefined}
        onAnswered={(_ok, selected) => onAnswer(qid, selected)}
      />
      <div className="grid grid-cols-10 gap-1">
        {session.qids.map((qq: string, i: number) => (
          <button key={qq} onClick={() => onNav(i)} className={`h-8 rounded text-xs font-mono ${i === session.idx ? "bg-accent text-accent-foreground" : session.answers[qq] ? "bg-success/30" : "bg-muted"}`}>{i + 1}</button>
        ))}
      </div>
    </div>
  );
};

export default Questions;
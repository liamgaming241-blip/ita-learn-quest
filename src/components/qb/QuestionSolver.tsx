import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Star, Bookmark, Flag, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQbQuestion, useQbUserState, useRecordAttempt, useToggleFlag, useReportQuestion } from "@/hooks/useQuestionBank";
import { toast } from "sonner";

type Props = {
  questionId: string;
  mode?: "learning" | "exam";
  onNext?: () => void;
  onPrev?: () => void;
  onAnswered?: (isCorrect: boolean, selected: string) => void;
  hideCorrection?: boolean; // for exam mode
  index?: number;
  total?: number;
  examSessionId?: string;
};

export const QuestionSolver = ({ questionId, mode = "learning", onNext, onPrev, onAnswered, hideCorrection, index, total, examSessionId }: Props) => {
  const { data: q, isLoading } = useQbQuestion(questionId);
  const { data: state } = useQbUserState(questionId);
  const record = useRecordAttempt();
  const toggle = useToggleFlag();
  const report = useReportQuestion();
  const [selected, setSelected] = useState<string | null>(null);
  const [showAns, setShowAns] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(Date.now());

  useEffect(() => { setSelected(null); setShowAns(false); setStartedAt(Date.now()); }, [questionId]);

  const options = (q?.options as any[] | undefined) ?? [];
  const correct = q?.correct_option as string | undefined;

  const answer = async (label: string) => {
    if (showAns || record.isPending) return;
    setSelected(label);
    const timeSpent = Math.round((Date.now() - startedAt) / 1000);
    try {
      const res: any = await record.mutateAsync({ question_id: questionId, selected: label, time_spent: timeSpent, mode, exam_session_id: examSessionId });
      if (!hideCorrection) setShowAns(true);
      onAnswered?.(!!res?.is_correct, label);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao registrar");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const map: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E" };
      if (map[e.key] && !showAns) answer(map[e.key]);
      if (e.key.toLowerCase() === "n") onNext?.();
      if (e.key.toLowerCase() === "p") onPrev?.();
      if (e.key.toLowerCase() === "f") toggle.mutate({ question_id: questionId, flag: "favorite" });
      if (e.key.toLowerCase() === "b") toggle.mutate({ question_id: questionId, flag: "bookmark" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (isLoading || !q) return <div className="py-10 text-center text-muted-foreground">Carregando…</div>;

  const images = (q.images as any[] | null) ?? [];

  return (
    <Card className="surface-elevated border-border/60">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {q.institution && <Badge variant="outline" className="border-accent/30 text-accent">{q.institution}{q.year ? ` · ${q.year}` : ""}</Badge>}
            {q.phase && <Badge variant="outline">{q.phase}</Badge>}
            {q.difficulty && <Badge variant="secondary">{q.difficulty}</Badge>}
            {(q as any).subjects?.name && <span className="text-xs text-muted-foreground">{(q as any).subjects.name}</span>}
            {(q as any).subtopics?.name && <span className="text-xs text-muted-foreground">· {(q as any).subtopics.name}</span>}
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => toggle.mutate({ question_id: questionId, flag: "favorite" })}
              className={state?.is_favorite ? "text-accent" : ""} title="Favorito (F)">
              <Star className={cn("h-4 w-4", state?.is_favorite && "fill-current")} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => toggle.mutate({ question_id: questionId, flag: "bookmark" })}
              className={state?.is_bookmarked ? "text-accent" : ""} title="Salvar (B)">
              <Bookmark className={cn("h-4 w-4", state?.is_bookmarked && "fill-current")} />
            </Button>
            <Button size="icon" variant="ghost" title="Reportar (R)" onClick={async () => {
              const reason = window.prompt("Descreva o problema:"); if (!reason) return;
              try { await report.mutateAsync({ question_id: questionId, reason }); toast.success("Reporte enviado"); } catch (e: any) { toast.error(e.message); }
            }}>
              <Flag className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {typeof index === "number" && typeof total === "number" && (
          <p className="text-[11px] uppercase font-semibold tracking-[0.2em] text-muted-foreground">
            Questão <span className="text-foreground font-mono tabular-nums">{index + 1}</span> de {total}
          </p>
        )}

        {q.title && <h3 className="font-display text-lg font-bold">{q.title}</h3>}
        <p className="text-base leading-relaxed whitespace-pre-wrap">{q.question_text}</p>

        {images.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {images.map((img: any, i: number) => (
              <a key={i} href={img.url ?? img} target="_blank" rel="noreferrer" className="block">
                <img src={img.url ?? img} alt={img.alt ?? ""} className="rounded-lg border border-border/60 max-h-72 object-contain w-full" />
              </a>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {options.map((opt: any, i: number) => {
            const label = opt.label ?? String.fromCharCode(65 + i);
            const text = opt.text ?? opt;
            const isCorrect = showAns && correct && label.toLowerCase() === correct.toLowerCase();
            const isSelected = selected === label;
            return (
              <motion.button
                key={label}
                whileHover={!showAns ? { x: 3 } : undefined}
                disabled={showAns || record.isPending}
                onClick={() => answer(label)}
                className={cn(
                  "w-full text-left rounded-lg border p-3.5 flex items-start gap-3",
                  showAns
                    ? isCorrect ? "border-success/60 bg-success/10"
                      : isSelected ? "border-destructive/60 bg-destructive/10"
                      : "border-border/60 opacity-60"
                    : isSelected ? "border-accent/60 bg-accent/5"
                    : "border-border/60 hover:border-accent/50 hover:bg-accent/5"
                )}
              >
                <span className={cn(
                  "h-7 w-7 shrink-0 rounded-md font-mono font-bold text-sm flex items-center justify-center border",
                  showAns && isCorrect ? "border-success/60 bg-success/20 text-success"
                    : showAns && isSelected ? "border-destructive/60 bg-destructive/20 text-destructive"
                    : "border-border bg-muted text-muted-foreground"
                )}>{label}</span>
                <span className="flex-1 pt-1 text-sm whitespace-pre-wrap">{text}</span>
                {showAns && isCorrect && <CheckCircle className="h-5 w-5 text-success" />}
                {showAns && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive" />}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {showAns && !hideCorrection && q.explanation && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-1.5">Resolução</p>
                <p className="leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                {q.source && <p className="text-xs text-muted-foreground mt-2">Fonte: {q.source}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center pt-1">
          <div className="text-xs text-muted-foreground">
            {state && state.attempts > 0 && (
              <>Tentativas: <span className="tabular-nums">{state.attempts}</span> · Acertos: <span className="tabular-nums text-success">{state.correct}</span></>
            )}
          </div>
          <div className="flex gap-2">
            {onPrev && <Button variant="ghost" size="sm" onClick={onPrev}><ArrowLeft className="h-4 w-4 mr-1" />Anterior</Button>}
            {onNext && <Button size="sm" onClick={onNext} className="gradient-gold text-accent-foreground">Próxima<ArrowRight className="h-4 w-4 ml-1" /></Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuestions, useSubjects } from "@/hooks/useSubjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, FileQuestion, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const Questions = () => {
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const { data: subjects } = useSubjects();
  const { data: questions, isLoading } = useQuestions(
    subjectFilter !== "all" ? { subjectId: subjectFilter } : undefined
  );

  const current = questions?.[currentIdx];
  const options = current?.options as { label: string; text: string }[] | undefined;
  const total = questions?.length ?? 0;
  const progressPct = total > 0 ? ((currentIdx + (showExplanation ? 1 : 0)) / total) * 100 : 0;

  const handleAnswer = (label: string) => {
    setSelectedAnswer(label);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentIdx((i) => Math.min(i + 1, total - 1));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {total > 0 && (
            <div className="mt-1 h-1.5 max-w-md rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-gradient-to-r from-accent to-accent/60"
              />
            </div>
          )}
        </div>
        <Select
          value={subjectFilter}
          onValueChange={(v) => { setSubjectFilter(v); setCurrentIdx(0); setSelectedAnswer(null); setShowExplanation(false); }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filtrar matéria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as matérias</SelectItem>
            {subjects?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="py-16 flex justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent"
          />
        </div>
      )}

      {!isLoading && total === 0 && (
        <Card className="surface-elevated border-dashed border-2 border-border/60">
          <CardContent className="p-12 text-center">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center"
            >
              <FileQuestion className="h-6 w-6 text-accent" />
            </motion.div>
            <p className="text-muted-foreground">Nenhuma questão gerada ainda. Indexe seu Drive e aguarde o processamento.</p>
          </CardContent>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id + "-" + currentIdx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="surface-elevated border-border/60">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase font-semibold tracking-[0.2em] text-muted-foreground">
                    Questão <span className="text-foreground font-mono tabular-nums">{currentIdx + 1}</span> de {total}
                  </p>
                  <Badge variant="outline" className="border-accent/30 text-accent bg-accent/5 uppercase tracking-wider text-[10px]">
                    {current.difficulty}
                  </Badge>
                </div>

                <p className="text-base leading-relaxed">{current.question_text}</p>

                <div className="space-y-2">
                  {options?.map((opt, i) => {
                    const isCorrect = opt.label === current.correct_option;
                    const isSelected = opt.label === selectedAnswer;
                    return (
                      <motion.button
                        key={opt.label}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i, duration: 0.35 }}
                        whileHover={!showExplanation ? { x: 4 } : undefined}
                        disabled={showExplanation}
                        onClick={() => handleAnswer(opt.label)}
                        className={cn(
                          "w-full text-left rounded-lg border p-3.5 flex items-start gap-3 group",
                          showExplanation
                            ? isCorrect
                              ? "border-success/60 bg-success/10"
                              : isSelected
                              ? "border-destructive/60 bg-destructive/10"
                              : "border-border/60 opacity-60"
                            : "border-border/60 hover:border-accent/50 hover:bg-accent/5"
                        )}
                      >
                        <span className={cn(
                          "h-7 w-7 shrink-0 rounded-md font-mono font-bold text-sm flex items-center justify-center border",
                          showExplanation && isCorrect ? "border-success/60 bg-success/20 text-success"
                          : showExplanation && isSelected ? "border-destructive/60 bg-destructive/20 text-destructive"
                          : "border-border bg-muted text-muted-foreground group-hover:border-accent/40 group-hover:text-accent"
                        )}>
                          {opt.label}
                        </span>
                        <span className="flex-1 pt-1 text-sm">{opt.text}</span>
                        {showExplanation && isCorrect && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                            <CheckCircle className="h-5 w-5 text-success" />
                          </motion.span>
                        )}
                        {showExplanation && isSelected && !isCorrect && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                            <XCircle className="h-5 w-5 text-destructive" />
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {showExplanation && current.explanation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent mb-1.5">Explicação</p>
                        <p className="leading-relaxed">{current.explanation}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {showExplanation && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <Button
                      onClick={nextQuestion}
                      disabled={currentIdx >= total - 1}
                      className="gradient-gold text-accent-foreground shadow-gold font-semibold hover:scale-[1.02] group"
                    >
                      Próxima questão
                      <ArrowRight className="ml-1.5 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Questions;
import { useState } from "react";
import { useQuestions, useSubjects } from "@/hooks/useSubjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, FileQuestion } from "lucide-react";

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

  const handleAnswer = (label: string) => {
    setSelectedAnswer(label);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentIdx((i) => Math.min(i + 1, (questions?.length ?? 1) - 1));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Questões</h1>
        <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v); setCurrentIdx(0); setSelectedAnswer(null); setShowExplanation(false); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar matéria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {subjects?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {!isLoading && (!questions || questions.length === 0) && (
        <Card className="glass border-dashed">
          <CardContent className="p-12 text-center">
            <FileQuestion className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma questão gerada ainda. Indexe seu Drive e aguarde o processamento.</p>
          </CardContent>
        </Card>
      )}

      {current && (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Questão {currentIdx + 1} de {questions?.length}</CardTitle>
              <Badge variant="outline">{current.difficulty}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base leading-relaxed">{current.question_text}</p>
            <div className="space-y-2">
              {options?.map((opt) => {
                const isCorrect = opt.label === current.correct_option;
                const isSelected = opt.label === selectedAnswer;
                return (
                  <button
                    key={opt.label}
                    disabled={showExplanation}
                    onClick={() => handleAnswer(opt.label)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      showExplanation
                        ? isCorrect
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : isSelected
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-border"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-mono font-bold mr-2">{opt.label})</span>
                    {opt.text}
                    {showExplanation && isCorrect && <CheckCircle className="inline ml-2 h-4 w-4 text-green-600" />}
                    {showExplanation && isSelected && !isCorrect && <XCircle className="inline ml-2 h-4 w-4 text-red-600" />}
                  </button>
                );
              })}
            </div>
            {showExplanation && current.explanation && (
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-semibold mb-1">Explicação:</p>
                <p>{current.explanation}</p>
              </div>
            )}
            {showExplanation && (
              <Button onClick={nextQuestion} disabled={currentIdx >= (questions?.length ?? 1) - 1}>
                Próxima Questão
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Questions;

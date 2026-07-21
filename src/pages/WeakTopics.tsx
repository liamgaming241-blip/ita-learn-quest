import { useWeakTopics } from "@/hooks/useSubjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, AlertTriangle } from "lucide-react";

const severityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "Crítico" },
  high: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", label: "Alto" },
  medium: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Médio" },
  low: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Baixo" },
};

const WeakTopics = () => {
  const { data: weakTopics, isLoading } = useWeakTopics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pontos Fracos</h1>
        <p className="text-muted-foreground">Tópicos que precisam de mais atenção com base no seu desempenho.</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {!isLoading && (!weakTopics || weakTopics.length === 0) && (
        <Card className="glass border-dashed">
          <CardContent className="p-12 text-center">
            <TrendingDown className="mx-auto mb-4 h-12 w-12 text-muted-foreground/75" />
            <p className="text-muted-foreground">Nenhum ponto fraco identificado ainda. Resolva mais questões para gerar análise.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {weakTopics?.map((wt) => {
          const sev = severityConfig[wt.severity ?? "low"];
          return (
            <Card key={wt.id} className="glass">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{(wt as any).topics?.name ?? "Tópico"}</h3>
                    <p className="text-sm text-muted-foreground">{(wt as any).subjects?.name ?? ""}</p>
                  </div>
                  <Badge className={sev.color}>
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {sev.label}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Acurácia</span>
                    <span className="font-mono">{Number(wt.accuracy_rate).toFixed(0)}%</span>
                  </div>
                  <Progress value={Number(wt.accuracy_rate)} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {wt.incorrect_attempts}/{wt.total_attempts} erros
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default WeakTopics;

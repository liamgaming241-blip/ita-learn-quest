import { motion } from "framer-motion";
import { useSubjects } from "@/hooks/useSubjects";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";

const Subjects = () => {
  const { data: subjects, isLoading } = useSubjects();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!subjects?.length) {
    return (
      <Card className="surface-elevated border-dashed border-2 border-border/60">
        <CardContent className="p-12 text-center space-y-3">
          <BookOpen className="mx-auto h-10 w-10 text-accent" />
          <p className="text-muted-foreground">
            O conteúdo ainda está sendo sincronizado pelo administrador. Volte em breve.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s: any) => (
        <Card key={s.id} className="surface hover:border-accent/40 hover:shadow-elegant transition-all">
          <CardContent className="p-5 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Matéria</p>
            <h3 className="font-display font-extrabold text-lg">{s.name}</h3>
            <p className="text-xs text-muted-foreground">
              {Array.isArray(s.topics) ? s.topics[0]?.count ?? 0 : 0} tópicos
            </p>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
};

export default Subjects;
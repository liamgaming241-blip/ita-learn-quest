import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useYouTubeVideos, YouTubeVideo } from "@/hooks/useYouTubeVideos";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, AlertTriangle, Play, ArrowLeft } from "lucide-react";

const Subjects = () => {
  const { data: videos, isLoading, error } = useYouTubeVideos();
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="surface border-destructive/30">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive/60" />
          <p className="text-muted-foreground">Erro ao carregar vídeos. Tente novamente mais tarde.</p>
        </CardContent>
      </Card>
    );
  }

  if (!videos?.length) {
    return (
      <Card className="surface-elevated border-dashed border-2 border-border/60">
        <CardContent className="p-12 text-center">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center"
          >
            <Video className="h-6 w-6 text-accent" />
          </motion.div>
          <p className="text-muted-foreground">
            Nenhum vídeo encontrado. Adicione links do YouTube na planilha "Links".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {activeVideo ? (
        <motion.div
          key="player"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <button
            onClick={() => setActiveVideo(null)}
            className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Voltar à lista
          </button>
          <h2 className="font-display font-extrabold text-xl truncate">{activeVideo.title}</h2>
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-border/70 bg-black shadow-elegant">
            <iframe
              src={`${activeVideo.embedUrl}?autoplay=1&rel=0`}
              title={activeVideo.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            <span className="font-display font-bold text-foreground tabular-nums">{videos.length}</span> vídeo{videos.length !== 1 ? "s" : ""} disponíve{videos.length !== 1 ? "is" : "l"}
          </p>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {videos.map((video, index) => (
              <motion.div
                key={video.id + "-" + index}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
                }}
                whileHover={{ y: -4 }}
                onClick={() => setActiveVideo(video)}
              >
                <Card className="surface group cursor-pointer overflow-hidden border-border/60 hover:border-accent/40 hover:shadow-elegant h-full">
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    <img
                      src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                      alt={video.title}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        whileHover={{ scale: 1 }}
                        className="opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-75 transition-all duration-300 h-14 w-14 rounded-full bg-accent flex items-center justify-center shadow-gold"
                      >
                        <Play className="h-5 w-5 text-accent-foreground ml-0.5" fill="currentColor" />
                      </motion.div>
                    </div>
                  </div>
                  <CardContent className="p-3.5">
                    <p className="font-semibold text-sm line-clamp-2 leading-snug group-hover:text-accent transition-colors">{video.title}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Subjects;
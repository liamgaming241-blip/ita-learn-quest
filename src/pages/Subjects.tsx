import { useState } from "react";
import { useYouTubeVideos, YouTubeVideo } from "@/hooks/useYouTubeVideos";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, AlertTriangle, Play } from "lucide-react";

const Subjects = () => {
  const { data: videos, isLoading, error } = useYouTubeVideos();
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Aulas</h1>
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
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Aulas</h1>
        <Card className="glass border-destructive/30">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive/60" />
            <p className="text-muted-foreground">Erro ao carregar vídeos. Tente novamente mais tarde.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!videos?.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Aulas</h1>
        <Card className="glass border-dashed">
          <CardContent className="p-12 text-center">
            <Video className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Nenhum vídeo encontrado. Adicione links do YouTube na planilha "Links".
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Full-width player when a video is selected
  if (activeVideo) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveVideo(null)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar à lista
        </button>
        <h1 className="text-xl font-bold truncate">{activeVideo.title}</h1>
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
          <iframe
            src={`${activeVideo.embedUrl}?autoplay=1&rel=0`}
            title={activeVideo.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Aulas</h1>
      <p className="text-sm text-muted-foreground">
        {videos.length} vídeo{videos.length !== 1 ? "s" : ""} disponíve{videos.length !== 1 ? "is" : "l"}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video, index) => (
          <Card
            key={video.id + "-" + index}
            className="glass group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]"
            onClick={() => setActiveVideo(video)}
          >
            <div className="relative aspect-video bg-muted">
              <img
                src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                alt={video.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center">
                  <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                </div>
              </div>
            </div>
            <CardContent className="p-3">
              <p className="font-medium text-sm line-clamp-2">{video.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Subjects;

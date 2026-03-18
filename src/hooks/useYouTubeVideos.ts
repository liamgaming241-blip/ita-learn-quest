import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface YouTubeVideo {
  id: string;
  title: string;
  embedUrl: string;
}

export const useYouTubeVideos = () => {
  return useQuery({
    queryKey: ["youtube-videos"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-videos");
      if (error) throw error;
      return (data?.videos ?? []) as YouTubeVideo[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

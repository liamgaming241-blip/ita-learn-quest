import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useSubjects = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*, topics(count)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useTopics = (subjectId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["topics", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("*, subtopics(count)")
        .eq("subject_id", subjectId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!subjectId && !!user,
  });
};

export const useSubtopics = (topicId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subtopics", topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtopics")
        .select("*, lessons(count)")
        .eq("topic_id", topicId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!topicId && !!user,
  });
};

export const useLessons = (subtopicId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lessons", subtopicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("subtopic_id", subtopicId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!subtopicId && !!user,
  });
};

export const useQuestions = (filters?: { subjectId?: string; topicId?: string }) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["questions", filters],
    queryFn: async () => {
      let query = supabase
        .from("questions")
        .select("*, subjects(name), topics(name)");
      if (filters?.subjectId) query = query.eq("subject_id", filters.subjectId);
      if (filters?.topicId) query = query.eq("topic_id", filters.topicId);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useSimulados = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["simulados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulados")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useWeakTopics = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weak_topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weak_topics")
        .select("*, topics(name), subjects(name)")
        .eq("user_id", user!.id)
        .order("severity", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useUserProgress = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useIndexingJobs = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["indexing_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("indexing_jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

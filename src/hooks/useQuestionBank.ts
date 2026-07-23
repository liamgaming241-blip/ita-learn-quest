import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type QbFilters = {
  q?: string;
  institution?: string;
  year?: number | null;
  subjectId?: string;
  topicId?: string;
  subtopicId?: string;
  difficulty?: string;
  status?: "favorites" | "bookmarks" | "answered" | "correct" | "incorrect" | "never" | "review";
  tags?: string[];
  page?: number;
  pageSize?: number;
};

export const INSTITUTIONS = [
  "ITA", "IME", "AFA", "EsPCEx", "EPCAR", "ENEM", "FUVEST", "UNICAMP",
] as const;

// List questions with filters (server-side)
export const useQbQuestions = (filters: QbFilters = {}) => {
  const { user } = useAuth();
  const pageSize = filters.pageSize ?? 25;
  const page = filters.page ?? 0;
  return useQuery({
    queryKey: ["qb", "questions", filters],
    enabled: !!user,
    queryFn: async () => {
      // For status filters that require user state, fetch state IDs first
      let allowIds: string[] | null = null;
      if (filters.status && user) {
        const stateQ = supabase.from("question_user_state").select("question_id, is_favorite, is_bookmarked, status, attempts, correct").eq("user_id", user.id);
        const { data } = await stateQ;
        const rows = (data ?? []) as any[];
        if (filters.status === "favorites") allowIds = rows.filter(r => r.is_favorite).map(r => r.question_id);
        else if (filters.status === "bookmarks") allowIds = rows.filter(r => r.is_bookmarked).map(r => r.question_id);
        else if (filters.status === "answered") allowIds = rows.filter(r => r.attempts > 0).map(r => r.question_id);
        else if (filters.status === "correct") allowIds = rows.filter(r => r.correct > 0).map(r => r.question_id);
        else if (filters.status === "incorrect") allowIds = rows.filter(r => r.status === "incorrect_recent" || (r.attempts > r.correct)).map(r => r.question_id);
        else if (filters.status === "review") allowIds = rows.filter(r => r.status === "review" || r.status === "incorrect_recent").map(r => r.question_id);
        else if (filters.status === "never") {
          const answered = new Set(rows.filter(r => r.attempts > 0).map(r => r.question_id));
          // We can't do a NOT IN cleanly with server; we'll query and filter client-side. Use a big page.
          const { data: qs, count } = await supabase.from("questions").select("*", { count: "exact" })
            .eq("status", "published")
            .range(page * pageSize, page * pageSize + pageSize * 4);
          const filtered = ((qs ?? []) as any[]).filter(q => !answered.has(q.id)).slice(0, pageSize);
          return { rows: filtered, count: (count ?? 0) - answered.size };
        }
        if (allowIds && allowIds.length === 0) return { rows: [], count: 0 };
      }

      let query = supabase.from("questions").select("*, subjects(name), topics(name), subtopics(name)", { count: "exact" })
        .eq("status", "published");
      if (allowIds) query = query.in("id", allowIds);
      if (filters.institution) query = query.eq("institution", filters.institution);
      if (filters.year) query = query.eq("year", filters.year);
      if (filters.subjectId) query = query.eq("subject_id", filters.subjectId);
      if (filters.topicId) query = query.eq("topic_id", filters.topicId);
      if (filters.subtopicId) query = query.eq("subtopic_id", filters.subtopicId);
      if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
      if (filters.tags && filters.tags.length) query = query.contains("tags", filters.tags);
      if (filters.q && filters.q.trim()) {
        // Use ilike as a broad fallback + or across title/question_text/source
        const term = `%${filters.q.trim()}%`;
        query = query.or(`title.ilike.${term},question_text.ilike.${term},source.ilike.${term}`);
      }
      query = query.order("year", { ascending: false, nullsFirst: false })
        .order("question_number", { ascending: true, nullsFirst: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as any[], count: count ?? 0 };
    },
  });
};

export const useQbQuestion = (id?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["qb", "question", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("questions")
        .select("*, subjects(name), topics(name), subtopics(name, topic_id)")
        .eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};

export const useQbUserState = (questionId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["qb", "state", questionId, user?.id],
    enabled: !!user && !!questionId,
    queryFn: async () => {
      const { data } = await supabase.from("question_user_state").select("*")
        .eq("user_id", user!.id).eq("question_id", questionId!).maybeSingle();
      return data;
    },
  });
};

export const useRecordAttempt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { question_id: string; selected: string; time_spent?: number; mode?: "learning" | "exam"; exam_session_id?: string }) => {
      const { data, error } = await supabase.rpc("record_question_attempt", {
        _question_id: input.question_id,
        _selected: input.selected,
        _time_spent: input.time_spent ?? 0,
        _mode: input.mode ?? "learning",
        _exam_session_id: input.exam_session_id ?? null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["qb", "state", v.question_id] });
      qc.invalidateQueries({ queryKey: ["qb", "stats"] });
      qc.invalidateQueries({ queryKey: ["qb", "attempts"] });
    },
  });
};

export const useToggleFlag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { question_id: string; flag: "favorite" | "bookmark" | "review" }) => {
      const { data, error } = await supabase.rpc("toggle_question_flag", { _question_id: input.question_id, _flag: input.flag });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["qb", "state", v.question_id] }),
  });
};

// Past exams catalog: distinct institution+year with counts
export const useExamCatalog = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["qb", "exam_catalog"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("questions")
        .select("institution, year, phase")
        .eq("status", "published")
        .not("institution", "is", null)
        .not("year", "is", null)
        .limit(5000);
      if (error) throw error;
      const map = new Map<string, { institution: string; year: number; phase: string | null; count: number }>();
      for (const r of (data ?? []) as any[]) {
        const key = `${r.institution}|${r.year}|${r.phase ?? ""}`;
        const cur = map.get(key);
        if (cur) cur.count++; else map.set(key, { institution: r.institution, year: r.year, phase: r.phase, count: 1 });
      }
      return Array.from(map.values()).sort((a, b) => (b.year - a.year) || a.institution.localeCompare(b.institution));
    },
  });
};

export const useExamSessions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["qb", "sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("exam_sessions").select("*")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50);
      return (data ?? []) as any[];
    },
  });
};

export const useStartExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { institution: string; year: number; phase?: string | null; mode?: "exam" | "learning" }) => {
      const { data, error } = await supabase.rpc("start_exam_session", {
        _institution: input.institution,
        _year: input.year,
        _phase: input.phase ?? null,
        _mode: input.mode ?? "exam",
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qb", "sessions"] }),
  });
};

export const useSubmitExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { session_id: string; answers: Record<string, string> }) => {
      const { data, error } = await supabase.rpc("submit_exam_session", { _session_id: input.session_id, _answers: input.answers });
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qb", "sessions"] });
      qc.invalidateQueries({ queryKey: ["qb", "stats"] });
    },
  });
};

// Aggregated personal stats
export const useQbStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["qb", "stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: attempts }, { data: state }] = await Promise.all([
        supabase.from("question_attempts").select("id, question_id, is_correct, time_spent_seconds, mode, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(2000),
        supabase.from("question_user_state").select("question_id, status, attempts, correct, is_favorite, is_bookmarked").eq("user_id", user!.id),
      ]);
      const A = (attempts ?? []) as any[];
      const S = (state ?? []) as any[];
      const total = A.length;
      const correct = A.filter(a => a.is_correct).length;
      const accuracy = total ? Math.round((correct / total) * 100) : 0;
      const avgTime = total ? Math.round(A.reduce((s, a) => s + (a.time_spent_seconds || 0), 0) / total) : 0;
      // per-day heatmap for last 90 days
      const byDay = new Map<string, number>();
      const now = Date.now();
      for (const a of A) {
        const d = new Date(a.created_at); const key = d.toISOString().slice(0, 10);
        byDay.set(key, (byDay.get(key) ?? 0) + 1);
      }
      const days: { date: string; count: number }[] = [];
      for (let i = 89; i >= 0; i--) {
        const d = new Date(now - i * 86400000); const key = d.toISOString().slice(0, 10);
        days.push({ date: key, count: byDay.get(key) ?? 0 });
      }
      // streak
      let streak = 0;
      for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].count > 0) streak++; else break;
      }
      const mastered = S.filter(s => s.status === "mastered").length;
      const review = S.filter(s => s.status === "incorrect_recent" || s.status === "review").length;
      const favorites = S.filter(s => s.is_favorite).length;
      return { total, correct, accuracy, avgTime, days, streak, mastered, review, favorites, attempts: A, state: S };
    },
  });
};

export const useAttemptsForQuestion = (questionId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["qb", "attempts", questionId, user?.id],
    enabled: !!user && !!questionId,
    queryFn: async () => {
      const { data } = await supabase.from("question_attempts").select("*")
        .eq("user_id", user!.id).eq("question_id", questionId!).order("created_at", { ascending: false }).limit(20);
      return (data ?? []) as any[];
    },
  });
};

export const useReportQuestion = () => {
  return useMutation({
    mutationFn: async (input: { question_id: string; reason: string; details?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("not signed in");
      const { error } = await supabase.from("question_reports").insert({
        user_id: userRes.user.id,
        question_id: input.question_id,
        reason: input.reason,
        details: input.details ?? null,
      });
      if (error) throw error;
    },
  });
};

export const useAdminImportQuestions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: any[]) => {
      const { data, error } = await supabase.rpc("admin_import_questions", { _rows: rows as any });
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qb", "questions"] });
      qc.invalidateQueries({ queryKey: ["qb", "exam_catalog"] });
    },
  });
};

// Recommendations: due for review + weakest subtopics
export const useQbRecommendations = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["qb", "recommendations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data: due } = await supabase.from("question_user_state")
        .select("question_id, next_review_at, status")
        .eq("user_id", user!.id)
        .lte("next_review_at", nowIso)
        .in("status", ["incorrect_recent", "review", "learning"])
        .limit(10);
      const ids = (due ?? []).map((d: any) => d.question_id);
      let review: any[] = [];
      if (ids.length) {
        const { data } = await supabase.from("questions")
          .select("id, title, question_text, institution, year, difficulty, subjects(name), subtopics(name)")
          .in("id", ids);
        review = (data ?? []) as any[];
      }
      return { review };
    },
  });
};
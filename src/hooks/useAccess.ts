import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AccessInfo {
  authenticated: boolean;
  is_admin: boolean;
  has_access: boolean;
  license_status: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
}

export const useAccess = () => {
  const { user } = useAuth();
  return useQuery<AccessInfo>({
    queryKey: ["access", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_access");
      if (error) throw error;
      return (data as unknown as AccessInfo) ?? {
        authenticated: false, is_admin: false, has_access: false,
        license_status: null, subscription_status: null, current_period_end: null,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
};

export const useIsAdmin = () => {
  const { data } = useAccess();
  return !!data?.is_admin;
};
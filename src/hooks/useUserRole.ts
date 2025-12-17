import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type UserRole = "admin" | "driver";

interface UseUserRoleReturn {
  role: UserRole | null;
  isAdmin: boolean;
  isDriver: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useUserRole = (): UseUserRoleReturn => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async () => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole("driver"); // Default to driver
      } else {
        setRole((data?.role as UserRole) || "driver");
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
      setRole("driver");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();
  }, [user]);

  return {
    role,
    isAdmin: role === "admin",
    isDriver: role === "driver",
    loading,
    refetch: fetchRole,
  };
};

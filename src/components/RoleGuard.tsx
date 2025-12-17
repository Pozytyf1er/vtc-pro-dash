import { ReactNode } from "react";
import { useUserRole, UserRole } from "@/hooks/useUserRole";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

export const RoleGuard = ({ children, allowedRoles, fallback }: RoleGuardProps) => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AdminOnly = ({ children, fallback }: AdminOnlyProps) => (
  <RoleGuard allowedRoles={["admin"]} fallback={fallback}>
    {children}
  </RoleGuard>
);

interface DriverOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const DriverOnly = ({ children, fallback }: DriverOnlyProps) => (
  <RoleGuard allowedRoles={["driver"]} fallback={fallback}>
    {children}
  </RoleGuard>
);

import { useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { getClientProfileId } from "@/lib/profile-id";

export function ProfileGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!pathname.startsWith("/profiles") && !getClientProfileId()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: "/profiles" as any, replace: true });
    }
  }, [pathname, navigate]);

  return <>{children}</>;
}

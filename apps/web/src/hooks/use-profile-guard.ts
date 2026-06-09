import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getClientProfileId } from "@/lib/profile-id";

export function useProfileGuard() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!getClientProfileId()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: "/profiles" as any, replace: true });
    }
  }, [navigate]);
}

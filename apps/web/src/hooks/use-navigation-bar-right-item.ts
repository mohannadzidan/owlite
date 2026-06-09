import { useEffect, useId, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { useNavigationBarStore } from "@/lib/navigation-bar-store";

export function useNavigationBarRightItem(node: ReactNode) {
  const id = useId();
  const register = useNavigationBarStore((s) => s.register);
  const unregister = useNavigationBarStore((s) => s.unregister);

  // Keep the store in sync with the current node on every render
  useLayoutEffect(() => {
    register(id, node);
  });

  // Remove on unmount
  useEffect(() => {
    return () => unregister(id);
  }, [id, unregister]);
}

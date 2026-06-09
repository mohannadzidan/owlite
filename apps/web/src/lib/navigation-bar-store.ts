import { create } from "zustand";
import type { ReactNode } from "react";

interface NavigationBarState {
  items: Map<string, ReactNode>;
  register: (id: string, node: ReactNode) => void;
  unregister: (id: string) => void;
}

export const useNavigationBarStore = create<NavigationBarState>((set) => ({
  items: new Map(),
  register: (id, node) =>
    set((s) => {
      const next = new Map(s.items);
      next.set(id, node);
      return { items: next };
    }),
  unregister: (id) =>
    set((s) => {
      const next = new Map(s.items);
      next.delete(id);
      return { items: next };
    }),
}));

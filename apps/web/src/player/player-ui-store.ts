import { create } from "zustand";

export type ToastIconType =
  | "play"
  | "pause"
  | "skipForward"
  | "skipBackward"
  | "subtitleDelay"
  | "subtitleFont"
  | "buffering"
  | "subtitles"
  | "nextEpisode";

export interface PlayerToast {
  key: number;
  iconType: ToastIconType;
  message: string;
  persistent?: boolean;
}

interface PlayerUIState {
  controlsVisible: boolean;
  setControlsVisible: (v: boolean) => void;
  toast: PlayerToast | null;
  showToast: (iconType: ToastIconType, message: string, persistent?: boolean) => void;
  dismissToast: () => void;
}

let _toastKey = 0;

export const usePlayerUIStore = create<PlayerUIState>((set) => ({
  controlsVisible: false,
  setControlsVisible: (v) => set({ controlsVisible: v }),
  toast: null,
  showToast: (iconType, message, persistent) =>
    set({ toast: { key: ++_toastKey, iconType, message, persistent } }),
  dismissToast: () => set({ toast: null }),
}));

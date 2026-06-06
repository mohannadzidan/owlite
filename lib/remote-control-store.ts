import { create } from "zustand";

export type PairingStatus = "connecting" | "connected" | "offline";

export type ConnectionType = "lan" | "relay" | "internet";

export interface PairingRecord {
  pairId: string;
  role: "initiator" | "acceptor";
  peerDeviceId: string;
  peerDeviceName: string;
  status: PairingStatus;
  peerScreenWidth?: number;
  peerScreenHeight?: number;
  latencyMs?: number;
  connectionType?: ConnectionType;
}

interface RemoteControlStore {
  ready: boolean;
  myDeviceId: string;
  pairings: PairingRecord[];
  pendingSessionCode: string | null;
  cursorActive: boolean;

  setReady: (deviceId: string, pairings: PairingRecord[]) => void;
  addPairing: (pairing: PairingRecord) => void;
  removePairing: (pairId: string) => void;
  setPairingStatus: (pairId: string, status: PairingStatus) => void;
  setPairingScreenSize: (pairId: string, screenWidth: number, screenHeight: number) => void;
  setPairingStats: (
    pairId: string,
    stats: { latencyMs?: number; connectionType?: ConnectionType },
  ) => void;
  setPendingSessionCode: (code: string | null) => void;
  setCursorActive: (active: boolean) => void;
}

export const useRemoteControlStore = create<RemoteControlStore>((set) => ({
  ready: false,
  myDeviceId: "",
  pairings: [],
  pendingSessionCode: null,
  cursorActive: false,

  setReady: (deviceId, pairings) => set({ ready: true, myDeviceId: deviceId, pairings }),

  addPairing: (pairing) =>
    set((s) => ({
      pairings: s.pairings.some((p) => p.pairId === pairing.pairId)
        ? s.pairings
        : [...s.pairings, pairing],
    })),

  removePairing: (pairId) =>
    set((s) => ({ pairings: s.pairings.filter((p) => p.pairId !== pairId) })),

  setPairingStatus: (pairId, status) =>
    set((s) => ({
      pairings: s.pairings.map((p) => (p.pairId === pairId ? { ...p, status } : p)),
    })),

  setPairingScreenSize: (pairId, screenWidth, screenHeight) =>
    set((s) => ({
      pairings: s.pairings.map((p) =>
        p.pairId === pairId
          ? { ...p, peerScreenWidth: screenWidth, peerScreenHeight: screenHeight }
          : p,
      ),
    })),

  setPairingStats: (pairId, stats) =>
    set((s) => ({
      pairings: s.pairings.map((p) => (p.pairId === pairId ? { ...p, ...stats } : p)),
    })),

  setPendingSessionCode: (code) => set({ pendingSessionCode: code }),
  setCursorActive: (active) => set({ cursorActive: active }),
}));

export function getPairingStatus(pairId: string): PairingStatus | undefined {
  return useRemoteControlStore.getState().pairings.find((p) => p.pairId === pairId)?.status;
}

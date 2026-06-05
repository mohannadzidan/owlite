import { create } from "zustand";

export type PairingStatus = "connecting" | "connected" | "offline";

export interface PairingRecord {
  pairId: string;
  role: "initiator" | "acceptor";
  peerDeviceId: string;
  peerDeviceName: string;
  status: PairingStatus;
}

interface RemoteControlStore {
  ready: boolean;
  myDeviceId: string;
  pairings: PairingRecord[];
  pendingSessionCode: string | null;

  setReady: (deviceId: string, pairings: PairingRecord[]) => void;
  addPairing: (pairing: PairingRecord) => void;
  removePairing: (pairId: string) => void;
  setPairingStatus: (pairId: string, status: PairingStatus) => void;
  setPendingSessionCode: (code: string | null) => void;
}

export const useRemoteControlStore = create<RemoteControlStore>((set) => ({
  ready: false,
  myDeviceId: "",
  pairings: [],
  pendingSessionCode: null,

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

  setPendingSessionCode: (code) => set({ pendingSessionCode: code }),
}));

export function getPairingStatus(pairId: string): PairingStatus | undefined {
  return useRemoteControlStore.getState().pairings.find((p) => p.pairId === pairId)?.status;
}

const STORAGE_KEY = "owlite_remote_pairings";

export interface StoredPairing {
  pairId: string;
  role: "initiator" | "acceptor";
  peerDeviceId: string;
  peerDeviceName: string;
  createdAt: number;
}

export function getPairings(): StoredPairing[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPairing[]) : [];
  } catch {
    return [];
  }
}

export function addPairing(pairing: StoredPairing): void {
  const existing = getPairings().filter((p) => p.pairId !== pairing.pairId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, pairing]));
}

export function removePairing(pairId: string): void {
  const updated = getPairings().filter((p) => p.pairId !== pairId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

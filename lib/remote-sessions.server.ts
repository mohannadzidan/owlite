const SESSION_TTL_MS = 10 * 60 * 1000;
const ONLINE_THRESHOLD_MS = 90_000;

type SignalData = object;

// ── Pairing sessions (ephemeral: code → session) ─────────────────────────────

interface PairingSession {
  acceptorDeviceId: string;
  acceptorName: string;
  expiresAt: number;
  paired?: { pairId: string; initiatorDeviceId: string; initiatorName: string };
}

const pairingSessions = new Map<string, PairingSession>();

export function createPairingSession(code: string, acceptorDeviceId: string, acceptorName: string) {
  pairingSessions.set(code, {
    acceptorDeviceId,
    acceptorName,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

export function getPairingSession(code: string): PairingSession | null {
  const session = pairingSessions.get(code);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    pairingSessions.delete(code);
    return null;
  }
  return session;
}

export function acceptPairingSession(
  code: string,
  pairId: string,
  initiatorDeviceId: string,
  initiatorName: string,
) {
  const session = pairingSessions.get(code);
  if (!session) return;
  session.paired = { pairId, initiatorDeviceId, initiatorName };
}

// ── Device presence (heartbeat-based) ────────────────────────────────────────

const devicePresence = new Map<string, { lastSeen: number }>();

export function registerHeartbeat(deviceId: string) {
  devicePresence.set(deviceId, { lastSeen: Date.now() });
}

export function isDeviceOnline(deviceId: string): boolean {
  const entry = devicePresence.get(deviceId);
  if (!entry) return false;
  return Date.now() - entry.lastSeen < ONLINE_THRESHOLD_MS;
}

// ── Per-pair signal queues ────────────────────────────────────────────────────

const pairSignals = new Map<string, SignalData[]>();

function signalKey(pairId: string, from: "initiator" | "acceptor") {
  return `${pairId}:${from}`;
}

export function pushPairSignal(pairId: string, from: "initiator" | "acceptor", data: SignalData) {
  const key = signalKey(pairId, from);
  const queue = pairSignals.get(key) ?? [];
  queue.push(data);
  pairSignals.set(key, queue);
}

export function drainPairSignals(pairId: string, from: "initiator" | "acceptor"): SignalData[] {
  const key = signalKey(pairId, from);
  const queue = pairSignals.get(key) ?? [];
  pairSignals.set(key, []);
  return queue;
}

// ── Code generation ───────────────────────────────────────────────────────────

export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

"use client";

import { getDeviceId, getDeviceName } from "@/lib/device-identity";
import {
  addPairing,
  getPairings,
  removePairing as removePairingFromStorage,
  type StoredPairing,
} from "@/lib/pairings-storage";
import {
  getPairingStatus,
  type ConnectionType,
  type PairingRecord,
  type PairingStatus,
  useRemoteControlStore,
} from "@/lib/remote-control-store";
import type { RemoteMessage } from "@/lib/remote-messages";
import { remoteControlService } from "@/services/remote-control.service";
import type SimplePeer from "simple-peer";

interface ManagedPeer {
  peer: SimplePeer.Instance;
  pollInterval: ReturnType<typeof setInterval>;
}

function toRecord(status: PairingStatus) {
  return (p: StoredPairing): PairingRecord => ({
    pairId: p.pairId,
    role: p.role,
    peerDeviceId: p.peerDeviceId,
    peerDeviceName: p.peerDeviceName,
    status,
  });
}

type CandidateStats = { candidateType?: string; address?: string; ip?: string } | undefined;

// Chrome obfuscates local IPs as mDNS .local names; treat those and "host" type as local.
function isLocalCandidate(c: CandidateStats): boolean {
  if (!c) return false;
  if (c.candidateType === "host") return true;
  const addr = c.address ?? c.ip ?? "";
  return (
    addr.endsWith(".local") ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|::1$|fd[0-9a-f]{2}:)/i.test(addr)
  );
}

async function detectConnectionType(peer: SimplePeer.Instance): Promise<ConnectionType> {
  const pc = (peer as unknown as { _pc?: RTCPeerConnection })._pc;
  if (!pc) return "internet";

  try {
    const stats = await pc.getStats();
    let result: ConnectionType = "internet";

    stats.forEach((report) => {
      if (report.type !== "candidate-pair") return;
      const pair = report as unknown as {
        state?: string;
        localCandidateId: string;
        remoteCandidateId: string;
      };
      // "succeeded" means the connectivity check passed — this is the active pair.
      // "nominated" is only set once ICE reaches "completed", not just "connected".
      if (pair.state !== "succeeded") return;

      const local = stats.get(pair.localCandidateId) as CandidateStats;
      const remote = stats.get(pair.remoteCandidateId) as CandidateStats;

      if (local?.candidateType === "relay" || remote?.candidateType === "relay") {
        result = "relay";
      } else if (isLocalCandidate(local) && isLocalCandidate(remote)) {
        result = "lan";
      }
    });

    return result;
  } catch {
    return "internet";
  }
}

class ConnectionManager {
  private initialized = false;
  private peers = new Map<string, ManagedPeer>();
  private presencePolls = new Map<string, ReturnType<typeof setInterval>>();
  private pingIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private messageHandler: ((pairId: string, msg: RemoteMessage) => void) | null = null;

  setMessageHandler(handler: (pairId: string, msg: RemoteMessage) => void) {
    this.messageHandler = handler;
  }

  clearMessageHandler() {
    this.messageHandler = null;
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;

    const deviceId = getDeviceId();
    remoteControlService.sendHeartbeat(deviceId);
    setInterval(() => remoteControlService.sendHeartbeat(deviceId), 30_000);

    const stored = getPairings();
    useRemoteControlStore.getState().setReady(deviceId, stored.map(toRecord("offline")));

    for (const p of stored) {
      this.watchPeer(p);
    }
  }

  async createSession(): Promise<string> {
    const { code } = await remoteControlService.createSession(getDeviceId(), getDeviceName());
    useRemoteControlStore.getState().setPendingSessionCode(code);

    const poll = setInterval(async () => {
      const result = await remoteControlService.pollSession(code);
      if (!result.paired) return;
      clearInterval(poll);

      const p: StoredPairing = {
        pairId: result.pairId,
        role: "acceptor",
        peerDeviceId: result.initiatorDeviceId,
        peerDeviceName: result.initiatorName,
        createdAt: Date.now(),
      };
      addPairing(p);
      useRemoteControlStore.getState().setPendingSessionCode(null);
      useRemoteControlStore.getState().addPairing(toRecord("connecting")(p));
      this.watchPeer(p);
      this.connectPeer(p);
    }, 1_000);

    return code;
  }

  async acceptSession(code: string): Promise<void> {
    const result = await remoteControlService.acceptSession(code, getDeviceId(), getDeviceName());

    const p: StoredPairing = {
      pairId: result.pairId,
      role: "initiator",
      peerDeviceId: result.acceptorDeviceId,
      peerDeviceName: result.acceptorName,
      createdAt: Date.now(),
    };
    addPairing(p);
    useRemoteControlStore.getState().addPairing(toRecord("connecting")(p));
    this.watchPeer(p);
    this.connectPeer(p);
  }

  private watchPeer(p: StoredPairing) {
    if (this.presencePolls.has(p.pairId)) return;

    const interval = setInterval(async () => {
      const online = await remoteControlService.checkPresence(p.peerDeviceId).catch(() => false);
      const currentStatus = getPairingStatus(p.pairId);

      if (online && currentStatus === "offline") {
        this.connectPeer(p);
      }
      if (!online && currentStatus === "connected") {
        this.teardownPeer(p.pairId);
        useRemoteControlStore.getState().setPairingStatus(p.pairId, "offline");
      }
    }, 5_000);

    this.presencePolls.set(p.pairId, interval);
  }

  private connectPeer(p: StoredPairing) {
    this.teardownPeer(p.pairId);
    useRemoteControlStore.getState().setPairingStatus(p.pairId, "connecting");

    const isInitiator = p.role === "initiator";
    const from = isInitiator ? "initiator" : ("acceptor" as const);
    const pollFrom = isInitiator ? "acceptor" : ("initiator" as const);

    import("simple-peer").then(({ default: SimplePeerLib }) => {
      if (!this.initialized) return;

      const peer = new SimplePeerLib({ initiator: isInitiator, trickle: true });

      peer.on("signal", (data) => {
        remoteControlService.sendPairSignal(p.pairId, from, data as object);
      });

      peer.on("connect", () => {
        clearInterval(pollInterval);
        useRemoteControlStore.getState().setPairingStatus(p.pairId, "connected");

        if (!isInitiator && typeof window !== "undefined") {
          // Acceptor (TV) sends its viewport dimensions so the initiator can map trackpad coords
          peer.send(
            JSON.stringify({
              type: "handshake",
              screenWidth: window.innerWidth,
              screenHeight: window.innerHeight,
            }),
          );
        }

        if (isInitiator) {
          // Start pinging every 2s to measure RTT
          const pingInterval = setInterval(() => {
            if (!peer.destroyed) {
              peer.send(JSON.stringify({ type: "ping", sentAt: Date.now() }));
            }
          }, 2_000);
          this.pingIntervals.set(p.pairId, pingInterval);

          // Detect connection type once ICE has settled
          setTimeout(() => {
            detectConnectionType(peer).then((connectionType) => {
              useRemoteControlStore.getState().setPairingStats(p.pairId, { connectionType });
            });
          }, 1_000);
        }
      });

      peer.on("close", () => {
        clearInterval(pollInterval);
        useRemoteControlStore.getState().setPairingStatus(p.pairId, "offline");
      });

      peer.on("error", () => {
        // Connection errors surface via the close event
      });

      peer.on("data", (data: Uint8Array) => {
        try {
          const msg = JSON.parse(data.toString()) as RemoteMessage;

          if (msg.type === "handshake") {
            useRemoteControlStore
              .getState()
              .setPairingScreenSize(p.pairId, msg.screenWidth, msg.screenHeight);
          } else if (msg.type === "ping") {
            // Echo back so the initiator can measure RTT
            peer.send(JSON.stringify({ type: "pong", sentAt: msg.sentAt }));
          } else if (msg.type === "pong") {
            const latencyMs = Date.now() - msg.sentAt;
            useRemoteControlStore.getState().setPairingStats(p.pairId, { latencyMs });
          } else {
            this.messageHandler?.(p.pairId, msg);
          }
        } catch {
          // ignore malformed messages
        }
      });

      const pollInterval = setInterval(() => {
        remoteControlService.drainPairSignals(p.pairId, pollFrom).then((signals) => {
          for (const s of signals) {
            if (!peer.destroyed) peer.signal(s as SimplePeer.SignalData);
          }
        });
      }, 500);

      this.peers.set(p.pairId, { peer, pollInterval });
    });
  }

  private teardownPeer(pairId: string) {
    const existing = this.peers.get(pairId);
    if (!existing) return;
    clearInterval(existing.pollInterval);
    existing.peer.destroy();
    this.peers.delete(pairId);

    const pingInterval = this.pingIntervals.get(pairId);
    if (pingInterval) {
      clearInterval(pingInterval);
      this.pingIntervals.delete(pairId);
    }
  }

  sendRemoteMessage(pairId: string, msg: RemoteMessage) {
    this.peers.get(pairId)?.peer.send(JSON.stringify(msg));
  }

  async removePairing(pairId: string) {
    this.teardownPeer(pairId);
    const poll = this.presencePolls.get(pairId);
    if (poll) {
      clearInterval(poll);
      this.presencePolls.delete(pairId);
    }
    removePairingFromStorage(pairId);
    useRemoteControlStore.getState().removePairing(pairId);
    await remoteControlService.removePairing(pairId);
  }
}

export const connectionManager = new ConnectionManager();

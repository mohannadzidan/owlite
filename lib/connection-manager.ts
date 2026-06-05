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
  type PairingRecord,
  type PairingStatus,
  useRemoteControlStore,
} from "@/lib/remote-control-store";
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

class ConnectionManager {
  private initialized = false;
  private peers = new Map<string, ManagedPeer>();
  private presencePolls = new Map<string, ReturnType<typeof setInterval>>();

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
      });

      peer.on("close", () => {
        clearInterval(pollInterval);
        useRemoteControlStore.getState().setPairingStatus(p.pairId, "offline");
      });

      peer.on("error", () => {
        // Connection errors surface via the close event
      });

      peer.on("data", (data: Uint8Array) => {
        window.alert(data.toString());
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
  }

  sendMessage(pairId: string, message: string) {
    this.peers.get(pairId)?.peer.send(message);
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

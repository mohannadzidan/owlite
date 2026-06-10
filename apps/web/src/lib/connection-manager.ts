import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@owlite/types";
import { getDeviceId, getDeviceName } from "@/lib/device-identity";
import {
  addPairing,
  getPairings,
  removePairing as removePairingFromStorage,
  type StoredPairing,
} from "@/lib/pairings-storage";
import type { RemoteMessage } from "@/lib/remote-messages";
import {
  useRemoteControlStore,
  type PairingRecord,
  type PairingStatus,
} from "@/lib/remote-control-store";

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
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private initialized = false;
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
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      import.meta.env.VITE_API_URL,
      {
        path: "/api/v1/socket.io",
      },
    );
    this.socket = socket;

    socket.on("connect", () => {
      this.registerDevice();
    });

    socket.on("disconnect", () => {
      // All peers are considered offline until reconnect re-registers and server confirms
      const { pairings, setPairingStatus, setPendingSessionCode } =
        useRemoteControlStore.getState();
      for (const p of pairings) {
        if (p.status !== "offline") setPairingStatus(p.pairId, "offline");
        this.stopPing(p.pairId);
      }
      // Server-side session code is lost on disconnect
      setPendingSessionCode(null);
    });

    // TV (acceptor) receives this when a remote (initiator) joins their session code
    socket.on("session_accepted", ({ pairId, initiatorDeviceId, initiatorName }) => {
      const p: StoredPairing = {
        pairId,
        role: "acceptor",
        peerDeviceId: initiatorDeviceId,
        peerDeviceName: initiatorName,
        createdAt: Date.now(),
      };
      addPairing(p);
      useRemoteControlStore.getState().setPendingSessionCode(null);
      useRemoteControlStore.getState().addPairing(toRecord("connected")(p));
      if (typeof window !== "undefined") {
        this.sendRemoteMessage(pairId, {
          type: "handshake",
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
        });
      }
    });

    socket.on("peer_online", ({ pairId }) => {
      useRemoteControlStore.getState().setPairingStatus(pairId, "connected");
      const stored = getPairings().find((p) => p.pairId === pairId);
      if (stored?.role === "initiator") {
        this.startPing(pairId);
      } else if (stored?.role === "acceptor" && typeof window !== "undefined") {
        // Re-send screen dimensions whenever the initiator reconnects
        this.sendRemoteMessage(pairId, {
          type: "handshake",
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
        });
      }
    });

    socket.on("peer_offline", ({ pairId }) => {
      useRemoteControlStore.getState().setPairingStatus(pairId, "offline");
      this.stopPing(pairId);
    });

    socket.on("remote_message", ({ pairId, msg }) => {
      this.handleMessage(pairId, msg);
    });

    const stored = getPairings();
    useRemoteControlStore.getState().setReady(getDeviceId(), stored.map(toRecord("offline")));
  }

  private registerDevice() {
    const stored = getPairings();
    this.socket?.emit("register", {
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      pairings: stored.map(({ pairId, peerDeviceId }) => ({ pairId, peerDeviceId })),
    });
  }

  private handleMessage(pairId: string, msg: RemoteMessage) {
    if (msg.type === "handshake") {
      useRemoteControlStore
        .getState()
        .setPairingScreenSize(pairId, msg.screenWidth, msg.screenHeight);
    } else if (msg.type === "ping") {
      this.sendRemoteMessage(pairId, { type: "pong", sentAt: msg.sentAt });
    } else if (msg.type === "pong") {
      useRemoteControlStore
        .getState()
        .setPairingStats(pairId, { latencyMs: Date.now() - msg.sentAt });
    } else {
      this.messageHandler?.(pairId, msg);
    }
  }

  private startPing(pairId: string) {
    this.stopPing(pairId);
    const interval = setInterval(() => {
      this.sendRemoteMessage(pairId, { type: "ping", sentAt: Date.now() });
    }, 2_000);
    this.pingIntervals.set(pairId, interval);
  }

  private stopPing(pairId: string) {
    const interval = this.pingIntervals.get(pairId);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(pairId);
    }
  }

  async createSession(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error("socket not initialized"));
      this.socket.emit("create_session", (res) => {
        if ("error" in res) reject(new Error(res.error));
        else {
          useRemoteControlStore.getState().setPendingSessionCode(res.code);
          resolve(res.code);
        }
      });
    });
  }

  async acceptSession(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error("socket not initialized"));
      this.socket.emit(
        "accept_session",
        { code, deviceId: getDeviceId(), deviceName: getDeviceName() },
        (res) => {
          if ("error" in res) {
            reject(new Error(res.error));
            return;
          }
          const p: StoredPairing = {
            pairId: res.pairId,
            role: "initiator",
            peerDeviceId: res.acceptorDeviceId,
            peerDeviceName: res.acceptorName,
            createdAt: Date.now(),
          };
          addPairing(p);
          useRemoteControlStore.getState().addPairing(toRecord("connected")(p));
          this.startPing(p.pairId);
          resolve();
        },
      );
    });
  }

  sendRemoteMessage(pairId: string, msg: RemoteMessage) {
    this.socket?.emit("remote_message", { pairId, msg });
  }

  async removePairing(pairId: string) {
    this.stopPing(pairId);
    this.socket?.emit("remove_pairing", { pairId });
    removePairingFromStorage(pairId);
    useRemoteControlStore.getState().removePairing(pairId);
  }
}

export const connectionManager = new ConnectionManager();

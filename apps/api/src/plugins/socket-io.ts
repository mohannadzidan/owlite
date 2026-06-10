import { randomUUID } from "crypto";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import type { Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@owlite/types";
import { generateCode } from "../utils";

const SESSION_TTL_MS = 10 * 60 * 1000;

const deviceSockets = new Map<string, string>();
const deviceNames = new Map<string, string>();
const devicePairings = new Map<string, Map<string, string>>();
const sessions = new Map<
  string,
  { acceptorDeviceId: string; acceptorName: string; expiresAt: number }
>();

export default fp(async function socketIoPlugin(server: FastifyInstance) {
  server.io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    let myDeviceId: string | null = null;

    socket.on("register", ({ deviceId, deviceName, pairings }) => {
      myDeviceId = deviceId;
      deviceSockets.set(deviceId, socket.id);
      deviceNames.set(deviceId, deviceName);

      const myPairings = new Map<string, string>(
        pairings.map(({ pairId, peerDeviceId }) => [pairId, peerDeviceId]),
      );
      devicePairings.set(deviceId, myPairings);

      for (const { pairId, peerDeviceId } of pairings) {
        if (deviceSockets.has(peerDeviceId)) {
          socket.emit("peer_online", { pairId });
        }
        const peerSocketId = deviceSockets.get(peerDeviceId);
        if (peerSocketId && devicePairings.get(peerDeviceId)?.get(pairId) === deviceId) {
          server.io.to(peerSocketId).emit("peer_online", { pairId });
        }
      }
    });

    socket.on("create_session", (callback) => {
      if (!myDeviceId) return callback({ error: "not registered" });
      const code = generateCode();
      sessions.set(code, {
        acceptorDeviceId: myDeviceId,
        acceptorName: deviceNames.get(myDeviceId) ?? "Unknown",
        expiresAt: Date.now() + SESSION_TTL_MS,
      });
      callback({ code });
    });

    socket.on("accept_session", ({ code, deviceId, deviceName }, callback) => {
      const session = sessions.get(code);
      if (!session || Date.now() > session.expiresAt) {
        return callback({ error: "invalid or expired code" });
      }
      sessions.delete(code);

      const pairId = randomUUID();
      const { acceptorDeviceId, acceptorName } = session;

      const initiatorPairings = devicePairings.get(deviceId) ?? new Map<string, string>();
      initiatorPairings.set(pairId, acceptorDeviceId);
      devicePairings.set(deviceId, initiatorPairings);

      const acceptorPairings = devicePairings.get(acceptorDeviceId) ?? new Map<string, string>();
      acceptorPairings.set(pairId, deviceId);
      devicePairings.set(acceptorDeviceId, acceptorPairings);

      const acceptorSocketId = deviceSockets.get(acceptorDeviceId);
      if (acceptorSocketId) {
        server.io.to(acceptorSocketId).emit("session_accepted", {
          pairId,
          initiatorDeviceId: deviceId,
          initiatorName: deviceName,
        });
      }

      callback({ pairId, acceptorDeviceId, acceptorName });
    });

    socket.on("remote_message", ({ pairId, msg }) => {
      if (!myDeviceId) return;
      const peerDeviceId = devicePairings.get(myDeviceId)?.get(pairId);
      if (!peerDeviceId) return;
      const peerSocketId = deviceSockets.get(peerDeviceId);
      if (peerSocketId) {
        server.io.to(peerSocketId).emit("remote_message", { pairId, msg });
      }
    });

    socket.on("remove_pairing", ({ pairId }) => {
      if (!myDeviceId) return;
      const peerDeviceId = devicePairings.get(myDeviceId)?.get(pairId);
      devicePairings.get(myDeviceId)?.delete(pairId);
      if (peerDeviceId) {
        devicePairings.get(peerDeviceId)?.delete(pairId);
      }
    });

    socket.on("disconnect", () => {
      if (!myDeviceId) return;
      deviceSockets.delete(myDeviceId);
      const myPairings = devicePairings.get(myDeviceId);
      if (myPairings) {
        for (const [pairId, peerDeviceId] of myPairings) {
          const peerSocketId = deviceSockets.get(peerDeviceId);
          if (peerSocketId) {
            server.io.to(peerSocketId).emit("peer_offline", { pairId });
          }
        }
      }
    });
  });
});

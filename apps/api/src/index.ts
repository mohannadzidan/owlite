import { randomUUID } from "crypto";
import fastify from "fastify";
import fastifyIO from "fastify-socket.io";
import type { Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@owlite/types";
import { generateCode } from "./utils";

const SESSION_TTL_MS = 10 * 60 * 1000;

// deviceId → current socket id
const deviceSockets = new Map<string, string>();
// deviceId → display name
const deviceNames = new Map<string, string>();
// deviceId → Map<pairId, peerDeviceId>  — rebuilt from register payloads and accept_session
const devicePairings = new Map<string, Map<string, string>>();
// pairing code → session data
const sessions = new Map<string, { acceptorDeviceId: string; acceptorName: string; expiresAt: number }>();

const server = fastify({ logger: true });

server.register(fastifyIO, {
  path: "/api/socket.io",
  cors: { origin: "*" },
});

server.listen({ port: 8080, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

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
        // Tell this device which peers are already online
        if (deviceSockets.has(peerDeviceId)) {
          socket.emit("peer_online", { pairId });
        }
        // Tell online peers that this device came back online
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

      // Register pairing on initiator side
      const initiatorPairings = devicePairings.get(deviceId) ?? new Map<string, string>();
      initiatorPairings.set(pairId, acceptorDeviceId);
      devicePairings.set(deviceId, initiatorPairings);

      // Register pairing on acceptor side
      const acceptorPairings = devicePairings.get(acceptorDeviceId) ?? new Map<string, string>();
      acceptorPairings.set(pairId, deviceId);
      devicePairings.set(acceptorDeviceId, acceptorPairings);

      // Notify the TV (acceptor) that the remote (initiator) joined
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

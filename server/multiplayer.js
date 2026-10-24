import { createDungeons } from "./dungeons.js";
import { classId } from "../src/dungeon-rules.js";
import { createVoiceHub } from "./voice.js";
import { sharedGameTime } from "../src/schedule.js";
import { appearance } from "../src/wardrobe.js";
import {
  VEHICLE_TYPES,
  DEFAULT_VEHICLE,
  vehiclePaint,
} from "../src/vehicle-catalog.js";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import {
  createGuest,
  stepGuest,
  guestAction,
  nickname,
} from "../src/open-world.js";

export function createMultiplayer(httpServer) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 16384,
    perMessageDeflate: false,
  });
  const clients = new Map();
  let tick = 0;
  const send = (ws, data) => {
    if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 65536)
      ws.send(JSON.stringify(data));
  };
  const voice = createVoiceHub(clients, send);
  const dungeons = createDungeons({
    players: () =>
      [...clients.values()].flatMap((c) => (c.player ? [c.player] : [])),
    emit: (player, data) => {
      const entry = [...clients.entries()].find(([, c]) => c.player === player);
      if (entry) {
        if (data.type === "dungeon-player" && data.result) {
          entry[1].keys.clear();
          entry[1].commands = [];
          entry[1].sequence = entry[1].receivedSequence;
        }
        send(entry[0], data);
      }
    },
  });
  const snapshot = (client) => ({
    type: "state",
    time: Date.now(),
    gameTime: sharedGameTime(),
    acknowledged: client?.sequence,
    onlineCount: [...clients.values()].filter((c) => c.player).length,
    players: [...clients.values()]
      .filter(
        (c) =>
          c.player &&
          (!client?.player ||
            (c.player.dungeonId || null) === (client.player.dungeonId || null)),
      )
      .map((c) => c.player),
    dungeon: dungeons.snapshot(client?.player),
  });
  function upgrade(request, socket, head) {
    if (request.url?.split("?")[0] !== "/multiplayer") return;
    let sameOrigin = false;
    try {
      sameOrigin =
        !request.headers.origin ||
        new URL(request.headers.origin).host === request.headers.host;
    } catch {}
    if (!sameOrigin) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    if (wss.clients.size >= 20) {
      socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) =>
      wss.emit("connection", ws),
    );
  }
  httpServer.on("upgrade", upgrade);
  wss.on("connection", (ws) => {
    const client = {
      player: null,
      keys: new Set(),
      lastInput: Date.now(),
      lastAction: 0,
      window: Date.now(),
      messages: 0,
      alive: true,
      sequence: 0,
      receivedSequence: 0,
      commands: [],
      commandMode: false,
      credit: 0,
      steppedAt: Date.now(),
    };
    clients.set(ws, client);
    const joinTimeout = setTimeout(() => {
      if (!client.player) ws.close(1008, "Join timeout");
    }, 25000);
    ws.on("pong", () => {
      client.alive = true;
    });
    ws.on("message", (raw) => {
      const now = Date.now();
      if (now - client.window > 1000) {
        client.window = now;
        client.messages = 0;
      }
      if (++client.messages > (client.voice ? 180 : 80)) {
        ws.close(1008, "Too many messages");
        return;
      }
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        ws.close(1008, "Invalid message");
        return;
      }
      if (!message || typeof message !== "object") return;
      if (message.type === "join") {
        if (client.player) return;
        const name = nickname(message.nickname);
        if (name.length < 2) {
          send(ws, {
            type: "error",
            message: "Use a nickname with 2–20 characters.",
          });
          return;
        }
        const peers = [...clients.values()].filter((c) => c.player);
        if (peers.length >= 16) {
          send(ws, {
            type: "error",
            message: "The town is full (16 guests). Try again later.",
          });
          ws.close(1008, "Town full");
          return;
        }
        client.player = createGuest(
          randomUUID(),
          name,
          peers.length,
          message.appearance,
        );
        client.player.preferredVehicle = VEHICLE_TYPES.includes(
          message.vehicleType,
        )
          ? message.vehicleType
          : DEFAULT_VEHICLE;
        client.player.combatClass = classId(message.combatClass);
        client.player.preferredPaint = vehiclePaint(message.vehiclePaint);
        clearTimeout(joinTimeout);
        send(ws, {
          type: "welcome",
          gameTime: sharedGameTime(),
          id: client.player.id,
          player: client.player,
        });
        send(ws, snapshot());
        return;
      }
      if (!client.player) return;
      if (message.type === "dungeon") {
        if (["enter", "leave", "class"].includes(message.action)) {
          client.keys.clear();
          client.commands = [];
          client.sequence = client.receivedSequence;
        }
        const error = dungeons.action(client.player, message);
        if (error) send(ws, { type: "error", message: error });
        return;
      }
      if (voice.handle(ws, client, message)) return;
      if (message.type === "ping" && Number.isFinite(message.sent)) {
        send(ws, { type: "pong", sent: message.sent });
        return;
      }
      if (message.type === "command") {
        const sequence = message.sequence;
        if (
          !Number.isSafeInteger(sequence) ||
          sequence <= client.receivedSequence ||
          sequence > client.receivedSequence + 120 ||
          !Array.isArray(message.keys) ||
          client.commands.length >= 90
        )
          return;
        const allowed = new Set([
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          " ",
          "shift",
          "b",
        ]);
        client.commandMode = true;
        client.receivedSequence = sequence;
        client.lastInput = now;
        client.commands.push({
          sequence,
          cameraYaw: Number.isFinite(message.cameraYaw)
            ? message.cameraYaw % (Math.PI * 2)
            : 0,
          keys: new Set(
            message.keys.filter((key) => allowed.has(key)).slice(0, 11),
          ),
        });
        return;
      }
      if (message.type === "customize") {
        if (client.player.dungeonId) return;
        if (now - client.lastAction <= 250) {
          send(ws, {
            type: "error",
            message: "Please wait a moment, then save your look again.",
          });
          return;
        }
        client.keys.clear();
        client.commands = [];
        client.sequence = client.receivedSequence;
        client.lastAction = now;
        client.player.appearance = appearance(message.appearance);
        if (VEHICLE_TYPES.includes(message.vehicleType))
          client.player.preferredVehicle = message.vehicleType;
        client.player.preferredPaint = vehiclePaint(message.vehiclePaint);
        if (client.player.vehicle)
          client.player.vehicle.paint = client.player.preferredPaint;
        send(ws, { type: "customized", player: client.player });
        return;
      }
      if (message.type === "paint") {
        client.player.preferredPaint = vehiclePaint(message.vehiclePaint);
        if (client.player.vehicle)
          client.player.vehicle.paint = client.player.preferredPaint;
        send(ws, { type: "painted", player: client.player });
        return;
      }
      if (message.type === "input" && Array.isArray(message.keys)) {
        const allowed = new Set([
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          " ",
          "shift",
          "b",
        ]);
        client.keys = new Set(
          message.keys.filter((k) => allowed.has(k)).slice(0, 11),
        );
        client.lastInput = now;
      } else if (message.type === "action" && now - client.lastAction > 250) {
        client.lastAction = now;
        client.keys.clear();
        client.commands = [];
        client.sequence = client.receivedSequence;
        const occupied = [...clients.values()]
          .filter((c) => c.player && c.player !== client.player)
          .flatMap((c) => [
            ...(c.player.vehicle ? [c.player.vehicle] : []),
            ...(c.player.benchId ? [c.player] : []),
          ]);
        const error = guestAction(
          client.player,
          message.action,
          message.vehicleType,
          occupied,
          message.vehiclePaint ?? client.player.preferredPaint,
        );
        if (error) send(ws, { type: "error", message: error });
        else
          send(ws, {
            type: "action",
            action: message.action,
            player: client.player,
          });
      }
    });
    ws.on("close", () => {
      clearTimeout(joinTimeout);
      clients.delete(ws);
    });
    ws.on("error", () => {});
  });
  const interval = setInterval(() => {
    for (const c of clients.values())
      if (c.player) {
        const now = Date.now();
        if (c.commandMode) {
          c.credit = Math.min(0.5, c.credit + (now - c.steppedAt) / 1000);
          c.steppedAt = now;
          let steps = 0;
          while (c.commands.length && c.credit >= 1 / 30 && steps++ < 6) {
            const command = c.commands.shift();
            stepGuest(c.player, command.keys, 1 / 30, command.cameraYaw);
            c.sequence = command.sequence;
            c.credit -= 1 / 30;
          }
        } else {
          c.steppedAt = now;
          if (now - c.lastInput > 350) c.keys.clear();
          stepGuest(c.player, c.keys, 1 / 30);
        }
      }
    dungeons.tick(1 / 30);
    if (tick % 9 === 0) voice.tick();
    if (++tick % 3 === 0) {
      for (const [ws, c] of clients)
        if (c.player && ws.bufferedAmount < 8192) send(ws, snapshot(c));
    }
  }, 1000 / 30);
  const heartbeat = setInterval(() => {
    for (const [ws, c] of clients) {
      if (!c.alive) {
        ws.terminate();
        continue;
      }
      c.alive = false;
      ws.ping();
    }
  }, 15000);
  return {
    close() {
      clearInterval(interval);
      clearInterval(heartbeat);
      httpServer.off("upgrade", upgrade);
      for (const ws of clients.keys()) ws.terminate();
      wss.close();
    },
    snapshot,
  };
}

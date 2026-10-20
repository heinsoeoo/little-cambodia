import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { WebSocket } from "ws";
import { createMultiplayer } from "../server/multiplayer.js";

function waitMessage(ws, predicate, timeout = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Expected multiplayer message not received"));
    }, timeout);
    function cleanup() {
      clearTimeout(timer);
      ws.off("message", read);
    }
    function read(raw) {
      const data = JSON.parse(raw);
      if (predicate(data)) {
        cleanup();
        resolve(data);
      }
    }
    ws.on("message", read);
  });
}
async function client(url, name, options = {}) {
  const ws = new WebSocket(url);
  await once(ws, "open");
  const welcome = waitMessage(ws, (m) => m.type === "welcome");
  ws.send(JSON.stringify({ type: "join", nickname: name, ...options }));
  const joined = await welcome;
  return { ws, id: joined.id };
}

test("real WebSocket guests share presence, movement and summoned vehicles, then leave cleanly", async (t) => {
  const server = createServer(),
    hub = createMultiplayer(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `ws://127.0.0.1:${server.address().port}/multiplayer`;
  let a, b;
  t.after(async () => {
    a?.ws.terminate();
    b?.ws.terminate();
    hub.close();
    await new Promise((resolve) => server.close(resolve));
  });
  a = await client(url, "Sok Guest");
  b = await client(url, "Dara Guest");
  const both = await waitMessage(
    a.ws,
    (m) => m.type === "state" && m.players.length === 2,
  );
  assert.ok(
    both.players.some((p) => p.id === b.id && p.nickname === "Dara Guest"),
  );
  const initial = both.players.find((p) => p.id === a.id);
  a.ws.send(
    JSON.stringify({ type: "input", keys: ["w"], x: 999999, z: 999999 }),
  );
  const moved = await waitMessage(
    b.ws,
    (m) =>
      m.type === "state" &&
      m.players.some((p) => p.id === a.id && p.z < initial.z - 0.3),
  );
  assert.equal(moved.players.find((p) => p.id === a.id).x, initial.x);
  const summoned = waitMessage(
    b.ws,
    (m) =>
      m.type === "state" &&
      m.players.some((p) => p.id === a.id && p.vehicle?.type === "tuktuk"),
  );
  a.ws.send(
    JSON.stringify({ type: "action", action: "summon", vehicleType: "tuktuk" }),
  );
  assert.ok((await summoned).players.find((p) => p.id === a.id).vehicle);
  const left = waitMessage(
    a.ws,
    (m) => m.type === "state" && m.players.length === 1,
  );
  b.ws.close();
  assert.equal((await left).players[0].id, a.id);
});

test("cross-origin websocket connections are rejected", async (t) => {
  const server = createServer(),
    hub = createMultiplayer(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    hub.close();
    await new Promise((resolve) => server.close(resolve));
  });
  const ws = new WebSocket(
    `ws://127.0.0.1:${server.address().port}/multiplayer`,
    { origin: "https://unrelated.example" },
  );
  const [error] = await once(ws, "error");
  assert.match(error.message, /403/);
});

test("mixed appearance is validated on join and later wardrobe changes reach another guest", async (t) => {
  const server = createServer(),
    hub = createMultiplayer(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `ws://127.0.0.1:${server.address().port}/multiplayer`;
  let a, b;
  t.after(async () => {
    a?.ws.terminate();
    b?.ws.terminate();
    hub.close();
    await new Promise((resolve) => server.close(resolve));
  });
  const look = {
    gender: "female",
    skin: "tan",
    cut: "auto",
    top: "casual",
    bottom: "street",
    hair: "punk",
    shoes: "old-money",
  };
  a = await client(url, "Styled Guest", {
    appearance: look,
    vehicleType: "celica",
  });
  b = await client(url, "Observer");
  const state = await waitMessage(
    b.ws,
    (m) => m.type === "state" && m.players.some((p) => p.id === a.id),
  );
  const player = state.players.find((p) => p.id === a.id);
  assert.deepEqual(player.appearance, look);
  assert.equal(player.preferredVehicle, "celica");
  const changed = waitMessage(
    b.ws,
    (m) =>
      m.type === "state" &&
      m.players.some((p) => p.id === a.id && p.appearance.top === "luxury"),
  );
  a.ws.send(
    JSON.stringify({
      type: "customize",
      appearance: { ...look, top: "luxury", shoes: "workwear", cut: "unisex" },
      vehicleType: "pajero",
      x: 99999,
    }),
  );
  const updated = (await changed).players.find((p) => p.id === a.id);
  assert.equal(updated.appearance.cut, "unisex");
  assert.equal(updated.appearance.bottom, "street");
  assert.equal(updated.appearance.hair, "punk");
  assert.equal(updated.appearance.shoes, "workwear");
  assert.equal(updated.preferredVehicle, "pajero");
  assert.equal(updated.x, player.x);
});

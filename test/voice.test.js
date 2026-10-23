import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { voiceVolume, withinVoiceRange } from "../src/voice-range.js";
import { createVoiceHub, voiceIceServers } from "../server/voice.js";

test("voices fade smoothly and are silent at the range boundary", () => {
  assert.equal(voiceVolume(0), 1);
  assert.equal(voiceVolume(5), 1);
  assert.ok(voiceVolume(10) > voiceVolume(25));
  assert.equal(voiceVolume(40), 0);
  assert.equal(voiceVolume(60), 0);
  assert.equal(voiceVolume(NaN), 0);
  assert.equal(withinVoiceRange({ x: 0, z: 0 }, { x: 24, z: 32 }), false);
});
test("voice signaling is opt-in, range-limited and cannot spoof sender identity", () => {
  const a = { player: { id: "a", x: 0, z: 0 } },
    b = { player: { id: "b", x: 10, z: 0 } };
  const clients = new Map([
      ["socket-a", a],
      ["socket-b", b],
    ]),
    sent = [];
  const hub = createVoiceHub(clients, (ws, message) =>
    sent.push({ ws, ...message }),
  );
  const signal = {
    type: "voice-signal",
    to: "b",
    from: "spoof",
    signal: { description: { type: "offer", sdp: "v=0" } },
  };
  hub.handle("socket-a", a, signal);
  assert.equal(sent.length, 0);
  hub.handle("socket-a", a, { type: "voice-toggle", enabled: true });
  hub.handle("socket-b", b, { type: "voice-toggle", enabled: true });
  assert.ok(sent.some((m) => m.ws === "socket-b" && m.ids?.includes("a")));
  sent.length = 0;
  hub.handle("socket-a", a, signal);
  assert.equal(sent[0].ws, "socket-b");
  assert.equal(sent[0].from, "a");
  b.player.x = 41;
  sent.length = 0;
  hub.handle("socket-a", a, signal);
  assert.equal(sent.length, 0);
  hub.tick();
  assert.ok(sent.every((m) => m.ids.length === 0));
  b.player.x = 10;
  sent.length = 0;
  hub.handle("socket-b", b, { type: "voice-toggle", enabled: false });
  sent.length = 0;
  hub.handle("socket-a", a, signal);
  assert.equal(sent.length, 0);
  hub.handle("socket-a", a, {
    ...signal,
    signal: { description: { type: "offer", sdp: "x".repeat(13000) } },
  });
  assert.equal(sent.length, 0);
});
test("TURN credentials expire and do not disclose the server shared secret", () => {
  const servers = voiceIceServers("guest", {
    VOICE_TURN_HOST: "relay.example",
    VOICE_TURN_SECRET: "test-secret",
  });
  const relay = servers[1];
  assert.ok(Number(relay.username.split(":")[0]) > Date.now() / 1000);
  assert.equal(
    relay.credential,
    createHmac("sha1", "test-secret").update(relay.username).digest("base64"),
  );
  assert.ok(!JSON.stringify(servers).includes("test-secret"));
});

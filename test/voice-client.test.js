import { test } from "node:test";
import assert from "node:assert/strict";
import { createVoiceChat } from "../src/voice-chat.js";

test("voice is off until requested, fades incoming audio and releases mic on separation or exit", async (t) => {
  const originals = new Map(
    ["document", "window", "navigator", "RTCPeerConnection"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  t.after(() => {
    for (const [key, value] of originals) {
      if (value) Object.defineProperty(globalThis, key, value);
      else delete globalThis[key];
    }
  });
  const handlers = {},
    attrs = {},
    messages = [],
    pcs = [],
    gains = [];
  let captures = 0,
    stops = 0,
    closed = 0;
  const track = {
      stop() {
        stops++;
      },
    },
    stream = { getAudioTracks: () => [track], getTracks: () => [track] };
  class Context {
    currentTime = 0;
    destination = {};
    async resume() {}
    async close() {
      closed++;
    }
    createMediaStreamSource() {
      return {
        connect() {
          return this;
        },
        disconnect() {},
      };
    }
    createGain() {
      const node = {
        gain: {
          value: 0,
          setTargetAtTime(value) {
            this.value = value;
          },
        },
        connect() {
          return this;
        },
        disconnect() {},
      };
      gains.push(node);
      return node;
    }
  }
  class Peer {
    constructor() {
      pcs.push(this);
    }
    addTrack() {}
    async createOffer() {
      return { type: "offer", sdp: "v=0" };
    }
    async setLocalDescription(value) {
      this.localDescription = value;
    }
    async setRemoteDescription(value) {
      this.remoteDescription = value;
    }
    async addIceCandidate() {}
    close() {
      this.closed = true;
    }
  }
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      hidden: false,
      addEventListener: (name, handler) => (handlers[name] = handler),
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { AudioContext: Context },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        async getUserMedia() {
          captures++;
          return stream;
        },
      },
    },
  });
  Object.defineProperty(globalThis, "RTCPeerConnection", {
    configurable: true,
    value: Peer,
  });
  const button = { setAttribute: (key, value) => (attrs[key] = value) };
  const voice = createVoiceChat({
    network: { id: "a", send: (m) => messages.push(m) },
    button,
    notify() {},
  });
  assert.equal(captures, 0);
  assert.equal(attrs["aria-pressed"], "false");
  await button.onclick();
  assert.equal(captures, 1);
  assert.equal(attrs["aria-pressed"], "true");
  voice.event({ type: "voice-config", iceServers: [] });
  voice.event({ type: "voice-peers", ids: ["b"] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pcs.length, 1);
  assert.ok(messages.some((m) => m.signal?.description?.type === "offer"));
  pcs[0].ontrack({ track: { kind: "audio" }, streams: [stream] });
  voice.update({ x: 0, z: 0 }, [{ id: "b", x: 5, z: 0 }], true);
  assert.equal(gains[0].gain.value, 1);
  voice.update({ x: 0, z: 0 }, [{ id: "b", x: 41, z: 0 }], true);
  assert.equal(gains[0].gain.value, 0);
  voice.event({ type: "voice-peers", ids: [] });
  assert.equal(pcs[0].closed, true);
  await button.onclick();
  assert.equal(stops, 1);
  assert.equal(closed, 1);
  assert.equal(attrs["aria-pressed"], "false");
  await button.onclick();
  document.hidden = true;
  handlers.visibilitychange();
  assert.equal(stops, 2);
  assert.equal(attrs["aria-pressed"], "false");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createAudio } from "../src/audio.js";
test("river ambience fades with distance and stops during menus or inactive play", async () => {
  const saved = Object.fromEntries(
    ["window", "document", "localStorage", "fetch"].map((k) => [
      k,
      globalThis[k],
    ]),
  );
  const handlers = {},
    gains = [];
  const node = () => ({
    connect() {
      return this;
    },
    disconnect() {},
    start() {},
    stop() {},
    frequency: { value: 0, setTargetAtTime() {} },
    gain: {
      value: 0,
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
      setTargetAtTime(v) {
        this.value = v;
      },
    },
  });
  class Context {
    state = "running";
    currentTime = 0;
    sampleRate = 1000;
    destination = {};
    createGain() {
      const n = node();
      gains.push(n.gain);
      return n;
    }
    createOscillator() {
      return node();
    }
    createBiquadFilter() {
      return node();
    }
    createBufferSource() {
      return node();
    }
    createBuffer(c, n) {
      return { getChannelData: () => new Float32Array(n) };
    }
    async resume() {}
    async suspend() {}
    async decodeAudioData() {
      return { duration: 1 };
    }
  }
  try {
    globalThis.window = { AudioContext: Context };
    globalThis.document = {
      hidden: false,
      querySelectorAll: () => [],
      addEventListener: (k, f) => (handlers[k] = f),
    };
    globalThis.localStorage = { getItem: () => null };
    globalThis.fetch = async () => ({ ok: false });
    const audio = createAudio();
    handlers.pointerdown({ target: { closest: () => false } });
    await Promise.resolve();
    await Promise.resolve();
    audio.update(0.1, { mode: "walk", speed: 0 }, new Set(), true, 1);
    const close = gains[4].value;
    assert.ok(close > 0);
    assert.ok(gains[3].value > 0);
    audio.update(0.1, { mode: "walk", speed: 0 }, new Set(), true, 0);
    assert.equal(gains[4].value, 0);
    audio.update(0.1, null, new Set(), false, 1);
    assert.equal(gains[3].value, 0);
    assert.equal(gains[4].value, 0);
  } finally {
    for (const [k, v] of Object.entries(saved))
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
  }
});

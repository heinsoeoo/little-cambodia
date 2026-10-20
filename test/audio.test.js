import { test } from "node:test";
import assert from "node:assert/strict";
import { createAudio } from "../src/audio.js";

test("song begins only on the first text card, pauses on mute, and resets on replay/skip", async () => {
  const globals = Object.fromEntries(
    ["window", "document", "localStorage", "fetch"].map((key) => [
      key,
      globalThis[key],
    ]),
  );
  const events = {},
    clicks = {},
    sources = [];
  const node = () => ({
    connect() {
      return this;
    },
    disconnect() {},
    start() {},
    stop() {},
    gain: {
      value: 0,
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
      setTargetAtTime() {},
    },
    frequency: { value: 0, setValueAtTime() {}, setTargetAtTime() {} },
  });
  class Context {
    state = "running";
    currentTime = 0;
    destination = {};
    async resume() {
      this.state = "running";
    }
    async suspend() {
      this.state = "suspended";
    }
    createGain() {
      return node();
    }
    createOscillator() {
      return node();
    }
    async decodeAudioData() {
      return { duration: 60 };
    }
    createBufferSource() {
      const source = {
        ...node(),
        stops: 0,
        start(when, offset) {
          this.offset = offset;
        },
        stop() {
          this.stops++;
        },
      };
      sources.push(source);
      return source;
    }
  }
  globalThis.window = { AudioContext: Context };
  globalThis.document = {
    hidden: false,
    querySelectorAll: () => [
      {
        setAttribute() {},
        addEventListener: (type, fn) => (clicks[type] = fn),
      },
    ],
    addEventListener: (type, fn) => (events[type] = fn),
  };
  globalThis.localStorage = {
    getItem() {
      return null;
    },
    setItem() {},
  };
  globalThis.fetch = async (url) => {
    assert.equal(url, "/audio/intro-song.mp3");
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
  };
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  try {
    const audio = createAudio();
    audio.setIntro(true);
    audio.setIntroCard(0);
    events.pointerdown({ target: { closest: () => null } });
    await flush();
    assert.equal(
      sources.length,
      0,
      "unlocking sound must not play music over the portrait",
    );
    audio.setIntroCard(1);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].offset, 0);
    assert.equal(sources[0].loop, true);
    audio.setIntroCard(2);
    assert.equal(
      sources.length,
      1,
      "language transition continues the same song",
    );
    clicks.click();
    assert.equal(sources[0].stops, 1);
    clicks.click();
    await flush();
    assert.equal(sources.length, 2);
    audio.setIntro(false);
    assert.equal(sources[1].stops, 1);
    audio.setIntro(true);
    audio.setIntroCard(0);
    assert.equal(sources.length, 2);
    audio.setIntroCard(1);
    assert.equal(sources.length, 3);
    assert.equal(sources[2].offset, 0);
    audio.setIntro(false);
    assert.equal(sources[2].stops, 1);
  } finally {
    for (const [key, value] of Object.entries(globals)) globalThis[key] = value;
  }
});

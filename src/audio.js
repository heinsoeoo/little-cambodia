// User-provided intro song plus original synthesized game effects.
export function createAudio() {
  let ctx,
    master,
    music,
    engine,
    engineGain,
    songBuffer,
    songLoading,
    songSource,
    songOffset = 0,
    songStarted = 0,
    introMusic = false,
    intro = false,
    muted = false;
  let step = 0,
    elapsed = 0,
    lastMode;
  try {
    muted = localStorage.getItem("phnom-muted") === "1";
  } catch {}
  const controls = [...document.querySelectorAll("[data-audio-toggle]")];
  function labels() {
    for (const button of controls) {
      button.textContent = muted
        ? "Sound off · Tap to enable"
        : !ctx || ctx.state !== "running"
          ? "Play sound ♫"
          : "Mute sound ♫";
      button.setAttribute(
        "aria-pressed",
        String(!muted && ctx?.state === "running"),
      );
    }
  }
  function tone(
    frequency,
    when,
    duration,
    gain = 0.08,
    target = master,
    type = "sine",
  ) {
    if (!ctx || muted || ctx.state !== "running") return;
    const oscillator = ctx.createOscillator(),
      envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(gain, when + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(envelope).connect(target);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.05);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }
  function stopSong(reset = false) {
    if (songSource) {
      songOffset = reset
        ? 0
        : (songOffset + ctx.currentTime - songStarted) % songBuffer.duration;
      songSource.stop();
      songSource.disconnect();
      songSource = null;
    }
    if (reset) songOffset = 0;
  }
  function score() {
    if (!ctx) return;
    const playing =
      intro &&
      introMusic &&
      !muted &&
      !document.hidden &&
      ctx.state === "running";
    music.gain.setTargetAtTime(playing ? 0.8 : 0, ctx.currentTime, 0.12);
    if (!playing) {
      stopSong();
      return;
    }
    if (songBuffer && !songSource) {
      songSource = ctx.createBufferSource();
      songSource.buffer = songBuffer;
      songSource.loop = true;
      songSource.connect(music);
      songStarted = ctx.currentTime;
      songSource.start(0, songOffset);
    }
  }
  async function loadSong() {
    if (songBuffer || songLoading) return;
    songLoading = true;
    try {
      const response = await fetch("/audio/intro-song.mp3");
      if (!response.ok) throw new Error("Song unavailable");
      songBuffer = await ctx.decodeAudioData(await response.arrayBuffer());
      score();
    } catch {
      /* Audio loading must never block the cinematic or gameplay. */
    } finally {
      songLoading = false;
    }
  }
  async function unlock() {
    if (muted) return;
    try {
      if (!ctx) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        ctx = new Audio();
        master = ctx.createGain();
        master.gain.value = 0.32;
        master.connect(ctx.destination);
        music = ctx.createGain();
        music.connect(master);
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        engineGain.connect(master);
        engine = ctx.createOscillator();
        engine.type = "triangle";
        engine.frequency.value = 45;
        engine.connect(engineGain);
        engine.start();
      }
      await ctx.resume();
      void loadSong();
      score();
      labels();
    } catch {
      /* A blocked audio device must never stop the game. */
    }
  }
  controls.forEach((button) =>
    button.addEventListener("click", () => {
      if (ctx?.state === "running" && !muted) muted = true;
      else muted = false;
      try {
        localStorage.setItem("phnom-muted", muted ? "1" : "0");
      } catch {}
      if (ctx)
        master.gain.setTargetAtTime(muted ? 0 : 0.32, ctx.currentTime, 0.04);
      if (!muted) void unlock();
      score();
      labels();
    }),
  );
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest("[data-audio-toggle]")) void unlock();
  });
  document.addEventListener("keydown", () => void unlock());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopSong();
      void ctx?.suspend();
    } else labels();
  });
  labels();
  return {
    setIntro(value) {
      stopSong(true);
      intro = value;
      introMusic = false;
      score();
    },
    setIntroCard(index) {
      introMusic = index >= 1;
      if (!introMusic) stopSong(true);
      score();
    },
    effect(name) {
      if (!ctx || muted) return;
      const now = ctx.currentTime;
      if (name === "summon") {
        tone(523, now, 0.3);
        tone(784, now + 0.13, 0.4);
      } else if (name === "talk") {
        tone(392, now, 0.16);
        tone(494, now + 0.12, 0.2);
      } else
        tone(name === "enter" ? 180 : 140, now, 0.18, 0.18, master, "triangle");
    },
    update(dt, player, keys, active) {
      if (!ctx) return;
      const driving =
        active &&
        player?.mode === "drive" &&
        player.vehicle?.type !== "rickshaw";
      engineGain.gain.setTargetAtTime(
        driving ? 0.12 + Math.min(Math.abs(player.speed) / 200, 0.12) : 0,
        ctx.currentTime,
        0.1,
      );
      engine.frequency.setTargetAtTime(
        42 + Math.min(Math.abs(player?.speed || 0) * 4, 130),
        ctx.currentTime,
        0.15,
      );
      elapsed += dt;
      const moving =
        active &&
        player?.mode === "walk" &&
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].some((key) => keys.has(key));
      if (moving && elapsed > 0.34) {
        elapsed = 0;
        tone(
          110 + (step++ % 2) * 25,
          ctx.currentTime,
          0.055,
          0.09,
          master,
          "triangle",
        );
      }
      const braking =
        driving &&
        Math.abs(player.speed) > 5 &&
        (keys.has("shift") || keys.has(" ") || keys.has("b"));
      if (braking && lastMode !== "brake")
        tone(700, ctx.currentTime, 0.18, 0.035, master, "sawtooth");
      lastMode = braking ? "brake" : player?.mode;
    },
  };
}

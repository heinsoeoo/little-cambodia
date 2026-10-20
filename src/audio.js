// Original synthesized score and effects: no downloads or external audio assets.
export function createAudio() {
  let ctx,
    master,
    music,
    engine,
    engineGain,
    timer,
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
  function phrase() {
    if (!ctx || !intro || muted || document.hidden || ctx.state !== "running")
      return;
    const now = ctx.currentTime + 0.03;
    const melody = [
      261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 392, 329.63, 392,
      523.25, 440, 349.23, 329.63, 293.66, 261.63,
    ];
    melody.forEach((note, i) =>
      tone(note, now + i * 0.45, 1.5, 0.13, music, "sine"),
    );
    [130.81, 146.83, 164.81, 130.81].forEach((note, i) => {
      tone(note, now + i * 1.8, 2.2, 0.09, music);
      tone(note * 1.5, now + i * 1.8, 2.1, 0.035, music);
    });
  }
  function score() {
    clearInterval(timer);
    if (!ctx) return;
    music.gain.cancelScheduledValues(ctx.currentTime);
    music.gain.setTargetAtTime(
      intro && !muted && !document.hidden ? 0.65 : 0,
      ctx.currentTime,
      0.25,
    );
    if (intro && !muted && !document.hidden) {
      phrase();
      timer = setInterval(phrase, 7200);
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
      const wasRunning = ctx.state === "running";
      await ctx.resume();
      if (!wasRunning || !timer) score();
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
      clearInterval(timer);
      void ctx?.suspend();
    } else labels();
  });
  labels();
  return {
    setIntro(value) {
      intro = value;
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

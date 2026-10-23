import { createHmac } from "node:crypto";
import { withinVoiceRange } from "../src/voice-range.js";

export function voiceIceServers(id, env = process.env) {
  const host = env.VOICE_TURN_HOST;
  if (!host || !env.VOICE_TURN_SECRET)
    return [{ urls: "stun:stun.l.google.com:19302" }];
  const username = `${Math.floor(Date.now() / 1000) + 86400}:${id}`;
  return [
    { urls: `stun:${host}:3478` },
    {
      urls: [
        `turn:${host}:3478?transport=udp`,
        `turn:${host}:3478?transport=tcp`,
      ],
      username,
      credential: createHmac("sha1", env.VOICE_TURN_SECRET)
        .update(username)
        .digest("base64"),
    },
  ];
}
export function createVoiceHub(clients, send) {
  function allowed(a, b) {
    return (
      a !== b && a?.voice && b?.voice && withinVoiceRange(a.player, b.player)
    );
  }
  return {
    handle(ws, client, message) {
      if (message.type === "voice-toggle") {
        client.voice = message.enabled === true;
        if (client.voice)
          send(ws, {
            type: "voice-config",
            iceServers: voiceIceServers(client.player.id),
          });
        send(ws, { type: "voice-peers", ids: [] });
        this.tick();
        return true;
      }
      if (message.type !== "voice-signal") return false;
      const target = [...clients.entries()].find(
        ([, c]) => c.player?.id === message.to,
      );
      if (!target || !allowed(client, target[1])) return true;
      const now = Date.now();
      if (now - (client.voiceWindow || 0) > 1000) {
        client.voiceWindow = now;
        client.voiceMessages = 0;
      }
      if ((client.voiceMessages = (client.voiceMessages || 0) + 1) > 120)
        return true;
      const signal = message.signal;
      if (!signal || typeof signal !== "object") return true;
      let clean;
      if (
        signal.description &&
        ["offer", "answer"].includes(signal.description.type) &&
        typeof signal.description.sdp === "string" &&
        signal.description.sdp.length < 12000
      ) {
        clean = {
          description: {
            type: signal.description.type,
            sdp: signal.description.sdp,
          },
        };
      } else if (
        signal.candidate &&
        typeof signal.candidate.candidate === "string" &&
        signal.candidate.candidate.length < 2000
      ) {
        clean = {
          candidate: {
            candidate: signal.candidate.candidate,
            sdpMid:
              typeof signal.candidate.sdpMid === "string"
                ? signal.candidate.sdpMid.slice(0, 32)
                : null,
            sdpMLineIndex: Number.isInteger(signal.candidate.sdpMLineIndex)
              ? signal.candidate.sdpMLineIndex
              : null,
          },
        };
      }
      if (clean)
        send(target[0], {
          type: "voice-signal",
          from: client.player.id,
          signal: clean,
        });
      return true;
    },
    tick() {
      for (const [ws, client] of clients) {
        if (!client.player || !client.voice) continue;
        const ids = [...clients.values()]
          .filter((c) => allowed(client, c))
          .map((c) => c.player.id)
          .sort();
        // Send authoritative membership regularly, including an empty list after separation.
        send(ws, { type: "voice-peers", ids });
      }
    },
  };
}

import { voiceVolume } from "./voice-range.js";
import { translate } from "./i18n.js";

export function createVoiceChat({ network, button, notify }) {
  let stream = null,
    context = null,
    enabled = false,
    generation = 0;
  let iceServers = [],
    allowed = new Set(),
    starting = false;
  const peers = new Map();
  function label(text) {
    button.setAttribute("aria-label", translate(text));
    button.title = translate(text);
    button.setAttribute("aria-pressed", String(enabled));
  }
  function close(id) {
    const peer = peers.get(id);
    if (!peer) return;
    peers.delete(id);
    peer.pc.close();
    peer.source?.disconnect();
    peer.gain?.disconnect();
  }
  function stop(announce = true) {
    generation++;
    enabled = false;
    allowed.clear();
    for (const id of peers.keys()) close(id);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    context?.close().catch(() => {});
    context = null;
    if (announce) network.send({ type: "voice-toggle", enabled: false });
    label("Turn on nearby voice chat");
  }
  function makePeer(id) {
    if (peers.has(id)) return peers.get(id);
    const pc = new RTCPeerConnection({
      iceServers,
      bundlePolicy: "max-bundle",
    });
    const peer = {
      pc,
      candidates: [],
      chain: Promise.resolve(),
      created: performance.now(),
    };
    peers.set(id, peer);
    for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && allowed.has(id))
        network.send({
          type: "voice-signal",
          to: id,
          signal: { candidate: candidate.toJSON() },
        });
    };
    pc.ontrack = ({ track, streams }) => {
      if (!context || track.kind !== "audio") return;
      peer.source?.disconnect();
      peer.gain?.disconnect();
      peer.source = context.createMediaStreamSource(
        streams[0] || new MediaStream([track]),
      );
      peer.gain = context.createGain();
      peer.gain.gain.value = 0;
      peer.source.connect(peer.gain).connect(context.destination);
    };
    return peer;
  }
  function enqueue(peer, work) {
    peer.chain = peer.chain.then(work).catch(() => {
      for (const [id, value] of peers) if (value === peer) close(id);
    });
  }
  async function toggle() {
    if (enabled) {
      stop();
      return;
    }
    if (starting || !network.id) return;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      !globalThis.RTCPeerConnection
    ) {
      notify(
        translate("Voice chat needs Safari or Chrome with microphone access."),
      );
      return;
    }
    starting = true;
    const token = ++generation;
    button.disabled = true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      await context.resume();
      const captured = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      if (token !== generation || !network.id || document.hidden) {
        captured.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = captured;
      enabled = true;
      stream.getAudioTracks()[0].onended = () => stop();
      label("Turn off nearby voice chat");
      network.send({ type: "voice-toggle", enabled: true });
      notify(translate("Voice on · nearby players within 40 m can hear you."));
    } catch {
      stop();
      notify(
        translate(
          "Microphone unavailable. Allow microphone access and try again.",
        ),
      );
    } finally {
      starting = false;
      button.disabled = false;
    }
  }
  button.onclick = toggle;
  label("Turn on nearby voice chat");
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  return {
    stop,
    event(event) {
      if (event.type === "connection" || event.type === "welcome") {
        stop(false);
        return;
      }
      if (!enabled) return;
      if (event.type === "voice-config") iceServers = event.iceServers;
      if (event.type === "voice-peers") {
        allowed = new Set(event.ids);
        for (const id of peers.keys()) if (!allowed.has(id)) close(id);
        for (const id of allowed) {
          const existing = peers.get(id);
          if (
            existing &&
            ["failed", "disconnected"].includes(existing.pc.connectionState) &&
            performance.now() - existing.created > 8000
          )
            close(id);
          if (peers.has(id) || network.id > id) continue;
          const peer = makePeer(id);
          enqueue(peer, async () => {
            await peer.pc.setLocalDescription(await peer.pc.createOffer());
            network.send({
              type: "voice-signal",
              to: id,
              signal: { description: peer.pc.localDescription },
            });
          });
        }
      }
      if (event.type === "voice-signal") {
        if (!allowed.has(event.from) || !stream) return;
        const peer = makePeer(event.from),
          signal = event.signal;
        enqueue(peer, async () => {
          if (signal.description) {
            await peer.pc.setRemoteDescription(signal.description);
            for (const candidate of peer.candidates.splice(0))
              await peer.pc.addIceCandidate(candidate);
            if (signal.description.type === "offer") {
              await peer.pc.setLocalDescription(await peer.pc.createAnswer());
              network.send({
                type: "voice-signal",
                to: event.from,
                signal: { description: peer.pc.localDescription },
              });
            }
          } else if (signal.candidate) {
            if (peer.pc.remoteDescription)
              await peer.pc.addIceCandidate(signal.candidate);
            else if (peer.candidates.length < 32)
              peer.candidates.push(signal.candidate);
          }
        });
      }
    },
    update(self, players, connected) {
      button.hidden = !self;
      if (!enabled) return;
      if (!connected || !self) {
        stop();
        return;
      }
      for (const [id, peer] of peers) {
        const remote = players.find((p) => p.id === id);
        const volume = remote
          ? voiceVolume(Math.hypot(self.x - remote.x, self.z - remote.z))
          : 0;
        peer.gain?.gain.setTargetAtTime(volume, context.currentTime, 0.08);
      }
    },
  };
}

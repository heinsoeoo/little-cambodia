export class Multiplayer {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.socket = null;
    this.id = null;
    this.players = [];
    this.closed = false;
    this.generation = 0;
    this.timer = null;
  }
  connect(name) {
    clearTimeout(this.timer);
    clearTimeout(this.joinTimer);
    this.nickname = name;
    this.closed = false;
    const generation = ++this.generation;
    if (this.socket) this.socket.close();
    const socket = new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/multiplayer`,
    );
    this.socket = socket;
    this.joinTimer = setTimeout(() => {
      if (generation === this.generation && !this.id)
        socket.close(4000, "Join timed out");
    }, 8000);
    this.onEvent({ type: "connection", status: "Connecting…" });
    socket.onopen = () => {
      if (generation === this.generation)
        socket.send(JSON.stringify({ type: "join", nickname: name }));
    };
    socket.onmessage = (event) => {
      if (generation !== this.generation) return;
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type === "welcome") {
        clearTimeout(this.joinTimer);
        this.id = data.id;
      }
      if (data.type === "state") this.players = data.players;
      this.onEvent(data);
    };
    socket.onclose = (event) => {
      if (generation !== this.generation) return;
      clearTimeout(this.joinTimer);
      this.id = null;
      this.players = [];
      this.onEvent({
        type: "connection",
        status:
          event.code === 1008
            ? "Join unavailable"
            : "Disconnected · reconnecting…",
      });
      if (!this.closed && event.code !== 1008)
        this.timer = setTimeout(() => this.connect(this.nickname), 2500);
    };
    socket.onerror = () => {};
  }
  send(data) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify(data));
  }
  input(keys) {
    this.send({ type: "input", keys: [...keys] });
  }
  action(action, vehicleType) {
    this.send({ type: "action", action, vehicleType });
  }
  disconnect() {
    this.id = null;
    this.players = [];
    clearTimeout(this.joinTimer);
    this.closed = true;
    clearTimeout(this.timer);
    this.generation++;
    this.socket?.close();
  }
}

import { stepGuest } from "./open-world.js";
export const INPUT_STEP = 1 / 30;
export class LocalPrediction {
  sequence = 0;
  pending = [];
  reset() {
    this.pending = [];
  }
  advance(player, keys, send) {
    if (this.pending.length >= 90) return false;
    const command = {
      type: "command",
      sequence: this.sequence + 1,
      keys: [...keys],
    };
    if (!send(command)) return false;
    this.sequence++;
    this.pending.push(command);
    stepGuest(player, new Set(command.keys), INPUT_STEP);
    return true;
  }
  reconcile(authoritative, acknowledged) {
    if (!Number.isSafeInteger(acknowledged))
      return structuredClone(authoritative);
    this.pending = this.pending.filter(
      (command) => command.sequence > acknowledged,
    );
    const predicted = structuredClone(authoritative);
    for (const command of this.pending)
      stepGuest(predicted, new Set(command.keys), INPUT_STEP);
    return predicted;
  }
}

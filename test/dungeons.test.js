import { test } from "node:test";
import assert from "node:assert/strict";
import { createDungeons, PORTAL } from "../server/dungeons.js";
import { CLASSES, dungeonBlocked } from "../src/dungeon-rules.js";
import { createGuest, stepGuest, guestAction } from "../src/open-world.js";
import { PORTAL_SITES } from "../src/dungeon-portal.js";
import { blocked } from "../src/open-world.js";
import { withinVoiceRange } from "../src/voice-range.js";
function setup(count = 1) {
  let clock = 100000;
  const players = Array.from({ length: count }, (_, i) => ({
    ...createGuest(String(i), "Hunter " + i),
    x: PORTAL.x,
    z: PORTAL.z,
  }));
  const events = [];
  const game = createDungeons({
    players: () => players,
    emit: (p, e) => events.push({ id: p.id, ...structuredClone(e) }),
    now: () => clock,
    sites: [PORTAL],
    random: () => 0,
  });
  return {
    players,
    events,
    game,
    advance: (ms) => (clock += ms),
    start() {
      game.action(players[0], { action: "enter" });
      clock += 30000;
      game.tick(0);
    },
  };
}
test("first entry starts exactly 30 seconds, allows four hunters, and seals against late joins", () => {
  const s = setup(6),
    p = s.players;
  s.game.action(p[0], { action: "enter" });
  assert.equal(s.game.snapshot(p[0]).portal.closesAt, 130000);
  s.advance(29999);
  for (const i of [1, 2, 3])
    assert.equal(s.game.action(p[i], { action: "enter" }), undefined);
  assert.match(s.game.action(p[4], { action: "enter" }), /full/);
  s.advance(1);
  assert.match(s.game.action(p[5], { action: "enter" }), /sealed/);
  s.game.tick(0);
  assert.equal(s.game.snapshot(p[0]).instance.phase, "fighting");
  assert.equal(s.game.snapshot(p[4]).instance, null);
});
test("class choices are validated and locked inside, while city actions cannot affect dungeon players", () => {
  const s = setup(),
    p = s.players[0];
  assert.ok(s.game.action(p, { action: "class", classId: "invalid" }));
  s.game.action(p, { action: "class", classId: "support" });
  s.game.action(p, { action: "enter" });
  assert.equal(p.combat.maxHp, CLASSES.support.hp);
  assert.match(
    s.game.action(p, { action: "class", classId: "mage" }),
    /locked/,
  );
  assert.match(guestAction(p, "summon"), /city/);
  assert.equal(p.vehicle, null);
});
test("all six classes deal damage and skills enforce cooldowns", () => {
  for (const role of Object.keys(CLASSES)) {
    const s = setup(),
      p = s.players[0];
    s.game.action(p, { action: "class", classId: role });
    s.start();
    const target = s.game.snapshot(p).instance.enemies[0];
    p.x = target.x;
    p.z = target.z + 1;
    const before = target.hp;
    s.game.action(p, { action: "attack" });
    assert.ok(target.hp < before, role);
    const after = target.hp;
    s.game.action(p, { action: "attack" });
    assert.equal(target.hp, after, "attack cooldown " + role);
    p.combat.hp -= 30;
    s.game.action(p, { action: "skill" });
    assert.ok(p.combat.skillReadyAt > 100000, role);
    if (role === "support") assert.equal(p.combat.hp, p.combat.maxHp);
    if (role === "tank") assert.ok(p.combat.guardUntil > 100000);
  }
});
test("dungeon movement respects walls, room gates, camera direction and class speeds", () => {
  const s = setup(),
    p = s.players[0];
  s.start();
  p.x = 0;
  p.z = -18.8;
  stepGuest(p, new Set(["w"]), 1, 0);
  assert.ok(p.z >= -19);
  assert.equal(dungeonBlocked(0, -30, 0), true);
  assert.equal(dungeonBlocked(0, -30, 1), false);
  p.x = 0;
  p.z = 5;
  stepGuest(p, new Set(["w"]), 0.1, Math.PI / 2);
  assert.ok(p.x < 0);
  assert.ok(Math.abs(p.z - 5) < 1e-8);
});
test("room progression, boss rewards and extraction only grant one authoritative reward", () => {
  const s = setup(),
    p = s.players[0];
  s.start();
  const raid = s.game.snapshot(p).instance;
  raid.enemies.filter((e) => e.room === 0).forEach((e) => (e.hp = 0));
  s.game.tick(0);
  assert.equal(p.dungeonStage, 1);
  raid.enemies.filter((e) => e.room === 1).forEach((e) => (e.hp = 0));
  s.game.tick(0);
  assert.equal(p.dungeonStage, 2);
  const boss = raid.enemies.find((e) => e.type === "boss");
  boss.hp = 1;
  p.x = boss.x;
  p.z = boss.z + 1;
  s.game.action(p, { action: "attack" });
  s.game.tick(0);
  assert.equal(p.riftCoins, 100);
  assert.deepEqual(p.riftEquipment, [CLASSES.fighter.weapon]);
  assert.equal(s.game.snapshot(p).instance.phase, "cleared");
  s.game.tick(0);
  assert.equal(p.riftCoins, 100);
  s.advance(60000);
  s.game.tick(0);
  assert.equal(p.dungeonId, null);
  assert.equal(p.x, PORTAL.x);
  assert.equal(s.game.snapshot().portal.phase, "cooldown");
});
test("empty and disconnected parties recover the portal and leave returns safely", () => {
  const s = setup(2),
    p = s.players[0];
  s.start();
  const entry = { ...p.returnPoint };
  s.game.action(p, { action: "leave" });
  assert.equal(p.x, entry.x);
  assert.equal(p.z, entry.z);
  assert.equal(p.combat, null);
  s.game.tick(0);
  assert.equal(s.game.snapshot().portal.phase, "cooldown");
  s.advance(15000);
  s.game.tick(0);
  assert.equal(s.game.snapshot().portal.phase, "ready");
  s.game.action(p, { action: "enter" });
  s.players.splice(0, 1);
  s.game.tick(0);
  assert.equal(s.game.snapshot().portal.phase, "cooldown");
});
test("enemy telegraphs damage hunters, defeat rescues them, dodge grants temporary protection", () => {
  const s = setup(),
    p = s.players[0];
  s.start();
  const enemy = s.game.snapshot(p).instance.enemies[0];
  p.x = enemy.x;
  p.z = enemy.z + 1;
  s.game.tick(0);
  assert.ok(enemy.windup);
  const hp = p.combat.hp;
  s.game.action(p, { action: "dodge" });
  assert.ok(p.combat.invulnerableUntil > 0);
  s.advance(850);
  p.x = enemy.windup.x;
  p.z = enemy.windup.z;
  p.combat.hp = 1;
  s.game.tick(0);
  assert.equal(p.dungeonId, null);
  assert.ok(s.events.some((e) => e.result?.includes("rescued")));
  assert.ok(hp > 1);
});
test("voice proximity never connects city and dungeon players sharing numeric coordinates", () => {
  assert.equal(
    withinVoiceRange(
      { x: 0, z: 0, dungeonId: null },
      { x: 0, z: 0, dungeonId: "rift" },
    ),
    false,
  );
  assert.equal(
    withinVoiceRange(
      { x: 0, z: 0, dungeonId: "rift" },
      { x: 0, z: 0, dungeonId: "rift" },
    ),
    true,
  );
});

test("each class can defeat the solo boss using normal movement, attacks, skills and telegraph dodges", () => {
  for (const role of Object.keys(CLASSES)) {
    const s = setup(),
      p = s.players[0];
    s.game.action(p, { action: "class", classId: role });
    s.start();
    const raid = s.game.snapshot(p).instance;
    raid.enemies.filter((e) => e.type !== "boss").forEach((e) => (e.hp = 0));
    s.game.tick(0);
    p.x = 0;
    p.z = -55;
    const boss = raid.enemies.find((e) => e.type === "boss");
    for (let frame = 0; frame < 6000 && p.dungeonId && boss.hp > 0; frame++) {
      const keys = new Set(),
        range = CLASSES[role].range;
      let dx = 0,
        dz = 0;
      if (
        boss.windup &&
        Math.hypot(p.x - boss.windup.x, p.z - boss.windup.z) <
          boss.windup.radius + 1
      ) {
        dx = p.x - boss.windup.x;
        dz = p.z - boss.windup.z;
        if (Math.hypot(dx, dz) < 0.1) dz = 1;
      } else if (Math.hypot(boss.x - p.x, boss.z - p.z) > range * 0.85) {
        dx = boss.x - p.x;
        dz = boss.z - p.z;
      }
      if (Math.abs(dx) > 0.1) keys.add(dx > 0 ? "d" : "a");
      if (Math.abs(dz) > 0.1) keys.add(dz > 0 ? "s" : "w");
      stepGuest(p, keys, 1 / 30, 0);
      if (boss.windup) s.game.action(p, { action: "dodge" });
      s.game.action(p, { action: "attack" });
      s.game.action(p, { action: "skill" });
      s.advance(1000 / 30);
      s.game.tick(1 / 30);
    }
    assert.ok(p.dungeonId, role + " should survive");
    assert.equal(boss.hp, 0, role + " can clear solo");
    assert.equal(p.riftCoins, 100);
  }
});

test("entry requires walking within four metres of the active portal", () => {
  const s = setup(),
    p = s.players[0];
  p.x = PORTAL.x + 4.01;
  assert.match(s.game.action(p, { action: "enter" }), /within 4 m/);
  p.x = PORTAL.x + 4;
  s.game.action(p, { action: "enter" });
  assert.ok(p.dungeonId);
});
test("unused portals expire and respawn at a different random site", () => {
  let clock = 1000;
  const p = { ...createGuest("test", "Test"), x: PORTAL.x, z: PORTAL.z };
  const game = createDungeons({
    players: () => [p],
    emit: () => {},
    now: () => clock,
    random: () => 0,
    sites: [PORTAL, { ...PORTAL, x: PORTAL.x + 50, siteId: "other" }],
    lifetime: 10000,
  });
  assert.equal(game.snapshot(p).portal.x, PORTAL.x);
  clock += 10000;
  assert.match(game.action(p, { action: "enter" }), /faded/);
  game.tick(0);
  assert.equal(game.snapshot(p).portal.active, false);
  clock += 20000;
  game.tick(0);
  assert.equal(game.snapshot(p).portal.x, PORTAL.x + 50);
  assert.match(game.action(p, { action: "enter" }), /within 4 m/);
});
test("an occupied portal survives its unused expiry deadline", () => {
  const s = setup();
  s.game.action(s.players[0], { action: "enter" });
  s.advance(300001);
  s.game.tick(0);
  assert.equal(s.game.snapshot(s.players[0]).portal.active, true);
  assert.equal(s.game.snapshot(s.players[0]).instance.phase, "fighting");
});

test("random portal sites have room for hunters away from buildings and water", () => {
  assert.ok(PORTAL_SITES.length >= 3);
  for (const site of PORTAL_SITES.slice(1))
    for (const [dx, dz] of [
      [0, 0],
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ])
      assert.equal(blocked(site.x + dx, site.z + dz), false, site.siteId);
});

import { CLASSES, classId, dungeonBlocked } from "../src/dungeon-rules.js";
import {
  PORTAL,
  PORTAL_SITES,
  PORTAL_ENTRY_RANGE,
  PORTAL_LIFETIME,
} from "../src/dungeon-portal.js";
export { PORTAL };
export function createDungeons({
  players,
  emit,
  now = Date.now,
  random = Math.random,
  sites = PORTAL_SITES,
  lifetime = PORTAL_LIFETIME,
}) {
  let instance = null,
    cooldownUntil = 0,
    serial = 0,
    portalSerial = 0,
    portal = null,
    lastSite = null;
  function spawnPortal() {
    const options = sites.filter((site) => site.siteId !== lastSite);
    const choices = options.length ? options : sites;
    const site =
      choices[
        Math.min(
          choices.length - 1,
          Math.max(0, Math.floor(random() * choices.length)),
        )
      ];
    portal = {
      ...site,
      id: `portal-${++portalSerial}`,
      expiresAt: now() + lifetime,
    };
    lastSite = site.siteId;
  }
  spawnPortal();
  function members() {
    return players().filter((p) => p.dungeonId === instance?.id);
  }
  function resetInput(p) {
    p.speed = 0;
    p.posture = null;
    p.benchId = null;
  }
  function leave(p, result = "Returned to Phnom Penh.") {
    if (!p.dungeonId) return;
    p.x = p.returnPoint?.x ?? PORTAL.x;
    p.z = p.returnPoint?.z ?? PORTAL.z;
    p.dungeonId = null;
    p.dungeonStage = 0;
    p.combat = null;
    delete p.returnPoint;
    resetInput(p);
    emit(p, { type: "dungeon-player", player: p, result });
  }
  function enemiesFor(count) {
    const scale = 1 + (count - 1) * 0.6;
    return [
      ...[-5, 0, 5].map((x, i) => ({
        id: `shade-${i}`,
        type: "shade",
        x,
        z: -9,
        room: 0,
        maxHp: Math.round(42 * scale),
        damage: 7,
      })),
      ...[-6, 6].map((x, i) => ({
        id: `wisp-${i}`,
        type: "wisp",
        x,
        z: -35,
        room: 1,
        maxHp: Math.round(38 * scale),
        damage: 7,
      })),
      {
        id: "shade-gallery",
        type: "shade",
        x: 0,
        z: -39,
        room: 1,
        maxHp: Math.round(55 * scale),
        damage: 9,
      },
      {
        id: "warden",
        type: "boss",
        x: 0,
        z: -65,
        room: 2,
        maxHp: Math.round(280 * scale),
        damage: 23,
      },
    ].map((e) => ({ ...e, hp: e.maxHp, nextAttack: 0, windup: null }));
  }
  function damage(p, amount) {
    if (!p.combat || now() < p.combat.invulnerableUntil) return;
    p.combat.hp = Math.max(
      0,
      p.combat.hp -
        Math.ceil(amount * (now() < p.combat.guardUntil ? 0.35 : 1)),
    );
    if (!p.combat.hp)
      leave(p, "You were rescued. Your party can keep fighting.");
  }
  function reward() {
    instance.phase = "cleared";
    instance.extractAt = now() + 60000;
    for (const p of members()) {
      p.riftCoins = (p.riftCoins || 0) + 100;
      p.riftEquipment = [
        ...new Set([
          ...(p.riftEquipment || []),
          CLASSES[classId(p.combatClass)].weapon,
        ]),
      ];
      p.combat.hp = p.combat.maxHp;
      emit(p, {
        type: "dungeon-reward",
        coins: 100,
        weapon: CLASSES[classId(p.combatClass)].weapon,
      });
    }
  }
  function attack(p, skill) {
    if (
      !instance ||
      instance.phase !== "fighting" ||
      p.dungeonId !== instance.id ||
      !p.combat
    )
      return;
    const spec = CLASSES[classId(p.combatClass)],
      time = now(),
      c = p.combat;
    const ready = skill ? "skillReadyAt" : "attackReadyAt";
    if (time < c[ready]) return;
    let range = skill ? Math.max(spec.range, 8) : spec.range;
    const targets = instance.enemies
      .filter((e) => e.hp > 0 && e.room <= p.dungeonStage)
      .map((e) => ({ e, distance: Math.hypot(e.x - p.x, e.z - p.z) }))
      .sort((a, b) => a.distance - b.distance);
    const target = targets.find((t) => t.distance <= range)?.e;
    if (!target && !(skill && ["support", "tank"].includes(p.combatClass)))
      return;
    c[ready] = time + (skill ? spec.skillCooldown : spec.cooldown);
    c.lastAttackAt = time;
    c.lastAction = skill ? "skill" : "attack";
    c.fromX = p.x;
    c.fromZ = p.z;
    c.targetX = target?.x ?? p.x;
    c.targetZ = target?.z ?? p.z;
    if (target) p.heading = Math.atan2(target.x - p.x, target.z - p.z);
    const hit = (enemy, amount) => {
      enemy.hp = Math.max(0, enemy.hp - amount);
      enemy.hitAt = time;
      enemy.hitBy = p.id;
    };
    const bonus = p.riftEquipment?.includes(spec.weapon) ? 2 : 0;
    if (!skill) {
      hit(target, spec.damage + bonus);
      return;
    }
    if (p.combatClass === "support") {
      for (const ally of members())
        if (Math.hypot(ally.x - p.x, ally.z - p.z) < 12)
          ally.combat.hp = Math.min(ally.combat.maxHp, ally.combat.hp + 38);
      if (target) hit(target, 25 + bonus);
    } else if (p.combatClass === "tank") {
      c.guardUntil = time + 5000;
      c.tauntUntil = time + 5000;
      for (const { e, distance } of targets)
        if (distance < 6) hit(e, 32 + bonus);
    } else if (p.combatClass === "assassin") {
      const dx = p.x - target.x,
        dz = p.z - target.z,
        length = Math.hypot(dx, dz) || 1;
      const x = target.x + (dx / length) * 1.5,
        z = target.z + (dz / length) * 1.5;
      if (!dungeonBlocked(x, z, p.dungeonStage)) {
        p.x = x;
        p.z = z;
      }
      c.invulnerableUntil = time + 500;
      hit(target, 62 + bonus);
    } else if (p.combatClass === "marksman") {
      const dx = target.x - p.x,
        dz = target.z - p.z,
        length = Math.hypot(dx, dz) || 1;
      for (const { e, distance } of targets)
        if (
          distance < 20 &&
          ((e.x - p.x) * dx + (e.z - p.z) * dz) / length > 0 &&
          Math.abs((e.x - p.x) * dz - (e.z - p.z) * dx) / length < 2.5
        )
          hit(e, 44 + bonus);
    } else {
      const radius = p.combatClass === "mage" ? 5 : 5.5;
      const center = p.combatClass === "mage" ? target : p;
      for (const { e } of targets)
        if (Math.hypot(e.x - center.x, e.z - center.z) <= radius)
          hit(e, (p.combatClass === "mage" ? 50 : 43) + bonus);
    }
  }
  return {
    action(p, message) {
      const time = now();
      if (message.action === "class") {
        if (p.dungeonId)
          return "Your class is locked until you return to the city.";
        if (!Object.hasOwn(CLASSES, message.classId))
          return "Choose a combat class.";
        p.combatClass = message.classId;
        emit(p, { type: "dungeon-player", player: p });
        return;
      }
      if (message.action === "enter") {
        if (p.dungeonId) return "You are already in a dungeon.";
        if (!portal || (!instance && time >= portal.expiresAt))
          return "This portal has faded. Check the map for the next rift.";
        if (
          p.mode !== "walk" ||
          Math.hypot(p.x - portal.x, p.z - portal.z) > PORTAL_ENTRY_RANGE
        )
          return "Walk within 4 m of the portal to enter.";
        if (time < cooldownUntil) return "The portal is recharging.";
        if (
          instance &&
          (instance.phase !== "joining" || time >= instance.closesAt)
        )
          return "The portal is sealed. Wait for the hunters to return.";
        if (instance && members().length >= 4)
          return "This dungeon party is full (4 hunters).";
        if (!instance)
          instance = {
            id: `rift-${++serial}`,
            phase: "joining",
            closesAt: time + 30000,
            startedAt: time,
            stage: 0,
            enemies: [],
          };
        const index = members().length;
        p.returnPoint = { x: p.x, z: p.z };
        p.dungeonId = instance.id;
        p.combatClass = classId(p.combatClass);
        p.dungeonStage = 0;
        const spec = CLASSES[p.combatClass];
        p.combat = {
          hp: spec.hp,
          maxHp: spec.hp,
          attackReadyAt: 0,
          skillReadyAt: 0,
          dodgeReadyAt: 0,
          guardUntil: 0,
          invulnerableUntil: 0,
        };
        p.x = (index - 1.5) * 1.5;
        p.z = 7;
        resetInput(p);
        emit(p, {
          type: "dungeon-player",
          player: p,
          result: "Lantern Rift · the portal seals in 30 seconds.",
        });
        return;
      }
      if (message.action === "leave") {
        leave(p);
        return;
      }
      if (!p.dungeonId || p.dungeonId !== instance?.id) return;
      if (message.action === "attack" || message.action === "skill")
        attack(p, message.action === "skill");
      if (
        message.action === "dodge" &&
        p.combat &&
        time >= p.combat.dodgeReadyAt
      ) {
        p.combat.fromX = p.x;
        p.combat.fromZ = p.z;
        p.combat.dodgeReadyAt = time + 3000;
        p.combat.invulnerableUntil = time + 550;
        p.combat.lastAction = "dodge";
        p.combat.lastAttackAt = time;
        for (let i = 0; i < 6; i++) {
          const x = p.x + Math.sin(p.heading) * 0.6,
            z = p.z + Math.cos(p.heading) * 0.6;
          if (!dungeonBlocked(x, z, p.dungeonStage)) {
            p.x = x;
            p.z = z;
          }
        }
        p.combat.targetX = p.x;
        p.combat.targetZ = p.z;
      }
    },
    tick(dt) {
      const time = now();
      if (!instance) {
        if (portal && time >= portal.expiresAt) {
          portal = null;
          cooldownUntil = time + 20000 + Math.floor(random() * 40000);
        } else if (!portal && time >= cooldownUntil) spawnPortal();
        return;
      }
      const party = members();
      if (!party.length) {
        instance = null;
        portal = null;
        cooldownUntil = time + 15000;
        return;
      }
      if (
        time - instance.startedAt > 15 * 60 * 1000 ||
        (instance.phase === "cleared" && time >= instance.extractAt)
      ) {
        for (const p of party)
          leave(p, "The rift has returned you to the city.");
        instance = null;
        portal = null;
        cooldownUntil = time + 60000;
        return;
      }
      if (instance.phase === "joining" && time >= instance.closesAt) {
        instance.phase = "fighting";
        instance.enemies = enemiesFor(party.length);
      }
      if (instance.phase !== "fighting") return;
      if (instance.enemies.every((e) => e.hp <= 0)) {
        reward();
        return;
      }
      while (
        instance.stage < 2 &&
        !instance.enemies.some((e) => e.room === instance.stage && e.hp > 0)
      )
        instance.stage++;
      for (const p of party) p.dungeonStage = instance.stage;
      for (const e of instance.enemies) {
        if (e.hp <= 0 || e.room > instance.stage) continue;
        const alive = members();
        if (!alive.length) break;
        const tank = alive.find(
          (p) =>
            p.combat.tauntUntil > time && Math.hypot(e.x - p.x, e.z - p.z) < 12,
        );
        const target =
          tank ||
          alive.reduce((a, b) =>
            Math.hypot(e.x - a.x, e.z - a.z) < Math.hypot(e.x - b.x, e.z - b.z)
              ? a
              : b,
          );
        e.heading = Math.atan2(target.x - e.x, target.z - e.z);
        if (e.windup) {
          if (time >= e.windup.endsAt) {
            for (const p of alive)
              if (
                Math.hypot(p.x - e.windup.x, p.z - e.windup.z) < e.windup.radius
              )
                damage(p, e.damage);
            e.windup = null;
            e.nextAttack = time + (e.type === "boss" ? 1900 : 1300);
          }
          continue;
        }
        const distance = Math.hypot(target.x - e.x, target.z - e.z),
          range = e.type === "wisp" ? 11 : e.type === "boss" ? 5 : 2.5;
        if (distance > range * 0.8 && distance < 25) {
          const pace = e.type === "boss" ? 2.6 : e.type === "wisp" ? 1.5 : 2.8;
          const x = e.x + ((target.x - e.x) / distance) * pace * dt,
            z = e.z + ((target.z - e.z) / distance) * pace * dt;
          if (!dungeonBlocked(x, e.z, instance.stage)) e.x = x;
          if (!dungeonBlocked(e.x, z, instance.stage)) e.z = z;
        }
        if (distance <= range && time >= e.nextAttack) {
          e.windup = {
            x: e.type === "wisp" ? target.x : e.x,
            z: e.type === "wisp" ? target.z : e.z,
            radius: e.type === "boss" ? 5.7 : e.type === "wisp" ? 2.5 : 2.8,
            endsAt: time + (e.type === "boss" ? 1100 : 800),
          };
        }
      }
    },
    snapshot(p) {
      return {
        portal: {
          ...(portal || { ...PORTAL, id: null }),
          active: Boolean(portal),
          expiresAt: portal?.expiresAt || 0,
          phase: instance?.phase || (portal ? "ready" : "cooldown"),
          closesAt: instance?.closesAt || 0,
          cooldownUntil,
          count: instance ? members().length : 0,
        },
        instance:
          p?.dungeonId === instance?.id && instance
            ? {
                id: instance.id,
                phase: instance.phase,
                closesAt: instance.closesAt,
                extractAt: instance.extractAt,
                stage: instance.stage,
                enemies: instance.enemies,
              }
            : null,
      };
    },
  };
}

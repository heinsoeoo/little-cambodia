import * as T from "three";
import { CLASSES, classId } from "./dungeon-rules.js";
export function createCombatEffects(scene) {
  const textures = new Map(),
    live = [];
  const texture = (name) => {
    if (!textures.has(name)) {
      const t = new T.TextureLoader().load(`/art/combat/${name}.png`);
      t.colorSpace = T.SRGBColorSpace;
      textures.set(name, t);
    }
    return textures.get(name);
  };
  for (const name of [
    "flare_01",
    "spark_01",
    "magic_01",
    "circle_05",
    "smoke_01",
  ])
    texture(name);
  function remove(effect) {
    scene.remove(effect.object);
    effect.object.traverse((o) => {
      if (o.isMesh || o.isLine) o.geometry?.dispose();
      o.material?.dispose();
    });
  }
  function add(object, time, duration, animate) {
    while (live.length >= 100) remove(live.shift());
    scene.add(object);
    live.push({ object, start: time, duration, animate });
    return object;
  }
  function sprite(name, color, position, size, time, duration, animate) {
    const s = new T.Sprite(
      new T.SpriteMaterial({
        map: texture(name),
        color,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    s.position.copy(position);
    s.scale.setScalar(size);
    return add(s, time, duration, (p) => {
      s.material.opacity = 1 - p;
      animate?.(s, p);
    });
  }
  function ring(position, color, radius, time, duration = 550) {
    const r = new T.Mesh(
      new T.RingGeometry(0.8, 1, 40),
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    r.rotation.x = -Math.PI / 2;
    r.position.copy(position);
    r.position.y = 0.08;
    add(r, time, duration, (p) => {
      r.scale.setScalar(0.3 + p * radius);
      r.material.opacity = (1 - p) * 0.7;
    });
  }
  function burst(position, color, time, count = 7) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const origin = position.clone();
      sprite("spark_01", color, origin, 0.65, time, 400, (s, p) => {
        s.position.set(
          origin.x + Math.cos(angle) * p * 2,
          origin.y + p * 0.9,
          origin.z + Math.sin(angle) * p * 2,
        );
        s.scale.setScalar(0.65 * (1 - p));
      });
    }
    sprite("flare_01", color, position, 1.6, time, 300, (s, p) =>
      s.scale.setScalar(1.6 + p * 1.5),
    );
  }
  return {
    action(player, time) {
      const c = player.combat;
      if (!c) return;
      const role = classId(player.combatClass),
        color = CLASSES[role].color,
        skill = c.lastAction === "skill";
      const from = new T.Vector3(c.fromX ?? player.x, 1.4, c.fromZ ?? player.z),
        to = new T.Vector3(c.targetX ?? player.x, 1.3, c.targetZ ?? player.z);
      if (c.lastAction === "dodge" || (role === "assassin" && skill)) {
        for (let i = 0; i < 5; i++) {
          const position = from.clone().lerp(to, i / 4);
          sprite("smoke_01", color, position, 1.4, time, 450, (s, p) => {
            s.scale.setScalar(1.4 + p * 1.5);
            s.position.y += 0.007;
          });
        }
      }
      if (c.lastAction === "dodge") return;
      if (skill && (role === "support" || role === "tank")) {
        const center = new T.Vector3(player.x, 0.1, player.z);
        ring(center, color, role === "support" ? 6 : 5, time, 850);
        for (let i = 0; i < 6; i++) {
          const p = center
            .clone()
            .add(new T.Vector3(Math.cos(i) * 2, 0.8, Math.sin(i) * 2));
          sprite("magic_01", color, p, 1.2, time, 800, (s, t) => {
            s.position.y = 0.8 + t * 2;
            s.scale.setScalar(1.2 - t * 0.5);
          });
        }
        if (role === "tank") burst(center.clone().setY(1), color, time, 5);
      } else if (skill && role === "mage") {
        ring(to, color, 5, time, 700);
        burst(to, color, time, 12);
        sprite("magic_01", color, to, 5, time, 650, (s, p) => {
          s.scale.setScalar(3 + p * 5);
          s.material.rotation = p * Math.PI;
        });
      } else if (["fighter", "assassin", "tank"].includes(role)) {
        const slash = new T.Mesh(
          new T.RingGeometry(
            skill ? 2 : 1.2,
            skill ? 2.7 : 1.7,
            24,
            1,
            0,
            Math.PI * 1.2,
          ),
          new T.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.9,
            side: T.DoubleSide,
            depthWrite: false,
          }),
        );
        slash.position.set(player.x, 0.9, player.z);
        slash.rotation.set(-Math.PI / 2, 0, -player.heading - Math.PI * 0.6);
        const initial = slash.rotation.z;
        add(slash, time, skill ? 460 : 300, (p) => {
          slash.rotation.z = initial + (p - 0.5) * 1.8;
          slash.scale.setScalar(0.75 + p * 0.5);
          slash.material.opacity = (1 - p) * 0.9;
        });
        sprite("flare_01", color, to, 0.9, time, 230);
      } else {
        const projectile = sprite(
          role === "marksman" ? "spark_01" : "flare_01",
          color,
          from,
          role === "marksman" ? 0.8 : 1.1,
          time,
          300,
          (s, p) => {
            s.position.lerpVectors(from, to, Math.min(1, p * 1.2));
            s.scale.setScalar(
              (role === "marksman" ? 0.8 : 1.1) * (1 - p * 0.3),
            );
          },
        );
        if (role === "marksman") {
          const beam = new T.Line(
            new T.BufferGeometry().setFromPoints([from, to]),
            new T.LineBasicMaterial({ color, transparent: true, opacity: 0.7 }),
          );
          add(
            beam,
            time,
            skill ? 450 : 200,
            (p) => (beam.material.opacity = (1 - p) * 0.7),
          );
        }
        projectile.material.rotation = player.heading;
      }
    },
    hit(enemy, color, time) {
      burst(new T.Vector3(enemy.x, 1.2, enemy.z), color, time, 5);
    },
    update(time) {
      for (let i = live.length - 1; i >= 0; i--) {
        const e = live[i],
          p = (time - e.start) / e.duration;
        if (p >= 1) {
          remove(e);
          live.splice(i, 1);
        } else e.animate(Math.max(0, p));
      }
    },
    clear() {
      live.forEach(remove);
      live.length = 0;
    },
  };
}

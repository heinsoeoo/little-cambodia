import { createCombatEffects } from "./dungeon-effects.js";
import * as T from "three";
import {
  CLASSES,
  classId,
  DUNGEON_ROOMS,
  DUNGEON_CORRIDORS,
} from "./dungeon-rules.js";
import { PORTAL, PORTAL_ENTRY_RANGE } from "./dungeon-portal.js";
import {
  createHunter,
  createRiftEnemy,
  disposeRiftObject,
} from "./dungeon-models.js";
import { followCamera } from "./camera-follow.js";
import { translate } from "./i18n.js";

export function createDungeonUI({
  scene,
  network,
  getSelf,
  clearInput,
  notify,
  onMap,
}) {
  const $ = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const node = $(id);
    if (node.textContent !== value) node.textContent = value;
  };
  let data = {
      portal: { ...PORTAL, phase: "cooldown", active: false, count: 0 },
      instance: null,
    },
    opened = false,
    currentId = null,
    offset = 0,
    held = false,
    lastAttack = 0,
    lastHud = 0,
    lastInterface = -Infinity,
    portalNavigation = false,
    combatActive = false;
  const hunters = new Map(),
    enemies = new Map(),
    labels = new Map(),
    rings = new Map(),
    seenHits = new Map(),
    seenActions = new Map();
  const dungeon = new T.Scene();
  const combatEffects = createCombatEffects(dungeon);
  function combatButton(id, caption, icon) {
    const button = $(id);
    if (!button.firstElementChild) {
      const img = document.createElement("img"),
        label = document.createElement("span");
      img.alt = "";
      button.replaceChildren(img, label);
    }
    const path = `/art/combat/${icon}.svg`;
    if (button.firstElementChild.getAttribute("src") !== path)
      button.firstElementChild.setAttribute("src", path);
    if (button.lastElementChild.textContent !== caption)
      button.lastElementChild.textContent = caption;
    button.setAttribute("aria-label", caption);
  }
  dungeon.background = new T.Color(0x151526);
  dungeon.fog = new T.Fog(0x151526, 110, 210);
  dungeon.add(new T.HemisphereLight(0xc2c4ef, 0x353044, 2.1));
  const light = new T.DirectionalLight(0xffe9c8, 2.1);
  light.position.set(-15, 35, 20);
  dungeon.add(light);
  const floorMat = new T.MeshToonMaterial({ color: 0x706c85 }),
    wallMat = new T.MeshToonMaterial({ color: 0x343247 });
  function box(w, h, d, x, y, z, mat, parent = dungeon) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  for (const r of [...DUNGEON_ROOMS, ...DUNGEON_CORRIDORS])
    box(r.w, 0.4, r.h, r.x + r.w / 2, -0.22, r.z + r.h / 2, floorMat);
  for (const [i, r] of DUNGEON_ROOMS.entries()) {
    for (const x of [r.x - 0.3, r.x + r.w + 0.3])
      box(0.6, 2.4, r.h, x, 1.2, r.z + r.h / 2, wallMat);
    for (const z of [r.z, r.z + r.h])
      for (const [x, w] of [
        [r.x + (r.w - 6) / 4, (r.w - 6) / 2],
        [r.x + r.w - (r.w - 6) / 4, (r.w - 6) / 2],
      ])
        box(w, 2.4, 0.6, x, 1.2, z, wallMat);
    const grid = new T.GridHelper(r.w, Math.round(r.w / 3), 0x938ca2, 0x807a91);
    grid.position.set(0, 0.01, r.z + r.h / 2);
    dungeon.add(grid);
    for (const x of [r.x + 1, r.x + r.w - 1])
      for (const z of [r.z + 2, r.z + r.h - 2]) {
        box(0.6, 1.6, 0.6, x, 0.8, z, wallMat);
        const flame = new T.Mesh(
          new T.OctahedronGeometry(0.35),
          new T.MeshBasicMaterial({ color: i === 2 ? 0xbda3ff : 0xf5c982 }),
        );
        flame.position.set(x, 1.9, z);
        dungeon.add(flame);
      }
  }
  const gateMat = new T.MeshBasicMaterial({
    color: 0x9b77e7,
    transparent: true,
    opacity: 0.65,
  });
  const gates = [
    box(6, 2.5, 0.35, 0, 1.25, -20, gateMat),
    box(6, 2.5, 0.35, 0, 1.25, -47, gateMat),
  ];
  const portal = new T.Group();
  portal.position.set(PORTAL.x, 0, PORTAL.z);
  scene.add(portal);
  const rim = new T.Mesh(
    new T.TorusGeometry(1.5, 0.18, 8, 40),
    new T.MeshBasicMaterial({ color: 0xb99bff }),
  );
  rim.position.y = 1.8;
  portal.add(rim);
  const disc = new T.Mesh(
    new T.CircleGeometry(1.36, 32),
    new T.MeshBasicMaterial({
      color: 0x694bd5,
      transparent: true,
      opacity: 0.65,
      side: T.DoubleSide,
    }),
  );
  disc.position.y = 1.8;
  portal.add(disc);
  const base = new T.Mesh(
    new T.CylinderGeometry(2, 2.3, 0.3, 16),
    new T.MeshToonMaterial({ color: 0x827487 }),
  );
  base.position.y = 0.15;
  portal.add(base);
  const panel = $("rift-panel"),
    selector = $("rift-classes");
  for (const [id, spec] of Object.entries(CLASSES)) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.class = id;
    button.setAttribute("aria-pressed", "false");
    const icon = document.createElement("img");
    icon.src = `/art/combat/${id}.svg`;
    icon.alt = "";
    const title = document.createElement("strong");
    title.textContent = translate(spec.name);
    const description = document.createElement("small");
    description.textContent = translate(spec.description);
    button.append(icon, title, description);
    button.onclick = () => {
      network.send({ type: "dungeon", action: "class", classId: id });
      if (network.joinOptions) network.joinOptions.combatClass = id;
      try {
        localStorage.setItem("little-cambodia-class", id);
      } catch {}
    };
    selector.append(button);
  }
  function closePanel() {
    const wasOpen = opened;
    opened = false;
    panel.hidden = true;
    document.body.classList.remove("dungeon-menu-open");
    if (wasOpen) clearInput();
  }
  const openPanel = () => {
    if (!getSelf() || getSelf().dungeonId) return;
    opened = true;
    panel.hidden = false;
    document.body.classList.add("dungeon-menu-open");
    clearInput();
    $("rift-close").focus();
  };
  $("rift-open").onclick = openPanel;
  $("rift-open").onpointerdown = (e) => {
    e.preventDefault();
    openPanel();
  };
  $("rift-close").onclick = closePanel;
  $("rift-map").onclick = () => {
    portalNavigation = true;
    closePanel();
    onMap();
  };
  $("rift-enter").onclick = () =>
    network.send({ type: "dungeon", action: "enter" });
  $("dungeon-exit").onclick = () =>
    network.send({ type: "dungeon", action: "leave" });
  const act = (action) => {
    if (getSelf()?.dungeonId && combatActive)
      network.send({ type: "dungeon", action });
  };
  const attackButton = $("dungeon-attack");
  attackButton.onpointerdown = (e) => {
    e.preventDefault();
    attackButton.setPointerCapture(e.pointerId);
    held = true;
    act("attack");
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    attackButton.addEventListener(type, () => (held = false));
  attackButton.onclick = (e) => {
    if (e.detail === 0) act("attack");
  };
  $("dungeon-skill").onclick = () => act("skill");
  $("dungeon-dodge").onclick = () => act("dodge");
  addEventListener("blur", () => (held = false));
  addEventListener("keydown", (e) => {
    if (
      !getSelf()?.dungeonId ||
      e.repeat ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
    )
      return;
    if (e.key.toLowerCase() === "k") act("skill");
    if (e.key === " ") {
      e.preventDefault();
      act("dodge");
    }
  });
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });
  function clearModels() {
    for (const model of hunters.values()) {
      dungeon.remove(model.group);
      disposeRiftObject(model.group);
    }
    hunters.clear();
    seenHits.clear();
    seenActions.clear();
    combatEffects.clear();

    for (const model of enemies.values()) {
      dungeon.remove(model);
      disposeRiftObject(model);
    }
    enemies.clear();
    for (const ring of rings.values()) {
      dungeon.remove(ring);
      disposeRiftObject(ring);
    }
    rings.clear();
    for (const label of labels.values()) label.remove();
    labels.clear();
  }
  function label(id, name) {
    if (!labels.has(id)) {
      const root = document.createElement("div"),
        text = document.createElement("span"),
        bar = document.createElement("i");
      root.className = "rift-nameplate";
      text.textContent = name;
      root.append(text, bar);
      $("dungeon-labels").append(root);
      labels.set(id, root);
    }
    return labels.get(id);
  }
  function map(self, players) {
    const canvas = $("dungeon-map"),
      ctx = canvas.getContext("2d"),
      x = (v) => canvas.width / 2 + v * 3.1,
      z = (v) => (v + 81) * 1.9;
    ctx.fillStyle = "#171724";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const r of [...DUNGEON_ROOMS, ...DUNGEON_CORRIDORS]) {
      ctx.fillStyle = "#646074";
      ctx.fillRect(x(r.x), z(r.z), r.w * 3.1, r.h * 1.9);
    }
    for (const e of data.instance?.enemies || [])
      if (e.hp > 0) {
        ctx.fillStyle = e.type === "boss" ? "#edc271" : "#dc7b95";
        ctx.beginPath();
        ctx.arc(x(e.x), z(e.z), e.type === "boss" ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    for (const p of players) {
      ctx.fillStyle = p.id === self.id ? "#fff0c6" : "#92d1bb";
      ctx.beginPath();
      ctx.arc(x(p.x), z(p.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#92d1bb";
    ctx.fillRect(x(-1), z(8), 6, 4);
  }
  return {
    get open() {
      return opened;
    },
    get goal() {
      return portalNavigation && data.portal.active
        ? { point: [data.portal.x, data.portal.z], label: "Lantern Rift" }
        : null;
    },
    get portal() {
      return data.portal;
    },
    receive(event) {
      if (event.type === "state" && event.dungeon) {
        data = event.dungeon;
        offset = event.time - Date.now();
      }
      if (event.type === "dungeon-player") {
        if (event.result) {
          closePanel();
          portalNavigation = false;
        }
        held = false;
      }
      if (event.type === "dungeon-reward")
        notify(
          `${translate("Boss defeated!")} +${event.coins} ${translate("rift coins")} · ${translate(event.weapon)}`,
          8,
        );
    },
    update(self, players, dt, time, keys, active) {
      combatActive = active;
      if (
        active &&
        self?.dungeonId &&
        (held || keys.has("j")) &&
        time - lastAttack > 220
      ) {
        act("attack");
        lastAttack = time;
      }

      document.body.classList.toggle("in-dungeon", Boolean(self?.dungeonId));
      $("dungeon-hud").hidden = !self?.dungeonId;
      $("rift-open").hidden = !self || Boolean(self.dungeonId);
      if (!self) {
        closePanel();
        held = false;
        return;
      }
      if (time - lastInterface < 100) return;
      lastInterface = time;
      const clock = Date.now() + offset,
        p = data.portal,
        seconds = Math.max(0, Math.ceil((p.closesAt - clock) / 1000)),
        cooldown = Math.max(0, Math.ceil((p.cooldownUntil - clock) / 1000));
      const idle = Math.max(0, Math.ceil((p.expiresAt - clock) / 1000)),
        duration = `${Math.floor(idle / 60)}:${String(idle % 60).padStart(2, "0")}`;
      const status =
        p.phase === "joining"
          ? `${translate("Seals in")} ${seconds}s · ${p.count}/4`
          : p.phase === "ready"
            ? `${translate("Fades in")} ${duration} · ${translate(p.district || "Riverside")}`
            : p.phase === "cooldown"
              ? `${translate("Next portal in")} ${cooldown}s`
              : translate("Raid in progress");
      const distanceToPortal = Math.hypot(self.x - p.x, self.z - p.z);
      setText(
        "rift-open",
        !p.active
          ? `${translate("No active rift")} · ${cooldown}s`
          : `◉ ${translate("Lantern Rift")} · ${distanceToPortal > PORTAL_ENTRY_RANGE ? Math.round(distanceToPortal) + " m" : p.phase === "ready" ? translate("Enter") : p.phase === "joining" ? seconds + "s" : translate("Busy")}`,
      );
      setText("rift-status", status);
      setText(
        "rift-coins",
        `${self.riftCoins || 0} ${translate("rift coins")} · ${translate("Session rewards")}`,
      );
      setText(
        "rift-gear",
        self.riftEquipment?.length
          ? `${translate("Collected weapons")}: ${self.riftEquipment.map((name) => translate(name)).join(" · ")}`
          : translate(
              "Boss reward: 100 rift coins and a class weapon. Collected weapons add +2 damage.",
            ),
      );
      for (const button of selector.children)
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.class === classId(self.combatClass)),
        );
      const distance = Math.hypot(self.x - p.x, self.z - p.z);
      $("rift-enter").disabled =
        !p.active ||
        self.mode !== "walk" ||
        distance > PORTAL_ENTRY_RANGE ||
        !["ready", "joining"].includes(p.phase) ||
        p.count >= 4;
      setText(
        "rift-distance",
        !p.active
          ? translate("Watch the map for a new portal.")
          : distance > PORTAL_ENTRY_RANGE
            ? `${translate("Walk to the portal")} · ${Math.round(distance)} m`
            : self.mode === "drive"
              ? translate("Get out of your vehicle first.")
              : translate("Up to 4 hunters. Your class locks on entry."),
      );
      rim.rotation.z = time * 0.00025;
      disc.material.opacity = 0.5 + Math.sin(time * 0.002) * 0.12;
      rim.material.color.setHex(
        p.phase === "ready" || p.phase === "joining" ? 0xb99bff : 0x7c708c,
      );
      portal.position.set(p.x, 0, p.z);
      portal.visible = p.active && !self.dungeonId;
      $("rift-map").disabled = !p.active;
      if (self.dungeonId !== currentId) {
        clearModels();
        currentId = self.dungeonId;
      }
      if (!self.dungeonId) {
        held = false;
        return;
      }
      const spec = CLASSES[classId(self.combatClass)],
        instance = data.instance;
      setText("dungeon-title", translate("Lantern Rift"));
      setText(
        "dungeon-health",
        `${translate(spec.name)} · ${Math.ceil(self.combat?.hp || 0)} / ${self.combat?.maxHp || spec.hp} HP`,
      );
      $("dungeon-hp-fill").style.width =
        `${((self.combat?.hp || 0) / (self.combat?.maxHp || spec.hp)) * 100}%`;
      setText(
        "dungeon-phase",
        instance?.phase === "joining"
          ? `${translate("Waiting for hunters")} · ${seconds}s`
          : instance?.phase === "cleared"
            ? translate("Victory! Collect your rewards and return.")
            : translate(DUNGEON_ROOMS[instance?.stage || 0].name),
      );
      setText(
        "dungeon-party",
        players
          .map(
            (p) =>
              `${p.nickname} · ${translate(CLASSES[classId(p.combatClass)].name)}`,
          )
          .join(" / "),
      );
      for (const [action, id, deadline] of [
        ["skill", "dungeon-skill", "skillReadyAt"],
        ["dodge", "dungeon-dodge", "dodgeReadyAt"],
      ]) {
        const remaining = Math.max(
          0,
          Math.ceil(((self.combat?.[deadline] || 0) - clock) / 1000),
        );
        $(id).disabled =
          !active || instance?.phase !== "fighting" || remaining > 0;
        combatButton(
          id,
          remaining
            ? `${remaining}s`
            : translate(action === "skill" ? spec.skill : "Dodge"),
          action === "skill" ? classId(self.combatClass) : "dodge",
        );
      }
      combatButton(
        "dungeon-attack",
        translate("Attack"),
        classId(self.combatClass),
      );
      attackButton.disabled = !active || instance?.phase !== "fighting";
      for (const [i, gate] of gates.entries())
        gate.visible = (instance?.stage || 0) <= i;
      if (time - lastHud > 100) {
        map(self, players);
        lastHud = time;
      }
    },
    render(
      renderer,
      camera,
      self,
      players,
      dt,
      time,
      cameraOffset,
      orbitOffset,
    ) {
      const clock = Date.now() + offset,
        ids = new Set(players.map((p) => p.id));
      for (const [id, model] of hunters)
        if (!ids.has(id)) {
          dungeon.remove(model.group);
          disposeRiftObject(model.group);
          hunters.delete(id);
          labels.get(id)?.remove();
          labels.delete(id);
        }
      for (const raw of players) {
        const p = raw.id === self.id ? self : raw;
        if (!hunters.has(p.id)) {
          const model = createHunter(p.appearance, p.combatClass);
          model.group.position.set(p.x, 0, p.z);
          dungeon.add(model.group);
          hunters.set(p.id, model);
        }
        const model = hunters.get(p.id);
        model.group.position.lerp(
          new T.Vector3(p.x, 0, p.z),
          1 - Math.exp(-dt * 24),
        );
        model.update(p, dt, clock);
        if (
          p.combat?.lastAttackAt &&
          seenActions.get(p.id) !== p.combat.lastAttackAt
        ) {
          seenActions.set(p.id, p.combat.lastAttackAt);
          if (clock - p.combat.lastAttackAt < 1000)
            combatEffects.action(p, time);
        }
      }
      for (const e of data.instance?.enemies || []) {
        if (!enemies.has(e.id)) {
          const model = createRiftEnemy(e.type);
          model.position.set(e.x, 0, e.z);
          dungeon.add(model);
          enemies.set(e.id, model);
        }
        const model = enemies.get(e.id);
        model.visible = e.hp > 0;
        model.position.lerp(new T.Vector3(e.x, 0, e.z), 1 - Math.exp(-dt * 12));
        if (e.hitAt && e.hitAt !== seenHits.get(e.id)) {
          seenHits.set(e.id, e.hitAt);
          const state = players.find((p) => p.id === e.hitBy);
          const color = CLASSES[classId(state?.combatClass)].color;
          combatEffects.hit(e, color, time);
        }
        model.rotation.y = e.heading ?? Math.atan2(self.x - e.x, self.z - e.z);
        model.position.y =
          e.type === "wisp" ? Math.sin(time * 0.003) * 0.15 : 0;
        if (e.windup && e.hp > 0) {
          if (!rings.has(e.id)) {
            const ring = new T.Mesh(
              new T.CircleGeometry(1, 32),
              new T.MeshBasicMaterial({
                color: 0xf07c85,
                transparent: true,
                opacity: 0.3,
                side: T.DoubleSide,
              }),
            );
            ring.rotation.x = -Math.PI / 2;
            dungeon.add(ring);
            rings.set(e.id, ring);
          }
          const ring = rings.get(e.id);
          ring.visible = true;
          ring.position.set(e.windup.x, 0.04, e.windup.z);
          ring.scale.setScalar(e.windup.radius);
          ring.material.opacity = 0.25 + Math.sin(time * 0.015) * 0.1;
        } else if (rings.has(e.id)) rings.get(e.id).visible = false;
      }
      combatEffects.update(time);
      const focus = hunters.get(self.id)?.group.position || self;
      camera.zoom = 2.4;
      camera.updateProjectionMatrix();
      followCamera(camera, focus, cameraOffset, orbitOffset, dt);
      camera.updateMatrixWorld();
      const projected = new T.Vector3();
      for (const p of players) {
        const model = hunters.get(p.id);
        if (!model) continue;
        const node = label(p.id, p.nickname);
        projected.copy(model.group.position);
        projected.y += 3;
        projected.project(camera);
        node.hidden = Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1;
        node.style.left = `${(projected.x * 0.5 + 0.5) * innerWidth}px`;
        node.style.top = `${(-projected.y * 0.5 + 0.5) * innerHeight}px`;
        node.lastChild.style.width = `${((p.combat?.hp || 0) / (p.combat?.maxHp || 1)) * 100}%`;
      }
      for (const e of data.instance?.enemies || []) {
        const node = label(
          "enemy-" + e.id,
          translate(
            e.type === "boss"
              ? "The Warden"
              : e.type === "wisp"
                ? "Wisp"
                : "Shade",
          ),
        );
        projected.set(e.x, e.type === "boss" ? 4 : 3, e.z).project(camera);
        node.hidden =
          e.hp <= 0 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1;
        node.style.left = `${(projected.x * 0.5 + 0.5) * innerWidth}px`;
        node.style.top = `${(-projected.y * 0.5 + 0.5) * innerHeight}px`;
        node.lastChild.style.width = `${(e.hp / e.maxHp) * 100}%`;
        node.lastChild.style.background = "#d98b9d";
      }
      const boss = data.instance?.enemies.find((e) => e.type === "boss");
      $("dungeon-boss").hidden =
        !boss || boss.hp <= 0 || data.instance?.stage < 2;
      if (boss)
        setText(
          "dungeon-boss",
          `${translate("The Warden")} · ${Math.ceil(boss.hp)} / ${boss.maxHp} HP`,
        );
      renderer.setClearColor(0x151526);
      renderer.render(dungeon, camera);
    },
  };
}

import * as T from "three";
import {
  createCharacter as lumaCharacter,
  animateCharacter,
  round,
  sphere,
  rod,
  mat,
} from "./luma-models.js";
import {
  appearance,
  style,
  SKIN_TONES,
  outfitCut,
  hairstyle,
} from "./wardrobe.js";

// Luma Bay's actual character is the base, including its shoulder, leg, face and
// hair geometry. Only clothing/hair variants and Little Cambodia actions adapt it.
export function createCharacter(initial) {
  const group = new T.Group();
  let key,
    model,
    rig,
    gait = 0,
    seated,
    ridingRig,
    snack;
  function rebuild(value) {
    const look = appearance(value),
      next = JSON.stringify(look);
    if (next === key) return;
    key = next;
    disposeMeshes(group);
    group.clear();
    const top = style(look.top),
      bottom = style(look.bottom),
      shoes = style(look.shoes),
      hair = hairstyle(look.hair, look.gender);
    model = lumaCharacter(
      top.top,
      SKIN_TONES.find((s) => s.id === look.skin).color,
      { hair: hair.hair, bottom: bottom.bottom, shoes: shoes.shoe },
    );
    isolateMaterials(model);
    rig = model.userData;
    // The source feet sit .13 above its origin. A translation grounds them
    // without changing the source leg or shoe geometry.
    model.position.y = -0.13;
    group.add(model);
    rig.torso.children.find((o) => o.isMesh && o.material === rig.jacket).name =
      "clothed-torso";
    const faceParts = rig.head.children;
    faceParts[0].name = "sculpted-face";
    faceParts[1].name = "hair-cap";
    const tufts = faceParts.slice(2, 7);
    tufts.forEach((o) => (o.name = "luma-hair-tuft"));
    for (const p of faceParts) {
      if (p.material === rig.dark) p.name = "iris";
      if (p.scale.x === 0.009) {
        p.material = mat(0xf4eee1).clone();
        p.name = "eye-highlight";
      }
    }
    rig.legs.forEach((l) => (l.children[1].name = "shaped-shoe"));
    rig.arms.forEach((a) => (a.children[1].name = "hand"));
    // Preserve the reference's original cropped hair by default. Other saved
    // hairstyles use the same soft sphere/rod vocabulary around its head.
    const shape = hair.hairShape;
    if (["long", "waves", "bob", "braids"].includes(shape)) {
      for (const side of [-1, 1])
        for (let i = 0; i < 3; i++)
          sphere(
            rig.head,
            side * (0.22 + i * 0.015),
            shape === "bob" ? -0.04 : shape === "long" ? -0.3 : -0.17,
            -0.09 - i * 0.035,
            0.075,
            shape === "bob" ? 0.22 : shape === "long" ? 0.5 : 0.34,
            0.09,
            rig.hair,
          ).name = "hair-lock";
    }
    if (["bun", "ponytail"].includes(shape)) {
      sphere(rig.head, 0, 0.09, -0.3, 0.13, 0.13, 0.12, rig.hair).name =
        "tied-hair";
      if (shape === "ponytail")
        sphere(rig.head, 0, -0.13, -0.32, 0.085, 0.28, 0.1, rig.hair).name =
          "ponytail";
    }
    if (shape === "curls" || (shape === "fade" && look.hair === "street")) {
      tufts.forEach((o) => (o.visible = false));
      for (let i = 0; i < 9; i++) {
        const a = (i * Math.PI * 2) / 9;
        sphere(
          rig.head,
          Math.cos(a) * 0.19,
          0.25 + (i % 2) * 0.025,
          Math.sin(a) * 0.16,
          0.1,
          0.1,
          0.1,
          rig.hair,
        ).name = "curl";
      }
    } else if (["fade", "cropped", "pixie"].includes(shape))
      tufts.forEach((o) => (o.scale.y *= 0.65));
    else if (shape === "mohawk") {
      tufts.forEach((o) => (o.visible = false));
      for (let i = 0; i < 5; i++)
        sphere(
          rig.head,
          0,
          0.32,
          -0.19 + i * 0.095,
          0.055,
          0.14,
          0.07,
          rig.hair,
        ).name = "mohawk";
    } else if (shape === "sidepart")
      tufts.forEach((o, i) => {
        o.position.z -= 0.03;
        o.rotation.z = -0.25 - i * 0.025;
      });
    else if (shape === "quiff") tufts.forEach((o) => (o.scale.y *= 1.12));
    // Garment choices retain the Luma body rather than adding shoulder balls.
    if (outfitCut(look) === "female")
      rig.torso.getObjectByName("clothed-torso").geometry.scale(0.96, 1, 1);
    if (top.topShape === "hoodie")
      sphere(rig.torso, 0, 1.31, -0.11, 0.2, 0.12, 0.13, rig.jacket).name =
        "hood";
    if (["polo", "blouse", "jacket"].includes(top.topShape))
      rig.torso.children
        .filter(
          (o) =>
            o.geometry?.type === "SphereGeometry" && o.material === rig.jacket,
        )
        .forEach((o) => (o.name = "shirt-collar"));
    if (bottom.bottomShape === "skirt") {
      const skirt = new T.Mesh(
        new T.CylinderGeometry(0.24, 0.35, 0.56, 20),
        rig.pants,
      );
      skirt.position.set(0, 0.52, 0);
      skirt.name = "flowing-skirt";
      model.add(skirt);
    }
    seated = new T.Group();
    seated.name = "bench-seated-rig";
    model.add(seated);
    seated.visible = false;
    for (const side of [-1, 1]) {
      round(seated, 0.21, 0.19, 0.46, side * 0.145, 0.77, 0.18, rig.pants);
      round(seated, 0.21, 0.5, 0.23, side * 0.145, 0.43, 0.4, rig.pants);
      round(seated, 0.23, 0.12, 0.36, side * 0.145, 0.18, 0.47, rig.shoe);
    }
    ridingRig = new T.Group();
    ridingRig.name = "luma-riding-pose";
    ridingRig.visible = false;
    model.add(ridingRig);
    function bent(a, b, w, material) {
      const start = new T.Vector3(...a),
        end = new T.Vector3(...b);
      const m = round(
        ridingRig,
        w,
        start.distanceTo(end),
        w * 0.98,
        0,
        0,
        0,
        material,
      );
      m.position.copy(start).add(end).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        end.sub(start).normalize(),
      );
    }
    for (const side of [-1, 1]) {
      bent([side * 0.33, 1.18, 0], [side * 0.3, 0.94, 0.3], 0.18, rig.jacket);
      bent(
        [side * 0.3, 0.94, 0.3],
        [side * 0.28, 0.69, 0.7],
        0.14,
        rig.skinMat,
      );
      sphere(ridingRig, side * 0.28, 0.69, 0.7, 0.085, 0.1, 0.085, rig.skinMat);
      bent(
        [side * 0.145, 0.64, -0.03],
        [side * 0.27, 0.35, 0.28],
        0.21,
        rig.pants,
      );
      bent(
        [side * 0.27, 0.35, 0.28],
        [side * 0.28, 0.09, 0.04],
        0.2,
        rig.pants,
      );
      round(ridingRig, 0.23, 0.12, 0.36, side * 0.28, 0.09, 0.1, rig.shoe);
    }
    snack = round(
      rig.arms[1],
      0.09,
      0.1,
      0.08,
      0,
      -0.42,
      0.05,
      mat(0xe1ad63).clone(),
    );
    snack.name = "held-snack";
    snack.visible = false;
    group.userData.appearance = look;
    group.userData.outfitCut = outfitCut(look);
    group.userData.proportions = "luma-bay-source";
    group.userData.silhouette =
      look.gender === "male"
        ? "lean-athletic"
        : look.gender === "female"
          ? "soft-curved"
          : "neutral";
  }
  function pose(state, dt = 1 / 60) {
    const riding =
      state.mode === "drive" &&
      ["moto", "vespa", "scoopy", "offroad-moto", "racing-moto"].includes(
        state.vehicle?.type,
      );
    const sitting = state.mode === "walk" && state.posture === "sit";
    const heading = riding ? state.vehicle.heading : state.heading || 0;
    group.visible = state.mode === "walk" || riding;
    group.position.set(
      riding ? -Math.sin(heading) * 0.15 : 0,
      riding ? (state.vehicle.type === "offroad-moto" ? 0.67 : 0.52) : 0,
      riding ? -Math.cos(heading) * 0.15 : 0,
    );
    group.rotation.y = heading;
    const speed = Math.abs(state.speed || 0),
      moving = speed > 0.1 && !sitting;
    gait += moving ? dt * (speed > 4.6 ? 1.6 : 1) : 0;
    animateCharacter(model, gait, moving ? 1 : 0, riding);
    seated.visible = sitting;
    rig.legs.forEach((l) => (l.visible = !sitting && !riding));
    ridingRig.visible = riding;
    for (const arm of rig.arms) {
      arm.visible = !riding;
      arm.scale.y = 1;
      arm.rotation.z = 0;
    }
    if (sitting) rig.torso.position.y = 0;
    if (riding) rig.torso.position.y = -0.1;
    if (speed > 4.6 && moving && !riding) rig.torso.rotation.x = 0.08;
    else rig.torso.rotation.x = 0;
    snack.visible = false;
    if (state.gesture === "eat" && state.gestureSeconds > 0 && !riding) {
      rig.arms[1].rotation.set(-0.6, 0, -2.4);
      snack.visible = true;
    }
    if (state.gesture === "wave" && state.gestureSeconds > 0 && !riding)
      rig.arms[1].rotation.z = -2.5 + Math.sin(performance.now() / 150) * 0.15;
  }
  rebuild(initial);
  return {
    group,
    setAppearance: rebuild,
    pose,
    get arms() {
      return rig.arms;
    },
    greet(time, side = 1) {
      rig.arms.forEach(
        (a, i) =>
          (a.rotation.z =
            (i === 0 ? -1 : 1) *
            (i === side ? 2.5 + Math.sin(time * 4) * 0.15 : 0.08)),
      );
    },
    dispose: () => disposeMeshes(group),
  };
}
// Source materials are prototypes. Each instance owns clones so changing an
// outfit or disposing a remote guest never recolors/disposes another guest.
export function isolateMaterials(root) {
  const copies = new Map();
  root.traverse((o) => {
    if (o.material) {
      if (!copies.has(o.material)) copies.set(o.material, o.material.clone());
      o.material = copies.get(o.material);
    }
  });
  for (const [name, value] of Object.entries(root.userData))
    if (copies.has(value)) root.userData[name] = copies.get(value);
}
export function disposeMeshes(root) {
  const geometries = new Set(),
    materials = new Set();
  root.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) materials.add(o.material);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => {
    if (m.map?.userData?.lumaOwned) m.map.dispose();
    m.dispose();
  });
}

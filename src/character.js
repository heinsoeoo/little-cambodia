import * as T from "three";
import {
  appearance,
  style,
  SKIN_TONES,
  outfitCut,
  hairstyle,
} from "./wardrobe.js";
export function createCharacter(initial) {
  const group = new T.Group();
  let key = "",
    rig;
  function rebuild(value) {
    const look = appearance(value),
      next = JSON.stringify(look);
    if (next === key) return;
    key = next;
    disposeMeshes(group);
    group.clear();
    const top = style(look.top),
      bottom = style(look.bottom),
      shoe = style(look.shoes),
      hairStyle = hairstyle(look.hair, look.gender);
    const mat = (color) => new T.MeshLambertMaterial({ color });
    const cloth = mat(top.top),
      pants = mat(bottom.bottom),
      footwear = mat(shoe.shoe),
      skin = mat(SKIN_TONES.find((s) => s.id === look.skin).color),
      hair = mat(hairStyle.hair),
      trim = mat(0xe8dcc4),
      dark = mat(0x393a40);
    const add = (geometry, material, x, y, z, parent = group) => {
      const m = new T.Mesh(geometry, material);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };
    const box = (w, h, d, x, y, z, material, parent = group) =>
      add(new T.BoxGeometry(w, h, d), material, x, y, z, parent);
    const sphere = (r, x, y, z, material, parent = group) =>
      add(new T.SphereGeometry(r, 12, 9), material, x, y, z, parent);
    const male = look.gender === "male",
      female = look.gender === "female";
    const cut = outfitCut(look),
      maleCut = cut === "male",
      femaleCut = cut === "female";
    const broad = maleCut ? 1.16 : femaleCut ? 0.92 : 1;
    const oversized = ["oversized", "hoodie"].includes(top.topShape);
    // Fully clothed adult silhouettes: athletic shoulders versus a softer fitted waist/hips.
    const profile =
      oversized && !femaleCut
        ? [
            [0.34, 0.64],
            [0.37, 0.85],
            [0.35, 1.24],
            [0.31, 1.4],
          ]
        : maleCut
          ? [
              [0.25, 0.64],
              [0.23, 0.85],
              [0.34, 1.23],
              [0.3, 1.4],
            ]
          : femaleCut
            ? [
                [0.32, 0.64],
                [0.22, 0.88],
                [0.29, 1.17],
                [0.24, 1.4],
              ]
            : [
                [0.29, 0.64],
                [0.26, 0.88],
                [0.28, 1.23],
                [0.25, 1.4],
              ];
    const torso = add(
      new T.LatheGeometry(
        profile.map(([r, y]) => new T.Vector2(r, y)),
        16,
      ),
      cloth,
      0,
      0,
      0,
    );
    torso.scale.z = femaleCut ? 0.8 : 0.85;
    torso.name = "clothed-torso";
    if (maleCut && !oversized)
      for (const x of [-0.23, 0.23]) {
        const shoulder = sphere(0.14, x, 1.24, 0, cloth);
        shoulder.scale.set(1.15, 1.15, 0.9);
      }
    const face = sphere(0.25, 0, 1.62, 0, skin);
    face.scale.set(female ? 0.94 : 1, male ? 1.04 : 1, 1);
    if (female) {
      for (const x of [-0.14, 0.14]) {
        const blush = sphere(0.04, x, 1.57, 0.21, mat(0xc58b7b));
        blush.scale.z = 0.25;
      }
    }
    // Small eyes face +Z, so the character also has an unambiguous front.
    for (const x of [-0.085, 0.085]) sphere(0.025, x, 1.65, 0.235, dark);
    const cap = add(
      new T.SphereGeometry(0.265, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.43),
      hair,
      0,
      1.68,
      0,
    );
    if (["long", "bob", "braids", "waves"].includes(hairStyle.hairShape)) {
      for (const x of [-0.21, 0.21]) {
        const h = sphere(0.14, x, 1.48, -0.06, hair);
        h.scale.set(
          0.8,
          ["long", "waves"].includes(hairStyle.hairShape) ? 2.6 : 1.5,
          1,
        );
      }
      box(
        0.42,
        ["long", "waves"].includes(hairStyle.hairShape) ? 0.65 : 0.32,
        0.12,
        0,
        1.42,
        -0.2,
        hair,
      );
    }
    if (["bun", "ponytail"].includes(hairStyle.hairShape)) {
      const h = sphere(0.15, 0, 1.7, -0.28, hair);
      if (hairStyle.hairShape === "ponytail") h.scale.set(0.8, 1.8, 0.8);
    }
    if (hairStyle.hairShape === "mohawk") {
      cap.scale.y = 0.6;
      box(0.12, 0.28, 0.4, 0, 1.92, 0, hair);
    }
    if (hairStyle.hairShape === "curls")
      for (let i = 0; i < 8; i++)
        sphere(
          0.1,
          Math.cos((i * Math.PI) / 4) * 0.21,
          1.84 + 0.025 * (i % 2),
          Math.sin((i * Math.PI) / 4) * 0.21,
          hair,
        );
    if (["cropped", "fade"].includes(hairStyle.hairShape)) cap.scale.y = 0.5;
    if (hairStyle.hairShape === "fade")
      for (let i = 0; i < 5; i++)
        sphere(0.075, (i - 2) * 0.08, 1.9, 0.08, hair);
    if (["quiff", "pixie"].includes(hairStyle.hairShape)) {
      const fringe = sphere(0.2, -0.05, 1.9, 0.08, hair);
      fringe.scale.set(1, hairStyle.hairShape === "quiff" ? 0.7 : 0.35, 0.8);
    }
    if (hairStyle.hairShape === "waves")
      for (const x of [-0.23, 0.23])
        for (let i = 0; i < 4; i++) {
          const wave = sphere(
            0.13,
            x,
            1.65 - i * 0.14,
            -0.12 + (i % 2) * 0.05,
            hair,
          );
          wave.scale.set(0.9, 1.3, 0.8);
        }
    if (hairStyle.hairShape === "braids")
      for (const x of [-0.2, 0.2])
        for (let i = 0; i < (female ? 5 : 2); i++)
          sphere(0.075, x, 1.5 - i * 0.12, -0.15, hair);
    if (hairStyle.hairShape === "sidepart") {
      const sweep = sphere(0.19, -0.08, 1.88, 0.04, hair);
      sweep.scale.set(1, 0.4, 1);
    }
    if (["jacket", "vest"].includes(top.topShape)) {
      box(0.17, 0.62, 0.08, 0, 1.04, 0.28, trim);
      for (const x of [-0.14, 0.14])
        box(0.12, 0.14, 0.09, x, 1.29, 0.27, cloth);
    }
    if (top.topShape === "polo" || top.topShape === "blouse")
      for (const x of [-0.1, 0.1]) box(0.12, 0.09, 0.1, x, 1.4, 0.2, trim);
    if (top.topShape === "hoodie") {
      const hood = sphere(0.25, 0, 1.36, -0.14, cloth);
      hood.scale.set(1, 0.8, 0.8);
      box(0.3, 0.12, 0.09, 0, 0.94, 0.3, trim);
    }
    if (top.topShape === "jersey") box(0.08, 0.5, 0.04, 0, 1.04, 0.3, trim);
    if (top.id === "rapper") {
      const chain = sphere(0.12, 0, 1.21, 0.29, mat(0xd3b76d));
      chain.scale.set(1, 0.6, 0.25);
    }
    if (
      femaleCut &&
      ["polo", "blouse", "jacket", "vest"].includes(top.topShape)
    ) {
      const belt = add(
        new T.CylinderGeometry(0.235, 0.24, 0.055, 16),
        trim,
        0,
        0.88,
        0,
      );
      belt.scale.z = 0.8;
      box(0.075, 0.06, 0.025, 0, 0.88, 0.2, mat(0xc3a36e));
    }
    if (maleCut && ["jacket", "vest", "tee"].includes(top.topShape)) {
      for (const x of [-0.18, 0.18]) box(0.1, 0.09, 0.035, x, 1.14, 0.25, trim);
    }
    if (cut === "unisex") {
      const hem = add(
        new T.CylinderGeometry(0.31, 0.32, 0.065, 16),
        cloth,
        0,
        0.66,
        0,
      );
      hem.scale.z = 0.85;
    }
    const standing = new T.Group(),
      riding = new T.Group();
    group.add(standing, riding);
    const legs = [];
    const shoeSize =
      shoe.shoeShape === "boots"
        ? 0.23
        : shoe.shoeShape === "high-tops"
          ? 0.18
          : 0.12;
    for (const side of [-1, 1]) {
      const leg = new T.Group();
      leg.position.set(side * (female ? 0.18 : 0.15), 0.64, 0);
      standing.add(leg);
      legs.push(leg);
      const shorts = bottom.bottomShape === "shorts",
        wide = bottom.bottomShape === "wide";
      add(
        new T.CylinderGeometry(
          wide ? 0.14 : femaleCut ? 0.115 : maleCut ? 0.12 : 0.14,
          wide ? 0.15 : femaleCut ? 0.085 : maleCut ? 0.1 : 0.125,
          shorts ? (femaleCut ? 0.27 : 0.33) : 0.55,
          8,
        ),
        pants,
        0,
        shorts ? -0.12 : -0.27,
        0,
        leg,
      );
      if (shorts)
        add(new T.CylinderGeometry(0.08, 0.08, 0.28, 8), skin, 0, -0.4, 0, leg);
      if (bottom.bottomShape === "cargo")
        box(0.09, 0.15, 0.15, side * 0.11, -0.15, 0, pants, leg);
      box(
        femaleCut ? 0.21 : 0.25,
        shoeSize,
        femaleCut ? 0.33 : 0.37,
        0,
        -0.57 + shoeSize / 2,
        0.08,
        footwear,
        leg,
      );
      if (shoe.shoeShape === "sneakers" || shoe.shoeShape === "high-tops")
        box(0.24, 0.035, 0.37, 0, -0.58, 0.08, trim, leg);
    }
    if (bottom.bottomShape === "skirt")
      add(
        new T.CylinderGeometry(
          femaleCut ? 0.31 : 0.3,
          femaleCut ? 0.46 : maleCut ? 0.35 : 0.43,
          femaleCut ? 0.46 : 0.53,
          12,
        ),
        pants,
        0,
        0.44,
        0,
        standing,
      );
    function limb(parent, a, b, r, material) {
      const av = new T.Vector3(...a),
        bv = new T.Vector3(...b);
      const m = add(
        new T.CylinderGeometry(r, r, av.distanceTo(bv), 8),
        material,
        0,
        0,
        0,
        parent,
      );
      m.position.copy(av).add(bv).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        bv.sub(av).normalize(),
      );
    }
    for (const s of [-1, 1]) {
      limb(
        standing,
        [s * 0.28 * broad, 1.3, 0],
        [s * 0.36, 0.77, 0],
        0.09,
        cloth,
      );
      sphere(0.085, s * 0.36, 0.7, 0, skin, standing);
      limb(riding, [s * 0.24, 1.3, 0.04], [s * 0.38, 1, 0.35], 0.1, cloth);
      limb(riding, [s * 0.38, 1, 0.35], [s * 0.4, 0.78, 0.85], 0.075, skin);
      limb(riding, [s * 0.22, 0.62, 0], [s * 0.43, 0.3, 0.38], 0.11, pants);
      limb(riding, [s * 0.43, 0.3, 0.38], [s * 0.43, 0.02, 0.15], 0.09, pants);
      box(0.23, shoeSize, 0.35, s * 0.43, 0.02, 0.28, footwear, riding);
    }
    riding.visible = false;
    rig = { standing, riding, legs };
    group.userData.appearance = look;
    group.userData.outfitCut = cut;
    group.userData.silhouette = male
      ? "lean-athletic"
      : female
        ? "soft-curved"
        : "neutral";
  }
  function pose(state) {
    const riding = state.mode === "drive" && state.vehicle?.type === "moto";
    group.visible = state.mode === "walk" || riding;
    const heading = riding ? state.vehicle.heading : state.heading || 0;
    group.position.set(
      riding ? -Math.sin(heading) * 0.15 : 0,
      riding ? 0.52 : 0,
      riding ? -Math.cos(heading) * 0.15 : 0,
    );
    group.rotation.y = heading;
    rig.standing.visible = !riding;
    rig.riding.visible = riding;
    rig.legs.forEach(
      (leg, i) =>
        (leg.rotation.x =
          !riding && state.speed > 0.1
            ? Math.sin(performance.now() / 130 + i * Math.PI) * 0.35
            : 0),
    );
  }
  rebuild(initial);
  return {
    group,
    setAppearance: rebuild,
    pose,
    dispose: () => disposeMeshes(group),
  };
}
export function disposeMeshes(root) {
  const geometries = new Set(),
    materials = new Set();
  root.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) materials.add(o.material);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

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
      shoes = style(look.shoes);
    const hairStyle = hairstyle(look.hair, look.gender),
      cut = outfitCut(look);
    const female = cut === "female",
      male = cut === "male";
    const mat = (color) => new T.MeshLambertMaterial({ color });
    const cloth = mat(top.top),
      pants = mat(bottom.bottom),
      footwear = mat(shoes.shoe);
    const skin = mat(SKIN_TONES.find((item) => item.id === look.skin).color),
      hair = mat(hairStyle.hair);
    const dark = mat(0x302d2c),
      sole = mat(0xe2d9c8);
    const seam = mat(new T.Color(top.top).multiplyScalar(0.76));
    const inner = mat(0xf0e7d4);
    const upper = new T.Group(),
      standing = new T.Group(),
      riding = new T.Group();
    group.add(upper, standing, riding);
    function add(geometry, material, position, parent = upper, name = "") {
      const object = new T.Mesh(geometry, material);
      object.position.set(...position);
      object.castShadow = true;
      object.name = name;
      parent.add(object);
      return object;
    }
    function oval(x, y, z, w, h, d, material, parent = upper, name = "") {
      const object = add(
        new T.SphereGeometry(1, 14, 10),
        material,
        [x, y, z],
        parent,
        name,
      );
      object.scale.set(w, h, d);
      return object;
    }
    function box(w, h, d, x, y, z, material, parent = upper, name = "") {
      return add(new T.BoxGeometry(w, h, d), material, [x, y, z], parent, name);
    }
    function limb(a, b, r1, r2, material, parent = upper, name = "") {
      const start = new T.Vector3(...a),
        end = new T.Vector3(...b);
      const object = add(
        new T.CylinderGeometry(r1, r2, start.distanceTo(end), 10),
        material,
        [0, 0, 0],
        parent,
        name,
      );
      object.position.copy(start).add(end).multiplyScalar(0.5);
      object.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        start.sub(end).normalize(),
      );
      return object;
    }
    function curve(points, radius, material, parent = upper, name = "") {
      return add(
        new T.TubeGeometry(
          new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
          8,
          radius,
          5,
          false,
        ),
        material,
        [0, 0, 0],
        parent,
        name,
      );
    }
    const oversized = ["hoodie", "oversized"].includes(top.topShape);
    const shoulder = male ? 0.25 : female ? 0.21 : 0.23;
    const hip = female ? 0.225 : 0.205,
      waist = oversized ? 0.24 : female ? 0.155 : 0.185;
    const profile = [
      [hip, 0.89],
      [hip, 0.96],
      [waist, 1.12],
      [shoulder, 1.42],
      [shoulder * 0.9, 1.51],
      [0.09, 1.56],
    ];
    const torso = add(
      new T.LatheGeometry(
        profile.map(([r, y]) => new T.Vector2(r, y)),
        18,
      ),
      cloth,
      [0, 0, 0],
      upper,
      "clothed-torso",
    );
    torso.scale.z = 0.67;
    add(
      new T.CylinderGeometry(0.065, 0.075, 0.18, 12),
      skin,
      [0, 1.6, 0],
      upper,
      "neck",
    );
    const head = new T.Group();
    head.name = "illustrated-head";
    head.position.y = 1.84;
    upper.add(head);
    oval(0, 0, 0, 0.145, 0.18, 0.135, skin, head, "sculpted-face");
    // A restrained chin and cheek plane replace the old spherical doll head.
    oval(
      0,
      -0.095,
      0.025,
      female ? 0.103 : 0.115,
      0.075,
      0.101,
      skin,
      head,
      "jawline",
    );
    for (const side of [-1, 1]) {
      oval(side * 0.143, -0.006, 0, 0.025, 0.043, 0.022, skin, head, "ear");
      oval(
        side * 0.057,
        0.027,
        0.119,
        0.034,
        0.017,
        0.015,
        inner,
        head,
        "eye-white",
      );
      oval(
        side * 0.057,
        0.027,
        0.134,
        0.014,
        0.016,
        0.006,
        mat(0x53412e),
        head,
        "iris",
      );
      oval(side * 0.057, 0.027, 0.14, 0.007, 0.011, 0.004, dark, head, "pupil");
      oval(
        side * 0.052,
        0.032,
        0.143,
        0.0035,
        0.004,
        0.002,
        inner,
        head,
        "eye-highlight",
      );
      curve(
        [
          [side * 0.028, 0.075, 0.121],
          [side * 0.058, 0.083, 0.125],
          [side * 0.087, 0.073, 0.109],
        ],
        0.006,
        hair,
        head,
        "eyebrow",
      );
      curve(
        [
          [side * 0.027, 0.035, 0.133],
          [side * 0.058, 0.044, 0.14],
          [side * 0.086, 0.034, 0.122],
        ],
        female ? 0.004 : 0.003,
        dark,
        head,
        "eyelid",
      );
    }
    oval(0, -0.014, 0.134, 0.019, 0.032, 0.028, skin, head, "nose");
    curve(
      [
        [-0.028, -0.073, 0.121],
        [0, -0.079, 0.129],
        [0.029, -0.069, 0.121],
      ],
      0.004,
      mat(0x9b6156),
      head,
      "subtle-smile",
    );
    const scalp = add(
      new T.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.48),
      hair,
      [0, 0.045, -0.008],
      head,
      "hair-cap",
    );
    scalp.scale.set(0.155, 0.17, 0.145);
    const shape = hairStyle.hairShape;
    const long = ["long", "waves", "braids", "bob"].includes(shape);
    if (long) {
      const length = ["long", "waves", "braids"].includes(shape) ? 0.44 : 0.24;
      for (const side of [-1, 1])
        for (let i = 0; i < 3; i++) {
          const x = side * (0.12 + i * 0.014),
            z = -0.035 - i * 0.026;
          curve(
            [
              [x, 0.12, z],
              [x * 1.18, -0.02, z],
              [x * 1.1, -length * 0.65, z + 0.015],
              [x * 0.92, -length, z + 0.04],
            ],
            shape === "braids" ? 0.025 : 0.039,
            hair,
            head,
            "hair-lock",
          );
        }
      oval(
        0,
        -length * 0.38,
        -0.095,
        0.14,
        length * 0.65,
        0.07,
        hair,
        head,
        "back-hair",
      );
    }
    if (["bun", "ponytail"].includes(shape)) {
      oval(
        0,
        0.06,
        -0.18,
        0.082,
        shape === "bun" ? 0.075 : 0.1,
        0.08,
        hair,
        head,
        "tied-hair",
      );
      if (shape === "ponytail")
        curve(
          [
            [0, 0.05, -0.2],
            [0.01, -0.12, -0.23],
            [0.035, -0.36, -0.19],
          ],
          0.055,
          hair,
          head,
          "ponytail",
        );
    }
    if (shape === "curls")
      for (let i = 0; i < 9; i++) {
        const a = (i * Math.PI * 2) / 9;
        oval(
          Math.cos(a) * 0.115,
          0.14 + (i % 2) * 0.02,
          Math.sin(a) * 0.1,
          0.065,
          0.065,
          0.06,
          hair,
          head,
          "curl",
        );
      }
    if (shape === "mohawk") {
      scalp.scale.y = 0.09;
      for (let i = 0; i < 5; i++)
        oval(
          0,
          0.22,
          -0.11 + i * 0.055,
          0.035,
          0.08,
          0.045,
          hair,
          head,
          "mohawk",
        );
    } else if (!["bun", "ponytail", "braids"].includes(shape)) {
      const short = ["fade", "cropped", "pixie"].includes(shape);
      for (let i = 0; i < 4; i++) {
        const lift = short ? 0 : shape === "quiff" ? 0.035 : 0.012;
        curve(
          [
            [-0.12, 0.1 + i * 0.018, 0.07],
            [-0.025, 0.16 + lift + i * 0.012, 0.135],
            [0.11, 0.055 + i * 0.015, 0.105],
          ],
          short ? 0.016 : 0.022,
          hair,
          head,
          "swept-fringe",
        );
      }
    }
    // Garment construction: slim collars, lapels, button plackets and seams.
    curve(
      [
        [-0.082, 1.535, 0.035],
        [0, 1.49, 0.083],
        [0.082, 1.535, 0.035],
      ],
      0.012,
      oversized ? seam : inner,
      upper,
      "neckline",
    );
    if (["jacket", "vest"].includes(top.topShape)) {
      box(0.11, 0.49, 0.015, 0, 1.21, 0.145, inner, upper, "undershirt");
      for (const side of [-1, 1]) {
        const lapel = box(
          0.065,
          0.26,
          0.02,
          side * 0.073,
          1.4,
          0.155,
          cloth,
          upper,
          "lapel",
        );
        lapel.rotation.z = side * 0.28;
        box(
          0.085,
          0.015,
          0.014,
          side * 0.135,
          1.18,
          0.146,
          seam,
          upper,
          "pocket-welt",
        );
      }
    }
    if (["polo", "blouse", "jacket"].includes(top.topShape)) {
      for (const side of [-1, 1]) {
        const collar = box(
          0.072,
          0.09,
          0.018,
          side * 0.052,
          1.51,
          0.09,
          cloth,
          upper,
          "shirt-collar",
        );
        collar.rotation.z = side * 0.4;
      }
      for (const y of [1.22, 1.32, 1.42])
        oval(0, y, 0.15, 0.009, 0.009, 0.006, seam, upper, "shirt-button");
    }
    if (top.topShape === "hoodie") {
      oval(0, 1.48, -0.09, 0.15, 0.13, 0.105, cloth, upper, "hood");
      for (const side of [-1, 1])
        curve(
          [
            [side * 0.055, 1.49, 0.1],
            [side * 0.06, 1.27, 0.14],
          ],
          0.005,
          inner,
        );
      box(0.2, 0.012, 0.015, 0, 1.04, 0.15, seam, upper, "hoodie-pocket");
    }
    if (top.id === "rapper")
      curve(
        [
          [-0.075, 1.5, 0.07],
          [-0.06, 1.32, 0.16],
          [0, 1.27, 0.17],
          [0.06, 1.32, 0.16],
          [0.075, 1.5, 0.07],
        ],
        0.01,
        mat(0xcbb06d),
        upper,
        "chain",
      );
    const arms = [],
      legs = [],
      elbows = [],
      snacks = [];
    function hand(parent, x, y, z) {
      oval(x, y, z, 0.043, 0.064, 0.028, skin, parent, "hand");
      oval(
        x * 0.98 + 0.028,
        y + 0.015,
        z + 0.012,
        0.02,
        0.036,
        0.021,
        skin,
        parent,
        "thumb",
      );
    }
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(side * (shoulder + 0.015), 1.46, 0);
      standing.add(arm);
      arms.push(arm);
      const shortSleeve = ["tee", "polo", "jersey", "blouse"].includes(
        top.topShape,
      );
      oval(0, -0.025, 0, 0.09, 0.105, 0.092, cloth, arm, "shoulder");
      limb(
        [0, 0, 0],
        [side * 0.045, -0.29, 0.005],
        0.078,
        0.065,
        shortSleeve ? skin : cloth,
        arm,
        "upper-arm",
      );
      if (shortSleeve)
        limb(
          [0, 0.005, 0],
          [side * 0.02, -0.13, 0],
          0.092,
          0.079,
          cloth,
          arm,
          "short-sleeve",
        );
      oval(
        side * 0.045,
        -0.29,
        0.005,
        0.06,
        0.062,
        0.058,
        shortSleeve ? skin : cloth,
        arm,
        "elbow",
      );
      const elbow = new T.Group();
      elbow.position.set(side * 0.045, -0.29, 0.005);
      arm.add(elbow);
      elbows.push(elbow);
      limb(
        [0, 0, 0],
        [-side * 0.01, -0.27, 0.035],
        0.063,
        0.043,
        shortSleeve ? skin : cloth,
        elbow,
        "forearm",
      );
      hand(elbow, -side * 0.01, -0.32, 0.035);
      const snack = oval(
        -side * 0.01,
        -0.36,
        0.05,
        0.045,
        0.06,
        0.045,
        mat(0xe6b56e),
        elbow,
        "held-snack",
      );
      snack.visible = false;
      snacks.push(snack);
      const leg = new T.Group();
      leg.position.set(side * (female ? 0.115 : 0.105), 0.9, 0);
      standing.add(leg);
      legs.push(leg);
      const shorts = bottom.bottomShape === "shorts",
        skirt = bottom.bottomShape === "skirt",
        wide = bottom.bottomShape === "wide";
      const legmat = skirt ? skin : pants;
      limb(
        [0, 0, 0],
        [0, -0.39, 0.025],
        wide ? 0.105 : 0.097,
        wide ? 0.105 : 0.071,
        legmat,
        leg,
        "trouser-thigh",
      );
      limb(
        [0, -0.39, 0.025],
        [0, -0.77, 0],
        wide ? 0.105 : 0.075,
        wide ? 0.11 : 0.057,
        shorts || skirt ? skin : pants,
        leg,
        "trouser-calf",
      );
      if (bottom.bottomShape === "cargo")
        box(
          0.05,
          0.13,
          0.12,
          side * 0.08,
          -0.24,
          0,
          pants,
          leg,
          "cargo-pocket",
        );
      const boot =
        shoes.shoeShape === "boots" || shoes.shoeShape === "high-tops";
      oval(
        0,
        -0.8,
        0.045,
        0.085,
        boot ? 0.1 : 0.055,
        0.145,
        footwear,
        leg,
        "shaped-shoe",
      );
      if (["sneakers", "high-tops"].includes(shoes.shoeShape)) {
        oval(0, -0.835, 0.048, 0.087, 0.019, 0.146, sole, leg, "shoe-sole");
        for (const z of [0.06, 0.09, 0.12])
          box(0.075, 0.008, 0.009, 0, -0.751, z, sole, leg, "shoe-lace");
      }
      if (skirt) continue;
      // A subtle crease gives tailored trousers a clearer cloth silhouette.
      if (bottom.bottomShape === "tailored")
        box(
          0.008,
          0.5,
          0.008,
          0,
          -0.32,
          0.077,
          mat(new T.Color(bottom.bottom).multiplyScalar(0.8)),
          leg,
          "trouser-crease",
        );
    }
    if (bottom.bottomShape === "skirt") {
      const skirt = add(
        new T.CylinderGeometry(0.22, 0.34, 0.7, 18),
        pants,
        [0, 0.57, 0],
        standing,
        "flowing-skirt",
      );
      skirt.scale.z = 0.78;
    }
    // Seated rig has independent bent limbs; the torso lowers to meet the saddle.
    for (const side of [-1, 1]) {
      limb(
        [side * 0.24, 1.25, 0],
        [side * 0.34, 1.02, 0.28],
        0.073,
        0.06,
        cloth,
        riding,
      );
      limb(
        [side * 0.34, 1.02, 0.28],
        [side * 0.4, 0.8, 0.82],
        0.06,
        0.04,
        skin,
        riding,
      );
      hand(riding, side * 0.4, 0.79, 0.84);
      limb(
        [side * 0.12, 0.74, 0],
        [side * 0.39, 0.39, 0.35],
        0.09,
        0.075,
        pants,
        riding,
      );
      limb(
        [side * 0.39, 0.39, 0.35],
        [side * 0.4, 0.06, 0.14],
        0.075,
        0.055,
        pants,
        riding,
      );
      oval(side * 0.4, 0.06, 0.22, 0.085, 0.06, 0.14, footwear, riding);
    }
    const seated = new T.Group();
    seated.name = "bench-seated-rig";
    group.add(seated);
    for (const side of [-1, 1]) {
      limb(
        [side * 0.12, 0.76, 0],
        [side * 0.15, 0.7, 0.38],
        0.095,
        0.08,
        pants,
        seated,
      );
      limb(
        [side * 0.15, 0.7, 0.38],
        [side * 0.15, 0.17, 0.43],
        0.08,
        0.055,
        pants,
        seated,
      );
      oval(side * 0.15, 0.12, 0.49, 0.085, 0.055, 0.14, footwear, seated);
    }
    seated.visible = false;
    riding.visible = false;
    rig = { upper, standing, riding, seated, arms, legs, elbows, snacks };
    group.userData.appearance = look;
    group.userData.outfitCut = cut;
    group.userData.proportions = "illustrated-adult";
    group.userData.silhouette =
      look.gender === "male"
        ? "lean-athletic"
        : look.gender === "female"
          ? "soft-curved"
          : "neutral";
  }
  function pose(state) {
    const riding =
      state.mode === "drive" &&
      ["moto", "vespa", "scoopy", "offroad-moto", "racing-moto"].includes(
        state.vehicle?.type,
      );
    group.visible = state.mode === "walk" || riding;
    const heading = riding ? state.vehicle.heading : state.heading || 0;
    group.position.set(
      riding ? -Math.sin(heading) * 0.15 : 0,
      riding ? (state.vehicle.type === "offroad-moto" ? 0.67 : 0.52) : 0,
      riding ? -Math.cos(heading) * 0.15 : 0,
    );
    group.rotation.y = heading;
    const sitting = state.mode === "walk" && state.posture === "sit";
    rig.standing.visible = !riding && !sitting;
    rig.seated.visible = sitting;
    for (const arm of rig.arms) {
      const parent = sitting ? rig.seated : rig.standing;
      if (arm.parent !== parent) parent.add(arm);
      arm.position.y = sitting ? 1.28 : 1.46;
    }
    rig.riding.visible = riding;
    rig.upper.position.y = riding || sitting ? -0.18 : 0;
    rig.upper.rotation.x =
      riding && state.vehicle.type === "racing-moto" ? 0.12 : 0;
    const moving = !riding && !sitting && state.speed > 0.1;
    const running = state.speed > 4.6,
      pace = running ? 95 : 150;
    rig.legs.forEach(
      (leg, i) =>
        (leg.rotation.x = moving
          ? Math.sin(performance.now() / pace + i * Math.PI) *
            (running ? 0.55 : 0.34)
          : 0),
    );
    rig.arms.forEach((arm, i) => {
      arm.rotation.z = 0;
      rig.elbows[i].rotation.x = running ? -0.6 : 0;
      rig.snacks[i].visible = false;
      arm.rotation.x = moving
        ? Math.sin(performance.now() / pace + i * Math.PI + Math.PI) *
          (running ? 0.42 : 0.2)
        : 0;
    });
    if (state.gesture === "eat" && state.gestureSeconds > 0 && !riding) {
      rig.arms[1].rotation.x = -1.5 + Math.sin(performance.now() / 230) * 0.08;
      rig.arms[1].rotation.z = -0.25;
      rig.elbows[1].rotation.x = -1.65;
      rig.snacks[1].visible = true;
    } else if (
      state.gesture === "wave" &&
      state.gestureSeconds > 0 &&
      !riding
    ) {
      rig.arms[1].rotation.z = -2.5 + Math.sin(performance.now() / 150) * 0.15;
    }
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
        (arm, i) =>
          (arm.rotation.z =
            (i === 0 ? -1 : 1) *
            (i === side ? 2.5 + Math.sin(time * 4) * 0.15 : 0.08)),
      );
    },
    dispose: () => disposeMeshes(group),
  };
}
export function disposeMeshes(root) {
  const geometries = new Set(),
    materials = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) materials.add(object.material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

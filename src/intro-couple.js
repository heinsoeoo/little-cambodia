import { finishRenderer } from "./art-direction.js";
import * as T from "three";
import { createCharacter } from "./character.js";
export function buildIntroCouple() {
  const root = new T.Group();
  const hein = createCharacter({
    gender: "male",
    skin: "warm",
    hair: "luxury",
    top: "old-money",
    bottom: "casual",
    shoes: "old-money",
  });
  const claraa = createCharacter({
    gender: "female",
    skin: "light",
    hair: "workwear",
    top: "luxury",
    bottom: "luxury",
    shoes: "luxury",
  });
  hein.group.position.x = -0.52;
  hein.group.scale.setScalar(1.06);
  claraa.group.position.x = 0.5;
  root.add(hein.group, claraa.group);
  for (const person of [hein, claraa])
    person.group.getObjectByName("hair-cap").material.color.setHex(0x29272a);
  const mat = (color) => new T.MeshLambertMaterial({ color });
  const dark = mat(0x242d33),
    navy = mat(0x27394b),
    blue = mat(0x154a77),
    rose = mat(0xc59976);
  const box = (parent, w, h, d, x, y, z, m) => {
    const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  // Glasses share the head rig so they stay fitted during animation.
  const head = hein.group.getObjectByName("illustrated-head");
  for (const x of [-0.06, 0.06]) {
    for (const y of [-0.008, 0.06])
      box(head, 0.108, 0.006, 0.009, x, y, 0.153, dark);
    for (const dx of [-0.054, 0.054])
      box(head, 0.006, 0.068, 0.009, x + dx, 0.026, 0.153, dark);
  }
  box(head, 0.02, 0.006, 0.009, 0, 0.035, 0.155, dark);
  // Exactly one watch: navy woven-looking band, blue dial and rose-gold rim.
  const watch = new T.Group();
  watch.name = "hein-single-watch";
  watch.position.set(-0.04, -0.52, 0.04);
  const strap = new T.Mesh(new T.TorusGeometry(0.05, 0.014, 6, 12), navy);
  strap.rotation.x = Math.PI / 2;
  watch.add(strap);
  for (const [radius, depth, z, material] of [
    [0.043, 0.014, 0.04, rose],
    [0.036, 0.016, 0.049, blue],
  ]) {
    const dial = new T.Mesh(
      new T.CylinderGeometry(radius, radius, depth, 14),
      material,
    );
    dial.rotation.x = Math.PI / 2;
    dial.position.z = z;
    watch.add(dial);
  }
  hein.arms[0].add(watch);
  // Recolor the polo without changing the game's underlying avatar geometry.
  const shirt = hein.group.getObjectByName("clothed-torso").material;
  shirt.color.setHex(0x263749);
  const stage = new T.Mesh(
    new T.CylinderGeometry(1.55, 1.7, 0.12, 40),
    mat(0xc9b68c),
  );
  stage.position.y = -0.08;
  root.add(stage);
  for (const x of [-0.52, 0.5]) {
    const shadow = new T.Mesh(
      new T.CircleGeometry(0.36, 24),
      new T.MeshBasicMaterial({
        color: 0x435348,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1, 0.6, 1);
    shadow.position.set(x, 0.001, 0);
    root.add(shadow);
  }
  return {
    root,
    hein,
    claraa,
    update(seconds, animated = true) {
      const t = animated ? seconds : 0;
      hein.greet(t, 0);
      claraa.greet(t + 0.7, 1);
      hein.group.rotation.y = 0.12 + (animated ? Math.sin(t * 0.7) * 0.035 : 0);
      claraa.group.rotation.y =
        -0.12 + (animated ? Math.sin(t * 0.7 + 1) * 0.035 : 0);
      hein.group.position.y = animated ? Math.sin(t * 1.6) * 0.012 : 0;
      claraa.group.position.y = animated ? Math.sin(t * 1.6 + 0.4) * 0.012 : 0;
    },
  };
}
export function createIntroCouple(canvas) {
  let renderer,
    scene,
    camera,
    couple,
    lastWidth = 0,
    lastHeight = 0,
    start = null,
    failed = false;
  return {
    render(now, visible, animated) {
      if (!visible) {
        start = null;
        return;
      }
      if (failed) return;
      try {
        if (!renderer) {
          renderer = new T.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
          });
          renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
          finishRenderer(renderer);
          scene = new T.Scene();
          camera = new T.PerspectiveCamera(31, 1, 0.1, 40);
          camera.position.set(0.2, 2.5, 6.4);
          camera.lookAt(0, 1, 0);
          scene.add(new T.HemisphereLight(0xfff2d3, 0x53645b, 2.2));
          const light = new T.DirectionalLight(0xffdfaf, 2);
          light.position.set(-3, 5, 4);
          scene.add(light);
          couple = buildIntroCouple();
          scene.add(couple.root);
          canvas.hidden = false;
          document.getElementById("intro-couple-fallback").hidden = true;
        }
        const { width, height } = canvas.parentElement.getBoundingClientRect();
        if (!width || !height) return;
        if (width !== lastWidth || height !== lastHeight) {
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.position.z = Math.max(
            6.4,
            3.65 / (2 * Math.tan((31 * Math.PI) / 360) * camera.aspect),
          );
          camera.lookAt(0, 1, 0);
          camera.updateProjectionMatrix();
          lastWidth = width;
          lastHeight = height;
        }
        if (start === null) start = now;
        couple.update((now - start) / 1000, animated);
        renderer.render(scene, camera);
      } catch {
        failed = true;
        canvas.hidden = true;
        const fallback = document.getElementById("intro-couple-fallback");
        if (!fallback.getAttribute("src")) fallback.src = fallback.dataset.src;
        fallback.hidden = false;
      }
    },
  };
}

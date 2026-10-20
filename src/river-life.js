import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { insidePolygon } from "./buildings.js";
import { project } from "./geo.js";
import { samplePath } from "./riverside.js";

export function buildBoatRoute(map, city) {
  const rivers = map.water.filter(
    (w) => w.river || w.id === city.riverside?.riverWay,
  );
  if (!rivers.length) return [];
  const north = project(
    city.origin[0],
    city.bounds[3] - 0.0004,
    city.origin,
  )[1];
  const south = project(
    city.origin[0],
    city.bounds[1] + 0.0004,
    city.origin,
  )[1];
  let longest = [],
    current = [];
  for (let z = north; z <= south; z += 24) {
    const crossings = [];
    for (const river of rivers)
      for (let i = 1; i < river.points.length; i++) {
        const a = river.points[i - 1],
          b = river.points[i];
        if (a[1] > z !== b[1] > z)
          crossings.push(a[0] + ((z - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    crossings.sort((a, b) => a - b);
    let point;
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const width = crossings[i + 1] - crossings[i];
      if (width < 80) continue;
      const x = crossings[i] + Math.min(55, width * 0.4);
      const valid = [
        [-9, -17],
        [-9, 17],
        [9, -17],
        [9, 17],
        [0, 0],
      ].every(([dx, dz]) =>
        rivers.some((river) => insidePolygon(x + dx, z + dz, river.points)),
      );
      if (valid) {
        point = [x, z];
        break;
      }
    }
    if (
      point &&
      (!current.length || Math.hypot(point[0] - current.at(-1)[0], 24) < 48)
    )
      current.push(point);
    else {
      if (current.length > longest.length) longest = current;
      current = point ? [point] : [];
    }
  }
  if (current.length > longest.length) longest = current;
  return longest;
}
export function animateRiverMaterial(material) {
  const uniforms = { riverTime: { value: 0 }, riverNight: { value: 0 } };
  material.color.setHex(0x719d98);
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = "varying vec2 riverPosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nriverPosition=position.xz;",
    );
    shader.fragmentShader =
      "varying vec2 riverPosition;\nuniform float riverTime;\nuniform float riverNight;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float wave=sin(riverPosition.x*.8+riverPosition.y*.17-riverTime*1.4)*sin(riverPosition.y*.46+riverTime*.7);
      float shimmer=pow(max(0.0,sin(riverPosition.y*1.6+riverPosition.x*.12+wave*.8-riverTime*1.7)),12.0);
      vec3 dayWater=vec3(.35,.55,.53)+wave*.025+shimmer*.045;
      vec3 nightWater=vec3(.065,.17,.22)+wave*.014+shimmer*vec3(.04,.09,.10);
      diffuseColor.rgb=mix(dayWater,nightWater,riverNight);
    `,
    );
  };
  material.customProgramCacheKey = () => "living-river-v1";
  return uniforms;
}
function cruiseBoat(index) {
  const group = new T.Group(),
    parts = [],
    lamps = [];
  const add = (w, h, d, x, y, z, color, light = false) => {
    const g = new T.BoxGeometry(w, h, d).toNonIndexed();
    g.translate(x, y, z);
    const c = new T.Color(color),
      colors = [];
    for (let i = 0; i < g.attributes.position.count; i++)
      colors.push(c.r, c.g, c.b);
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    (light ? lamps : parts).push(g);
  };
  const colors = [0xe1bc83, 0xb4c6bc, 0xd0a58b, 0x9fb2bf],
    trim = [0xffb14a, 0xe377ff, 0x78ece4, 0xff90c0];
  add(5, 1.1, 17, 0, 1, 0, 0x664d3f);
  add(4.7, 0.25, 16.5, 0, 1.7, 0, 0xe2d5b1);
  add(3.8, 1.6, 11.5, 0, 2.55, -0.4, colors[index % 4]);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++)
      add(0.06, 1, 1, side * 1.93, 2.6, -4.9 + i * 1.5, 0x375665);
    add(0.1, 0.16, 15, side * 2.4, 1.9, 0, trim[index % 4], true);
    add(0.12, 0.14, 12.5, side * 2.1, 3.75, -0.4, trim[index % 4], true);
    for (let i = 0; i < 9; i++)
      add(0.16, 0.18, 0.16, side * 2.15, 4.8, -6 + i * 1.4, 0xffdc98, true);
  }
  add(4.4, 0.18, 12.7, 0, 3.6, -0.4, 0xdac79d);
  add(3.4, 0.15, 8, 0, 4.6, -1, colors[index % 4]);
  for (const x of [-1.6, 1.6])
    for (const z of [-4.5, 2.5]) add(0.09, 1, 0.09, x, 4.1, z, 0x8b7051);
  for (const side of [-1, 1]) {
    add(0.22, 0.22, 12.9, side * 2.25, 3.82, -0.4, trim[index % 4], true);
    add(0.2, 0.2, 8.2, side * 1.8, 4.8, -1, trim[index % 4], true);
    add(4.5, 0.22, 0.22, 0, 3.82, -0.4 + side * 6.45, 0xffd87b, true);
    add(3.6, 0.2, 0.2, 0, 4.8, -1 + side * 4.1, 0xffd87b, true);
  }
  const body = new T.Mesh(
    mergeGeometries(parts),
    new T.MeshLambertMaterial({ vertexColors: true }),
  );
  const light = new T.Mesh(
    mergeGeometries(lamps),
    new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  );
  group.add(body, light);
  group.scale.setScalar(1.25);
  parts.concat(lamps).forEach((g) => g.dispose());
  const reflection = new T.Mesh(
    new T.PlaneGeometry(8, 26),
    new T.MeshBasicMaterial({
      color: trim[index % 4],
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  reflection.rotation.x = -Math.PI / 2;
  reflection.position.set(0, 0.025, -4);
  group.add(reflection);
  const wake = new T.Mesh(
    new T.RingGeometry(3, 3.25, 16, 1, 0, Math.PI),
    new T.MeshBasicMaterial({
      color: 0xc5ded1,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  wake.rotation.x = -Math.PI / 2;
  wake.scale.set(1, 2, 1);
  wake.position.set(0, 0.04, -10);
  group.add(wake);
  return { group, light, reflection, wake };
}
export function createRiverLife(scene, map, city, uniforms) {
  const route = buildBoatRoute(map, city),
    length = route
      .slice(1)
      .reduce(
        (sum, p, i) => sum + Math.hypot(p[0] - route[i][0], p[1] - route[i][1]),
        0,
      );
  const boats =
    route.length > 2 ? Array.from({ length: 4 }, (_, i) => cruiseBoat(i)) : [];
  boats.forEach((b) => scene.add(b.group));
  const openingZ = project(city.origin[0], 11.5755, city.origin)[1];
  const openingIndex = route.reduce(
    (best, p, i) =>
      Math.abs(p[1] - openingZ) < Math.abs(route[best][1] - openingZ)
        ? i
        : best,
    0,
  );
  const openingPhase = route.length > 1 ? openingIndex / (route.length - 1) : 0;
  let elapsed = 0;
  return {
    route,
    boats,
    update(dt, night) {
      elapsed += dt;
      uniforms.riverTime.value = elapsed;
      uniforms.riverNight.value = night ? 1 : 0;
      boats.forEach((boat, i) => {
        const phase = ((elapsed * 3.4) / length + openingPhase + i / 4) % 2,
          forward = phase < 1;
        const sample = samplePath(route, forward ? phase : 2 - phase);
        boat.group.position.set(
          sample.point[0],
          Math.sin(elapsed * 1.2 + i) * 0.08,
          sample.point[1],
        );
        boat.group.rotation.set(
          Math.sin(elapsed * 0.8 + i) * 0.008,
          sample.heading + (forward ? 0 : Math.PI),
          Math.sin(elapsed + i) * 0.012,
        );
        boat.light.visible = boat.reflection.visible = night;
        boat.reflection.material.opacity =
          0.08 + Math.sin(elapsed * 2 + i) * 0.025;
        boat.wake.material.opacity = 0.15 + Math.sin(elapsed * 1.6 + i) * 0.04;
      });
    },
  };
}

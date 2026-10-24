import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createCharacter } from "./luma-models.js";

// Instance the actual reference character rather than a separate simplified NPC.
// Split only at its original arm/leg joints so walking still animates cheaply.
export function createLumaCrowd(parent, capacity = 262) {
  const source = createCharacter(),
    rig = source.userData,
    bins = new Map();
  source.updateMatrixWorld(true);
  source.traverse((o) => {
    if (!o.isMesh) return;
    const bone = [...rig.legs, ...rig.arms].find((b) => {
      let n = o;
      while (n) {
        if (n === b) return true;
        n = n.parent;
      }
      return false;
    });
    const key = `${bone?.uuid || "body"}:${o.material.uuid}`;
    if (!bins.has(key))
      bins.set(key, { bone, material: o.material, geometries: [] });
    const geo = o.geometry.index
      ? o.geometry.toNonIndexed()
      : o.geometry.clone();
    const transform = bone
      ? new T.Matrix4().copy(bone.matrixWorld).invert().multiply(o.matrixWorld)
      : o.matrixWorld;
    geo.applyMatrix4(transform);
    bins.get(key).geometries.push(geo);
  });
  const parts = [];
  for (const entry of bins.values()) {
    const geometry = mergeGeometries(entry.geometries),
      material = entry.material.clone();
    const clothing = entry.material === rig.jacket;
    if (clothing) material.color.setHex(0xffffff);
    const mesh = new T.InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    parent.add(mesh);
    parts.push({ ...entry, mesh, clothing });
    entry.geometries.forEach((g) => g.dispose());
  }
  const root = new T.Matrix4(),
    local = new T.Matrix4(),
    out = new T.Matrix4(),
    q = new T.Quaternion(),
    p = new T.Vector3(),
    one = new T.Vector3(1, 1, 1),
    axis = new T.Vector3(1, 0, 0),
    up = new T.Vector3(0, 1, 0),
    color = new T.Color();
  const palette = [0xe1b36b, 0x719caa, 0xd97869, 0x8ba77b, 0xf0d6a8, 0x927aa4];
  return {
    pose(index, point, heading, time, moving, seed = index) {
      root.compose(
        p.set(
          point[0],
          -0.055 + (moving ? Math.sin(time * 5 + seed) * 0.025 : 0),
          point[1],
        ),
        q.setFromAxisAngle(up, heading),
        one,
      );
      for (const part of parts) {
        if (part.bone) {
          const li = rig.legs.indexOf(part.bone),
            ai = rig.arms.indexOf(part.bone),
            i = li >= 0 ? li : ai;
          const swing = moving
            ? Math.sin(time * 5 + seed + i * Math.PI) * (li >= 0 ? 0.6 : -0.45)
            : 0;
          local.compose(
            part.bone.position,
            q.setFromAxisAngle(axis, swing),
            one,
          );
          out.multiplyMatrices(root, local);
        } else out.copy(root);
        part.mesh.setMatrixAt(index, out);
        if (part.clothing)
          part.mesh.setColorAt(
            index,
            color.setHex(palette[seed % palette.length]),
          );
      }
    },
    flush(count) {
      for (const { mesh } of parts) {
        mesh.count = count;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    },
  };
}

import * as T from "three";
let poolTexture;
function softPool() {
  if (poolTexture) return poolTexture;
  const size = 64,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const along = 1 - y / (size - 1),
        across = (x / (size - 1) - 0.5) * 2;
      const spread = 0.18 + along * 0.8;
      const alpha =
        Math.exp(-4 * (across / spread) ** 2) *
        Math.sin(Math.PI * along) ** 0.8 *
        (1 - along * 0.65);
      const offset = (y * size + x) * 4;
      data[offset] = data[offset + 1] = data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  poolTexture = new T.DataTexture(data, size, size);
  poolTexture.magFilter = poolTexture.minFilter = T.LinearFilter;
  poolTexture.needsUpdate = true;
  return poolTexture;
}
export function addVehicleLighting(group, spec, headlamp, tailLamp) {
  const root = new T.Group();
  root.name = "vehicle-road-lighting";
  root.visible = false;
  const car = ["sedan", "coupe", "hatch", "suv", "pickup"].includes(spec.kind);
  const front = car ? spec.length / 2 : spec.kind === "bike" ? 1 : 1.4;
  const rear = car ? -spec.length / 2 : spec.kind === "bike" ? -1 : -1.6;
  const headMaterial = new T.MeshBasicMaterial({
    color: 0xffe7ae,
    map: softPool(),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: T.AdditiveBlending,
    toneMapped: false,
  });
  const brakeMaterial = new T.MeshBasicMaterial({
    color: 0xf43f30,
    map: softPool(),
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    blending: T.AdditiveBlending,
    toneMapped: false,
  });
  const paired = car || spec.kind === "tuktuk";
  for (const x of paired ? [-0.48, 0.48] : [0]) {
    const pool = new T.Mesh(
      new T.PlaneGeometry(paired ? 3.2 : 2.2, 6),
      headMaterial,
    );
    pool.name = "headlight-road-pool";
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.135, front + 2.9);
    pool.renderOrder = 2;
    root.add(pool);
  }
  const brake = new T.Mesh(
    new T.PlaneGeometry(car ? 2.5 : 1.1, 2),
    brakeMaterial,
  );
  brake.name = "brake-road-glow";
  brake.rotation.x = -Math.PI / 2;
  brake.rotation.z = Math.PI;
  brake.position.set(0, 0.137, rear - 0.85);
  brake.renderOrder = 2;
  root.add(brake);
  group.add(root);
  group.userData.lighting = {
    root,
    headlamp,
    tailLamp,
    headMaterial,
    brakeMaterial,
  };
}
export function updateVehicleLighting(
  group,
  { night = false, driving = false, braking = false } = {},
) {
  const lighting = group.userData.lighting;
  if (!lighting) return;
  lighting.root.visible = Boolean(night && driving);
  lighting.headlamp.color.setHex(night && driving ? 0xffedbf : 0xc9c6ae);
  lighting.tailLamp.color.setHex(
    braking && driving ? 0xff4935 : night && driving ? 0xd72d25 : 0x8c2927,
  );
  lighting.brakeMaterial.opacity = braking ? 0.48 : 0.12;
}

import * as T from "three";
import { insidePolygon } from "./buildings.js";
import { riversidePath } from "./riverside.js";

export function makeTownWorld(scene, map, city) {
  const material = new T.MeshBasicMaterial({ color: 0xffffff });
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 960;
    const c = canvas.getContext("2d");
    c.imageSmoothingEnabled = false;
    const px = (x) => Math.round((x + 128) * 3),
      pz = (z) => Math.round((z + 160) * 3);
    const rect = (x, z, w, d, color) => {
      c.fillStyle = color;
      c.fillRect(px(x), pz(z), Math.round(w * 3), Math.round(d * 3));
    };
    rect(-128, -160, 256, 320, "#91b86c");
    for (let i = 0; i < 1800; i++) {
      const x = ((i * 37) % 256) - 128,
        z = ((i * 53) % 320) - 160;
      rect(x, z, 0.5, 0.6, i % 3 ? "#86ac61" : "#a5c67c");
    }
    // A bank made of distinct grass / paving / sand / water bands.
    rect(80, -160, 8, 320, "#afc184");
    rect(88, -160, 7, 320, "#d7c69a");
    rect(95, -160, 2, 320, "#f2dba0");
    rect(97, -160, 31, 320, "#68a9bb");
    for (let z = -158; z < 158; z += 5)
      for (let x = 100; x < 128; x += 9)
        rect(x + (Math.floor(z) % 2), z, 3, 0.35, "#9dced0");
    for (const r of map.roads)
      for (let i = 1; i < r.points.length; i++) {
        const a = r.points[i - 1],
          b = r.points[i],
          w = r.width;
        rect(
          Math.min(a[0], b[0]) - w / 2 - 1.5,
          Math.min(a[1], b[1]) - w / 2 - 1.5,
          Math.abs(b[0] - a[0]) + w + 3,
          Math.abs(b[1] - a[1]) + w + 3,
          "#e1ca98",
        );
      }
    for (const r of map.roads)
      for (let i = 1; i < r.points.length; i++) {
        const a = r.points[i - 1],
          b = r.points[i],
          w = r.width;
        rect(
          Math.min(a[0], b[0]) - w / 2,
          Math.min(a[1], b[1]) - w / 2,
          Math.abs(b[0] - a[0]) + w,
          Math.abs(b[1] - a[1]) + w,
          "#baa184",
        );
      }
    // House sprites have a short front wall, clear roof ridge and a garden path.
    for (const b of map.buildings) {
      const x = b.points[0][0],
        z = b.points[0][1],
        w = b.points[1][0] - x,
        d = b.points[2][1] - z;
      rect(x + 1, z + 1, w, d + 1, "#76905b");
      rect(x, z, w, d, "#624e43");
      rect(
        x + 0.7,
        z + 0.7,
        w - 1.4,
        d - 1.4,
        b.id % 3 === 0 ? "#edcf98" : "#f5dfb4",
      );
      const roof =
        b.kind === "shop" ? "#689486" : b.id % 3 ? "#c57959" : "#ae695a";
      rect(x - 0.6, z - 0.6, w + 1.2, d - 4, "#684d40");
      rect(x - 0.1, z, w + 0.2, d - 5, roof);
      rect(x, z + (d - 5) / 2, w, 0.7, "#e3a27a");
      for (let yy = z + 2; yy < z + d - 5; yy += 2)
        for (let xx = x + 1; xx < x + w - 1; xx += 3.5)
          rect(xx, yy, 2.6, 0.35, "#945e4d");
      rect(x + w / 2 - 1, z + d - 4, 2, 4, "#886044");
      rect(x + 1.5, z + d - 3.6, 2.3, 1.5, "#6c9da1");
      rect(x + w - 4, z + d - 3.6, 2.3, 1.5, "#6c9da1");
      rect(x + w / 2 - 1, z + d, 2, 3, "#dbc798");
      if (b.kind === "shop") {
        rect(x, z + d - 4.8, w, 1, "#f4d7a4");
        for (let xx = x; xx < x + w; xx += 3)
          rect(xx, z + d - 4.8, 1.5, 1, "#bc795c");
      }
    }
    // Market square and a planted town garden replace oversized city blocks.
    rect(-21, -51, 42, 38, "#d7bd8c");
    rect(-19, -49, 38, 34, "#e8d2a3");
    for (let i = 0; i < 4; i++) {
      rect(-16 + i * 9, -43, 6, 6, "#90664b");
      rect(
        -17 + i * 9,
        -44,
        8,
        3,
        ["#cf8d65", "#d8b66c", "#79a18b", "#bd7d70"][i],
      );
    }
    rect(-23, 12, 46, 42, "#73985a");
    rect(-21, 14, 42, 38, "#abd181");
    rect(-3, 14, 6, 38, "#d8c89b");
    rect(-21, 30, 42, 5, "#d8c89b");
    rect(-6, 26, 12, 12, "#bdc7a4");
    rect(-4, 28, 8, 8, "#7fbac2");
    const tree = (x, z) => {
      rect(x + 1, z + 8, 3, 4, "#866349");
      rect(x - 4, z + 2, 12, 9, "#557b4c");
      rect(x - 3, z - 1, 10, 10, "#6d984e");
      rect(x - 1, z, 6, 3, "#8db365");
    };
    for (let z = -145; z < 155; z += 24) {
      tree(-119, z);
      if (z % 3) tree(82, z);
    }
    for (const [x, z] of [
      [-18, 17],
      [13, 17],
      [-18, 42],
      [13, 42],
      [-110, -148],
      [-63, 141],
      [12, -148],
    ])
      tree(x, z);
    for (let i = 0; i < 70; i++) {
      const x = -20 + ((i * 17) % 40),
        z = 17 + ((i * 13) % 32);
      if (Math.abs(x) > 6) {
        rect(x, z, 0.6, 0.6, i % 2 ? "#f2d87d" : "#eaa49a");
      }
    }
    const tex = new T.CanvasTexture(canvas);
    tex.magFilter = tex.minFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = T.SRGBColorSpace;
    material.map = tex;
  }
  const ground = new T.Mesh(new T.PlaneGeometry(256, 320), material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);
  return {
    path: riversidePath(map, city),
    facades: {
      setNight(night) {
        material.color.setHex(night ? 0xbac1d1 : 0xffffff);
      },
    },
    collides(x, z) {
      return (
        x < -124 ||
        x > 79 ||
        z < -155 ||
        z > 155 ||
        map.buildings.some((b) => insidePolygon(x, z, b.points))
      );
    },
  };
}

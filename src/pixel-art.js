import * as T from "three";

export const palette = {
  grass: 0xa6bd91,
  road: 0x758583,
  curb: 0xe8dfca,
  water: 0x83b9ba,
  sky: 0xd9e6dc,
  night: 0x263e51,
};
function texture(width, height, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  paint(ctx);
  const tex = new T.CanvasTexture(canvas);
  tex.magFilter = tex.minFilter = T.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
export function tileTexture(kind) {
  const tex = texture(32, 32, (ctx) => {
    const colors = {
      grass: ["#8eaf5d", "#7c9d50", "#a0bd6b"],
      road: ["#a28a72", "#967d67", "#b0997a"],
      water: ["#639caa", "#78b4bc", "#96cbcb"],
      roof: ["#b76d4d", "#98523e", "#ce8c60"],
      wall: ["#f4dfab", "#e4cc99", "#f9e9bc"],
    }[kind];
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 56; i++) {
      const x = (i * 13 + 3) % 32,
        y = (i * 19 + 7) % 32;
      ctx.fillStyle = colors[1 + (i % 2)];
      ctx.fillRect(x, y, kind === "water" ? 5 : kind === "roof" ? 7 : 2, 1);
    }
    if (kind === "roof") {
      ctx.fillStyle = colors[1];
      for (let y = 0; y < 32; y += 6) ctx.fillRect(0, y, 32, 1);
    }
  });
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  return tex;
}
export function personTexture() {
  const tex = texture(32, 24, (ctx) => {
    for (let frame = 0; frame < 2; frame++) {
      const x = frame * 16;
      const rect = (a, b, w, h, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + a, b, w, h);
      };
      rect(5, 1, 7, 2, "#493c37");
      rect(4, 3, 9, 5, "#493c37");
      rect(5, 4, 7, 6, "#e9b985");
      rect(6, 6, 1, 1, "#493c37");
      rect(10, 6, 1, 1, "#493c37");
      rect(7, 9, 3, 2, "#cc9367");
      rect(5, 11, 7, 8, "#557f77");
      rect(4, 12, 1, 6, "#e9b985");
      rect(12, 12, 1, 6, "#e9b985");
      rect(5, 18, 3, 4, "#4d5058");
      rect(9, 18, 3, 4, "#4d5058");
      rect(4, frame ? 21 : 22, 4, 1, "#493c37");
      rect(9, frame ? 22 : 21, 4, 1, "#493c37");
      rect(6, 11, 5, 1, "#8cbba1");
    }
  });
  tex.repeat.x = 0.5;
  return tex;
}

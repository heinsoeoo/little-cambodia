import * as T from "three";
// A feathered, dithered cutaway only removes fragments in FRONT of the local player.
// Materials stay opaque and batched; distant buildings and shadow rendering are unchanged.
export function createPlayerVisibility() {
  const uniforms = {
    playerCutawayCenter: { value: new T.Vector3() },
    playerCutawayRadius: { value: 0 },
  };
  const projected = new T.Vector3(),
    applied = new WeakSet();
  return {
    uniforms,
    apply(material) {
      if (applied.has(material)) return;
      applied.add(material);
      const previous = material.onBeforeCompile;
      material.onBeforeCompile = function (shader, renderer) {
        previous.call(this, shader, renderer);
        Object.assign(shader.uniforms, uniforms);
        shader.fragmentShader =
          "uniform vec3 playerCutawayCenter;\nuniform float playerCutawayRadius;\n" +
          shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <clipping_planes_fragment>",
          `#include <clipping_planes_fragment>
      if (playerCutawayRadius > 0.0 && gl_FragCoord.z < playerCutawayCenter.z - 0.00001) {
        float cutawayDistance = distance(gl_FragCoord.xy, playerCutawayCenter.xy);
        float cutawayAmount = 1.0 - smoothstep(playerCutawayRadius * 0.55, playerCutawayRadius, cutawayDistance);
        float cutawayDither = fract(dot(floor(gl_FragCoord.xy), vec2(0.754877666, 0.569840296)));
        if (cutawayDither < cutawayAmount) discard;
      }`,
        );
      };
      material.customProgramCacheKey = () => "player-cutaway-v1";
      material.needsUpdate = true;
    },
    update(camera, focus, width, height, pixelRatio = 1, enabled = true) {
      if (!enabled || !focus) {
        uniforms.playerCutawayRadius.value = 0;
        return;
      }
      projected.set(focus.x, 1.2, focus.z).project(camera);
      uniforms.playerCutawayCenter.value.set(
        (projected.x * 0.5 + 0.5) * width * pixelRatio,
        (projected.y * 0.5 + 0.5) * height * pixelRatio,
        projected.z * 0.5 + 0.5,
      );
      uniforms.playerCutawayRadius.value =
        (focus.mode === "drive" ? 72 : 56) * pixelRatio;
    },
  };
}

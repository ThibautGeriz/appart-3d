import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface Pipeline {
  render(): void;
  setSize(width: number, height: number): void;
  /** the ambient occlusion pass, when enabled (for tuning) */
  ao?: GTAOPass;
}

/**
 * How the frame is drawn. Desktop: ground-truth ambient occlusion (soft
 * contact shadows under the furniture, in corners and under cabinets) on an
 * MSAA render target, then tone mapping. Phones: a plain render (budget).
 */
export function createPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  ambientOcclusion: boolean,
): Pipeline {
  if (!ambientOcclusion) {
    return {
      render: () => renderer.render(scene, camera),
      setSize: (w, h) => renderer.setSize(w, h),
    };
  }
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: 4, // keep the antialiasing through the post-processing
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, size.x, size.y);
  // apartment scale, in meters: contact shadows reach ~50 cm (under a table);
  // a thin thickness keeps objects from casting halos on the wall behind them
  ao.updateGtaoMaterial({
    radius: 0.5,
    distanceExponent: 1,
    thickness: 0.5,
    scale: 2,
    samples: 16,
    distanceFallOff: 1,
    screenSpaceRadius: false,
  });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 16 });
  ao.blendIntensity = 1;
  composer.addPass(ao);
  composer.addPass(new OutputPass()); // tone mapping + sRGB, as without post-processing
  return {
    ao,
    render: () => composer.render(),
    setSize: (w, h) => {
      renderer.setSize(w, h);
      composer.setSize(w, h);
    },
  };
}

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * Ambient occlusion is soft and low-frequency: computed at a fraction of the
 * resolution (at full size, 16 samples over 4 Mpx took ~90 % of the frame on
 * a Retina screen), upscaled when blended over the full-size image.
 */
export const AO_SCALE = 0.5;

/** GTAOPass internals it hides during its depth + normal pass (points and lines). */
interface GTAOInternals {
  _overrideVisibility(): void;
  _visibilityCache: THREE.Object3D[];
}

class ScaledGTAOPass extends GTAOPass {
  /**
   * Annotations drawn over the surfaces (the dimension labels, 4 mm off the
   * walls): left out of the AO's depth and normals, else the AO reads each
   * label quad as a thin slab over the wall and blends it to black.
   */
  readonly excluded: THREE.Object3D[] = [];

  constructor(...args: ConstructorParameters<typeof GTAOPass>) {
    super(...args);
    const internals = this as unknown as GTAOInternals;
    const hideLinesAndPoints = internals._overrideVisibility.bind(this);
    internals._overrideVisibility = () => {
      hideLinesAndPoints();
      for (const o of this.excluded) {
        if (!o.visible) continue;
        o.visible = false;
        internals._visibilityCache.push(o); // shown again by _restoreVisibility
      }
    };
  }

  override setSize(width: number, height: number): void {
    super.setSize(Math.ceil(width * AO_SCALE), Math.ceil(height * AO_SCALE));
  }
}

export interface Pipeline {
  render(): void;
  setSize(width: number, height: number): void;
  /** the ambient occlusion pass, when enabled (for tuning) */
  ao?: GTAOPass;
  /** keep an overlay (dimension lines and labels) out of the ambient occlusion */
  excludeFromAO(object: THREE.Object3D): void;
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
      excludeFromAO: () => {},
    };
  }
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: 4, // keep the antialiasing through the post-processing
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new ScaledGTAOPass(scene, camera, size.x * AO_SCALE, size.y * AO_SCALE);
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
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 8 });
  ao.blendIntensity = 1;
  composer.addPass(ao);
  composer.addPass(new OutputPass()); // tone mapping + sRGB, as without post-processing
  return {
    ao,
    excludeFromAO: (object) => ao.excluded.push(object),
    render: () => composer.render(),
    setSize: (w, h) => {
      renderer.setSize(w, h);
      composer.setSize(w, h);
    },
  };
}

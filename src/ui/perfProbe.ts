import type * as THREE from "three";
import type { Player } from "../player/controller";

/** What the browser performance test (e2e/fps.perf.ts) reads, as `window.perfProbe`. */
export interface PerfProbe {
  /** stand there, looking that way (meters, radians) */
  goTo(x: number, z: number, yaw: number): void;
  /** frames since the page loaded, and the draw calls / triangles of the last frame */
  frames: number;
  calls: number;
  triangles: number;
  /** the scene's GPU memory, as three.js counts it */
  textures: number;
  geometries: number;
}

/**
 * With `?perf` in the URL: let the performance test move the player and read
 * the renderer's counters. Returns the per-frame hook (nothing without `?perf`).
 */
export function perfProbe(player: Player, renderer: THREE.WebGLRenderer): () => void {
  if (!new URLSearchParams(location.search).has("perf")) return () => {};
  const probe: PerfProbe = {
    goTo(x, z, yaw) {
      player.x = x;
      player.z = z;
      player.yaw = yaw;
    },
    frames: 0,
    calls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
  };
  (window as unknown as { perfProbe: PerfProbe }).perfProbe = probe;
  // count over the whole frame (the post-processing renders several passes)
  renderer.info.autoReset = false;
  return () => {
    probe.frames++;
    probe.calls = renderer.info.render.calls;
    probe.triangles = renderer.info.render.triangles;
    probe.textures = renderer.info.memory.textures;
    probe.geometries = renderer.info.memory.geometries;
    renderer.info.reset();
  };
}

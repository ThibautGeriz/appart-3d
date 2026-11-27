import * as THREE from "three";
import type { MoveIntent } from "../controls/types";
import type { Collider } from "./movement";
import { buildNavGrid, findPath } from "./navigation";
import { startAutopilot, stepAutopilot, type AutopilotState } from "./autopilot";

/** Extra clearance so the planned path never grazes a wall. */
const PATH_MARGIN = 0.02;

export interface ClickToMove {
  /** Walk to what is under the given screen point, if reachable. */
  goTo(clientX: number, clientY: number, from: { x: number; z: number }): boolean;
  /**
   * Autopilot step, or null when idle. Manual movement cancels it; while the
   * user drags to look, it keeps walking without turning the view.
   */
  update(
    dt: number,
    player: { x: number; z: number; yaw: number },
    manual: MoveIntent,
    looking: boolean,
  ): { intent: MoveIntent; turn: number } | null;
  cancel(): void;
  /** rebuild the walkable grid after the colliders changed (furniture moved) */
  refresh(): void;
}

/** Pulsing ring on the floor at the destination. */
function createMarker(): THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> {
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.13, 0.18, 40),
    new THREE.MeshBasicMaterial({ color: "#ffd25c", transparent: true, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.012;
  marker.visible = false;
  return marker;
}

export function createClickToMove(options: {
  scene: THREE.Scene;
  camera: THREE.Camera;
  /** what can be clicked (the apartment) */
  targets: THREE.Object3D;
  colliders: Collider[];
  bounds: Collider;
  radius: number;
  /**
   * Interactive objects get the click first (the wall bed opens instead of
   * walking there): return true when the hit was handled.
   */
  interact?: (hit: THREE.Intersection) => boolean;
}): ClickToMove {
  const build = () => buildNavGrid(options.colliders, options.bounds, options.radius + PATH_MARGIN);
  let grid = build();
  const raycaster = new THREE.Raycaster();
  const marker = createMarker();
  options.scene.add(marker);
  let state: AutopilotState | null = null;
  let pulse = 0;

  const cancel = () => {
    state = null;
    marker.visible = false;
  };
  window.addEventListener("keydown", (e) => e.code === "Escape" && cancel());

  return {
    goTo(clientX, clientY, from) {
      const ndc = new THREE.Vector2(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, options.camera);
      const hit = raycaster
        .intersectObject(options.targets, true)
        // see through glass, light decals and other transparent surfaces
        .find((h) => !((h.object as THREE.Mesh).material as THREE.Material).transparent);
      if (!hit) return false;
      if (options.interact?.(hit)) return true;
      // furniture or a wall: aim at its foot, the path snaps to the closest reachable spot
      const path = findPath(grid, from, { x: hit.point.x, z: hit.point.z });
      if (!path || path.length === 0) return false;
      state = startAutopilot(path);
      const end = path[path.length - 1];
      marker.position.set(end.x, marker.position.y, end.z);
      marker.visible = true;
      pulse = 0;
      return true;
    },

    update(dt, player, manual, looking) {
      if (!state) return null;
      if (manual.forward !== 0 || manual.strafe !== 0) {
        cancel(); // WoW: any movement key takes over
        return null;
      }
      pulse += dt;
      marker.material.opacity = 0.55 + 0.35 * Math.sin(pulse * 6);
      const step = stepAutopilot(state, player, player.yaw, dt, !looking);
      if (step.done) {
        cancel();
        return null;
      }
      return { intent: step.intent, turn: step.turn };
    },

    cancel,

    refresh() {
      grid = build();
    },
  };
}

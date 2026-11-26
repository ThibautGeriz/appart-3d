import * as THREE from "three";
import type { LookDelta, MoveIntent } from "../controls/types";
import { computeVelocity, stepPlayer, type Collider } from "./movement";
import type { Box } from "../apartment/plan";
import { cameraDistance, FIRST_PERSON, viewDirection, zoomTarget } from "./camera";

const MAX_PITCH = Math.PI / 2 - 0.05;

export interface PlayerSpawn {
  x: number;
  z: number;
  yaw: number;
}

/** Look above the head in third person, so the avatar does not hide the view. */
const THIRD_PERSON_LIFT = 0.25;
/** How fast the camera swings back behind the player while walking (1/s). */
const ORBIT_RETURN = 3;

/**
 * Player: position, orientation, movement + collision, and the camera:
 * first person by default, third person when zoomed out with the wheel.
 */
export class Player {
  readonly eyeHeight = 1.6; // meters
  readonly radius = 0.3; // meters
  x: number;
  z: number;
  yaw: number;
  pitch = 0;
  /** camera distance behind the eyes (0 = first person) */
  zoom = 0;
  private zoomGoal = 0;
  /** camera orbit around the player (left drag in third person) */
  orbitYaw = 0;
  /** shown in third person; the mannequin model is loaded into it (loadModels) */
  readonly avatar = new THREE.Group();

  constructor(spawn: PlayerSpawn) {
    this.x = spawn.x;
    this.z = spawn.z;
    this.yaw = spawn.yaw;
  }

  update(dt: number, intent: MoveIntent, look: LookDelta, colliders: Collider[]): void {
    if (look.zoom) this.zoomGoal = zoomTarget(this.zoomGoal, look.zoom);
    this.zoom += (this.zoomGoal - this.zoom) * Math.min(1, dt * 10);
    const thirdPerson = this.zoomGoal > 0;
    if (thirdPerson && look.orbit) {
      // left drag: the camera circles around, the player keeps facing ahead
      this.orbitYaw += look.yaw;
    } else {
      if (look.yaw !== 0 || !thirdPerson) {
        // turning (right drag, keys) or back in first person: face where the camera looks
        this.yaw += this.orbitYaw;
        this.orbitYaw = 0;
      }
      this.yaw += look.yaw;
    }
    if (intent.forward !== 0 || intent.strafe !== 0) {
      this.orbitYaw *= Math.exp(-ORBIT_RETURN * dt);
    }
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + look.pitch));
    const velocity = computeVelocity(intent, this.yaw);
    const next = stepPlayer({ x: this.x, z: this.z }, velocity, dt, colliders, this.radius);
    this.x = next.x;
    this.z = next.z;
  }

  /** Place the camera (pulled in by `obstacles` in third person) and the avatar. */
  applyToCamera(camera: THREE.PerspectiveCamera, obstacles: Box[] = []): void {
    const viewYaw = this.yaw + this.orbitYaw;
    const lift = THIRD_PERSON_LIFT * Math.min(1, this.zoom / FIRST_PERSON);
    const eye = { x: this.x, y: this.eyeHeight + lift, z: this.z };
    const dir = viewDirection(viewYaw, this.pitch);
    const back = { x: -dir.x, y: -dir.y, z: -dir.z };
    const distance = this.zoom > 0.01 ? cameraDistance(eye, back, this.zoom, obstacles) : 0;
    camera.rotation.order = "YXZ";
    camera.position.set(
      eye.x + back.x * distance,
      eye.y + back.y * distance,
      eye.z + back.z * distance,
    );
    camera.rotation.y = viewYaw;
    camera.rotation.x = this.pitch;

    // hide the avatar when the camera is (or is pushed) too close to it
    this.avatar.visible = distance > FIRST_PERSON * 0.8;
    this.avatar.position.set(this.x, 0, this.z);
    this.avatar.rotation.y = this.yaw;
  }
}

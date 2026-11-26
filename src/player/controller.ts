import * as THREE from "three";
import type { MoveIntent } from "../controls/types";
import { computeVelocity, stepPlayer, type Collider } from "./movement";

const MAX_PITCH = Math.PI / 2 - 0.05;

export interface PlayerSpawn {
  x: number;
  z: number;
  yaw: number;
}

/** First-person player: position, orientation, movement + collision. */
export class Player {
  readonly eyeHeight = 1.6; // meters
  readonly radius = 0.3; // meters
  x: number;
  z: number;
  yaw: number;
  pitch = 0;

  constructor(spawn: PlayerSpawn) {
    this.x = spawn.x;
    this.z = spawn.z;
    this.yaw = spawn.yaw;
  }

  update(
    dt: number,
    intent: MoveIntent,
    look: { yaw: number; pitch: number },
    colliders: Collider[],
  ): void {
    this.yaw += look.yaw;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + look.pitch));
    const velocity = computeVelocity(intent, this.yaw);
    const next = stepPlayer({ x: this.x, z: this.z }, velocity, dt, colliders, this.radius);
    this.x = next.x;
    this.z = next.z;
  }

  applyToCamera(camera: THREE.PerspectiveCamera): void {
    camera.rotation.order = "YXZ";
    camera.position.set(this.x, this.eyeHeight, this.z);
    camera.rotation.y = this.yaw;
    camera.rotation.x = this.pitch;
  }
}

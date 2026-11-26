import type { MoveIntent } from "../controls/types";

export interface Vec2 {
  x: number;
  z: number;
}

/** Axis-aligned bounding box collider in the XZ plane. */
export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const WALK_SPEED = 3; // m/s

/**
 * World-space velocity from a movement intent and the player yaw.
 * Diagonal input is clamped to unit length so it is not faster than walking straight.
 */
export function computeVelocity(
  intent: MoveIntent,
  yaw: number,
  options?: { walkSpeed?: number },
): Vec2 {
  const walkSpeed = options?.walkSpeed ?? WALK_SPEED;
  const { forward, strafe } = intent;
  const len = Math.hypot(forward, strafe);
  const scale = len > 1 ? 1 / len : 1;
  // forward = (-sin(yaw), -cos(yaw)), right = (cos(yaw), -sin(yaw))
  const x = (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * scale * walkSpeed;
  const z = (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * scale * walkSpeed;
  return { x, z };
}

/**
 * Move a circle (the player) by velocity*dt and resolve collisions against
 * axis-aligned boxes. Movement is sub-stepped so fast movement cannot tunnel
 * through thin walls; push-out resolution gives smooth sliding along walls.
 */
export function stepPlayer(
  pos: Vec2,
  velocity: Vec2,
  dt: number,
  colliders: Collider[],
  radius: number,
): Vec2 {
  const dist = Math.hypot(velocity.x, velocity.z) * dt;
  const steps = Math.max(1, Math.ceil(dist / (radius * 0.5)));
  const stepDt = dt / steps;
  let current = { ...pos };
  for (let i = 0; i < steps; i++) {
    current = resolveCircle(
      { x: current.x + velocity.x * stepDt, z: current.z + velocity.z * stepDt },
      colliders,
      radius,
    );
  }
  return current;
}

/** Push a circle out of any overlapping AABBs. Pure function. */
export function resolveCircle(pos: Vec2, colliders: Collider[], radius: number): Vec2 {
  let { x, z } = pos;
  for (let iteration = 0; iteration < 3; iteration++) {
    let moved = false;
    for (const c of colliders) {
      const closestX = Math.max(c.minX, Math.min(x, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(z, c.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      moved = true;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        x = closestX + (dx / d) * radius;
        z = closestZ + (dz / d) * radius;
      } else {
        // Circle center is inside the box: exit through the nearest face.
        const left = x - c.minX + radius;
        const right = c.maxX - x + radius;
        const front = z - c.minZ + radius;
        const back = c.maxZ - z + radius;
        const m = Math.min(left, right, front, back);
        if (m === left) x = c.minX - radius;
        else if (m === right) x = c.maxX + radius;
        else if (m === front) z = c.minZ - radius;
        else z = c.maxZ + radius;
      }
    }
    if (!moved) break;
  }
  return { x, z };
}

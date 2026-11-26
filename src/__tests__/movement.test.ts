import { describe, expect, it } from "vitest";
import {
  computeVelocity,
  resolveCircle,
  stepPlayer,
  WALK_SPEED,
  type Collider,
} from "../player/movement";

describe("computeVelocity", () => {
  it("walks forward along -Z when yaw = 0", () => {
    const v = computeVelocity({ forward: 1, strafe: 0 }, 0);
    expect(v.x).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(-WALK_SPEED);
  });

  it("strafes right along +X when yaw = 0", () => {
    const v = computeVelocity({ forward: 0, strafe: 1 }, 0);
    expect(v.x).toBeCloseTo(WALK_SPEED);
    expect(v.z).toBeCloseTo(0);
  });

  it("normalizes diagonal input so it is not faster than straight walking", () => {
    const v = computeVelocity({ forward: 1, strafe: 1 }, 0);
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(WALK_SPEED);
  });

  it("rotates forward direction with yaw", () => {
    // Three.js Y-rotation convention: positive yaw turns left, so forward
    // (initially -Z) becomes -X at yaw = π/2.
    const v = computeVelocity({ forward: 1, strafe: 0 }, Math.PI / 2);
    expect(v.x).toBeCloseTo(-WALK_SPEED);
    expect(v.z).toBeCloseTo(0);
  });
});

describe("resolveCircle", () => {
  const box: Collider = { minX: 1, maxX: 2, minZ: 1, maxZ: 2 };

  it("pushes a circle out of a box along the shortest axis", () => {
    // Center inside the box, closest to the left face
    const out = resolveCircle({ x: 1.2, z: 1.5 }, [box], 0.3);
    expect(out.x).toBeCloseTo(1 - 0.3);
    expect(out.z).toBeCloseTo(1.5);
  });

  it("pushes a circle away when overlapping an edge", () => {
    const out = resolveCircle({ x: 0.8, z: 1.0 }, [box], 0.3);
    // Distance from (0.8, 1.0) to closest box point (1,1) is ~0.283 < 0.3
    const dist = Math.hypot(out.x - 1, out.z - 1);
    expect(dist).toBeCloseTo(0.3, 5);
  });

  it("leaves a free position untouched", () => {
    const pos = { x: 5, z: 5 };
    expect(resolveCircle(pos, [box], 0.3)).toEqual(pos);
  });
});

describe("stepPlayer collision", () => {
  const wall: Collider = { minX: -5, maxX: 5, minZ: 0, maxZ: 0.2 };
  const radius = 0.3;

  it("blocks movement through a wall", () => {
    const out = stepPlayer({ x: 0, z: -1 }, { x: 0, z: 3 }, 1, [wall], radius);
    expect(out.z).toBeLessThanOrEqual(-radius + 1e-9);
  });

  it("slides along the wall when moving diagonally into it", () => {
    const out = stepPlayer({ x: 0, z: -1 }, { x: 3, z: 3 }, 1, [wall], radius);
    expect(out.x).toBeGreaterThan(2); // x movement unaffected
    expect(out.z).toBeLessThanOrEqual(-radius + 1e-9); // z blocked
  });

  it("does not tunnel through a thin wall even when fast and at low FPS", () => {
    const thinWall: Collider = { minX: -5, maxX: 5, minZ: 5, maxZ: 5.2 };
    const velocity = { x: 0, z: 5.5 };
    const out = stepPlayer({ x: 0, z: 3 }, velocity, 0.1, [thinWall], radius);
    expect(out.z).toBeLessThan(5); // never crossed the wall face
  });

  it("moves freely with no colliders", () => {
    const out = stepPlayer({ x: 0, z: 0 }, { x: 1, z: 0 }, 2, [], radius);
    expect(out.x).toBeCloseTo(2);
    expect(out.z).toBeCloseTo(0);
  });
});

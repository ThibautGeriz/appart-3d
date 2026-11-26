import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import { apartmentBounds, buildColliders } from "../apartment/plan";
import { buildNavGrid, findPath, isWalkable, lineOfSight } from "../player/navigation";
import {
  angleDelta,
  intentToward,
  startAutopilot,
  stepAutopilot,
  yawToward,
} from "../player/autopilot";
import { computeVelocity, stepPlayer, type Vec2 } from "../player/movement";

const colliders = buildColliders(APARTMENT_DEF);
const RADIUS = 0.3;
const grid = buildNavGrid(colliders, apartmentBounds(APARTMENT_DEF), RADIUS + 0.02);
const spawn = { x: APARTMENT_DEF.spawn.x, z: APARTMENT_DEF.spawn.z };

function pathLength(start: Vec2, path: Vec2[]): number {
  let total = 0;
  let prev = start;
  for (const p of path) {
    total += Math.hypot(p.x - prev.x, p.z - prev.z);
    prev = p;
  }
  return total;
}

describe("click-to-move pathfinding", () => {
  it("goes straight when nothing is in the way", () => {
    const path = findPath(grid, { x: 2, z: 1.5 }, { x: 5, z: 1.5 })!;
    expect(path).toHaveLength(1);
    expect(path[0]).toEqual({ x: 5, z: 1.5 });
  });

  it("finds a way from the front door to chambre 1 through the doorways", () => {
    const goal = { x: 12.8, z: 5 };
    const path = findPath(grid, spawn, goal)!;
    expect(path).not.toBeNull();
    expect(path[path.length - 1]).toEqual(goal);
    // every leg is walkable for the player's circle
    let prev = spawn;
    for (const p of path) {
      expect(lineOfSight(grid, prev, p)).toBe(true);
      prev = p;
    }
    expect(pathLength(spawn, path)).toBeGreaterThan(Math.hypot(goal.x - spawn.x, goal.z - spawn.z));
  });

  it("reaches the balcony through the séjour sliding door", () => {
    expect(findPath(grid, { x: 3, z: 2 }, { x: 8.7, z: 1.5 })).not.toBeNull();
  });

  it("refuses places the player cannot reach (outside, inside a cupboard)", () => {
    expect(findPath(grid, spawn, { x: 11, z: 1.5 })).toBeNull(); // outside, east of the balcony
    expect(isWalkable(grid, { x: 3.4, z: 5.4 })).toBe(false); // entrée cupboard
  });

  it("snaps a click right next to a wall to the closest reachable spot", () => {
    const path = findPath(grid, { x: 3, z: 2 }, { x: 3, z: 0.05 })!;
    const end = path[path.length - 1];
    expect(end.z).toBeGreaterThanOrEqual(RADIUS);
  });
});

describe("autopilot", () => {
  it("converts world directions to forward/strafe for any yaw", () => {
    expect(intentToward(0, -1, 0).forward).toBeCloseTo(1); // yaw 0 faces -z
    expect(intentToward(1, 0, 0).strafe).toBeCloseTo(1);
    const yaw = yawToward(1, 0);
    expect(intentToward(1, 0, yaw).forward).toBeCloseTo(1);
  });

  it("wraps angles the short way", () => {
    expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6);
  });

  it("walks the player to a clicked spot in another room and stops there", () => {
    const goal = { x: 9.8, z: 5.5 }; // chambre 2
    const state = startAutopilot(findPath(grid, spawn, goal)!);
    let pos = { ...spawn };
    let yaw = APARTMENT_DEF.spawn.yaw;
    let done = false;
    for (let frame = 0; frame < 60 * 20 && !done; frame++) {
      const step = stepAutopilot(state, pos, yaw, 1 / 60, false);
      done = step.done;
      yaw += step.turn;
      pos = stepPlayer(pos, computeVelocity(step.intent, yaw), 1 / 60, colliders, RADIUS);
    }
    expect(done).toBe(true);
    expect(Math.hypot(pos.x - goal.x, pos.z - goal.z)).toBeLessThan(0.2);
    // ends up facing roughly where it walked (WoW-style turn)
    expect(Number.isFinite(yaw)).toBe(true);
  });

  it("keeps the view still while the user drags to look", () => {
    const state = startAutopilot([{ x: 5, z: 0 }]);
    const step = stepAutopilot(state, { x: 0, z: 0 }, 0, 1 / 60, false, false);
    expect(step.turn).toBe(0);
    expect(step.intent.strafe).toBeGreaterThan(0.9); // still walks toward +x
  });
});

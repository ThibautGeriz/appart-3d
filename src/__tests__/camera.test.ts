import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import {
  cameraDistance,
  cameraObstacles,
  FIRST_PERSON,
  MAX_ZOOM,
  rayBoxDistance,
  viewDirection,
  zoomTarget,
} from "../player/camera";
import { Player } from "../player/controller";

const obstacles = cameraObstacles(APARTMENT_DEF);
const behind = (yaw: number, pitch: number) => {
  const d = viewDirection(yaw, pitch);
  return { x: -d.x, y: -d.y, z: -d.z };
};

describe("third-person camera", () => {
  it("zooms out by wheel notches, capped, and snaps back to first person", () => {
    expect(zoomTarget(0, 1)).toBe(0.5);
    expect(zoomTarget(3.8, 2)).toBe(MAX_ZOOM);
    expect(zoomTarget(0.5, -1)).toBe(0); // below FIRST_PERSON → first person
    expect(zoomTarget(0, -3)).toBe(0);
    expect(FIRST_PERSON).toBeGreaterThan(0);
  });

  it("looks toward -z at yaw 0 and up with positive pitch", () => {
    const d = viewDirection(0, 0);
    expect(d.z).toBeCloseTo(-1);
    expect(viewDirection(0, 0.5).y).toBeGreaterThan(0);
  });

  it("hits boxes with a slab test", () => {
    const box = { minX: 1, maxX: 2, minY: -1, maxY: 1, minZ: -1, maxZ: 1 };
    expect(rayBoxDistance({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, box)).toBeCloseTo(1);
    expect(rayBoxDistance({ x: 0, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, box)).toBeNull();
  });

  it("gets the full distance in the middle of the séjour", () => {
    const eye = { x: 3.7, y: 1.85, z: 1.9 };
    expect(cameraDistance(eye, behind(Math.PI / 2, 0), 2, obstacles)).toBeCloseTo(2); // looking west, camera east
  });

  it("is pulled in by walls (never behind the wall)", () => {
    // in the entrée hall looking north: the camera goes south toward the front door wall
    const eye = { x: 5.0, y: 1.85, z: 7.6 };
    const d = cameraDistance(eye, behind(0, 0), MAX_ZOOM, obstacles);
    expect(d).toBeLessThan(8.5 - 7.6); // the south façade is 0.9 m away
    expect(d).toBeGreaterThan(0.3);
  });

  it("stays under lowered ceilings and above the floor", () => {
    // dégagement (HSFP 2.15): looking down, the camera rises behind and must stop under 2.15
    const eye = { x: 8, y: 1.85, z: 7.9 };
    const back = behind(Math.PI / 2, -0.9);
    const d = cameraDistance(eye, back, MAX_ZOOM, obstacles);
    expect(eye.y + back.y * d).toBeLessThan(2.15);
    // looking up: the camera dips behind and must stay above the floor
    const up = behind(0, 1.2);
    const d2 = cameraDistance({ x: 3.7, y: 1.85, z: 1.9 }, up, MAX_ZOOM, obstacles);
    expect(1.85 + up.y * d2).toBeGreaterThan(0);
  });
});

describe("player camera modes", () => {
  it("orbits the camera on left drag in third person, turns the player on right drag", () => {
    const player = new Player({ x: 3.7, z: 1.9, yaw: 0 });
    const idle = { forward: 0, strafe: 0 };
    player.update(1, idle, { yaw: 0, pitch: 0, zoom: 4 }, []); // zoom out
    player.update(1 / 60, idle, { yaw: 0.5, pitch: 0, orbit: true }, []);
    expect(player.yaw).toBe(0);
    expect(player.orbitYaw).toBeCloseTo(0.5);
    // right drag: the player turns to face where the camera looks
    player.update(1 / 60, idle, { yaw: 0.1, pitch: 0 }, []);
    expect(player.yaw).toBeCloseTo(0.6);
    expect(player.orbitYaw).toBe(0);
  });

  it("turns the player directly in first person, even on left drag", () => {
    const player = new Player({ x: 3.7, z: 1.9, yaw: 0 });
    player.update(1 / 60, { forward: 0, strafe: 0 }, { yaw: 0.3, pitch: 0, orbit: true }, []);
    expect(player.yaw).toBeCloseTo(0.3);
  });
});

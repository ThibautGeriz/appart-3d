import type { MoveIntent } from "../controls/types";
import type { Vec2 } from "./movement";

/**
 * Click-to-move autopilot: follows waypoints by producing ordinary movement
 * intents (so collisions and wall sliding still apply), and turns the view
 * toward the walking direction like WoW's click-to-move. Pure.
 */
export interface AutopilotState {
  path: Vec2[];
  /** time without progress, seconds (gives up when stuck) */
  stuck: number;
  lastDistance: number;
}

const WAYPOINT_REACHED = 0.25; // m
const GOAL_REACHED = 0.12; // m
const TURN_SPEED = 3.5; // rad/s
const STUCK_TIMEOUT = 1.5; // s

export function startAutopilot(path: Vec2[]): AutopilotState {
  return { path: [...path], stuck: 0, lastDistance: Infinity };
}

/** Yaw that faces a world direction (forward = (-sin yaw, -cos yaw)). */
export function yawToward(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz);
}

/** Shortest signed angle from a to b, in (-π, π]. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Express a unit world direction as forward/strafe for the current yaw. */
export function intentToward(
  dx: number,
  dz: number,
  yaw: number,
): { forward: number; strafe: number } {
  const forward = -Math.sin(yaw) * dx - Math.cos(yaw) * dz;
  const strafe = Math.cos(yaw) * dx - Math.sin(yaw) * dz;
  return { forward, strafe };
}

export interface AutopilotStep {
  intent: MoveIntent;
  /** yaw change to apply this frame */
  turn: number;
  /** destination reached, or given up (stuck) */
  done: boolean;
}

/**
 * One frame of autopilot. `steer` = false while the user drags to look: the
 * walk goes on but the view stays where the user put it.
 */
export function stepAutopilot(
  state: AutopilotState,
  pos: Vec2,
  yaw: number,
  dt: number,
  run: boolean,
  steer = true,
): AutopilotStep {
  const idle: AutopilotStep = {
    intent: { forward: 0, strafe: 0, run: false },
    turn: 0,
    done: true,
  };
  // skip waypoints already reached
  while (state.path.length > 1) {
    const p = state.path[0];
    if (Math.hypot(p.x - pos.x, p.z - pos.z) > WAYPOINT_REACHED) break;
    state.path.shift();
  }
  const target = state.path[0];
  if (!target) return idle;
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const distance = Math.hypot(dx, dz);
  const remaining =
    distance +
    state.path
      .slice(1)
      .reduce((sum, p, i) => sum + Math.hypot(p.x - state.path[i].x, p.z - state.path[i].z), 0);
  if (state.path.length === 1 && distance < GOAL_REACHED) {
    state.path = [];
    return idle;
  }
  // stuck detection: no progress toward the goal for a while
  if (remaining > state.lastDistance - 0.002) state.stuck += dt;
  else state.stuck = 0;
  state.lastDistance = Math.min(state.lastDistance, remaining);
  if (state.stuck > STUCK_TIMEOUT) {
    state.path = [];
    return idle;
  }

  const ux = dx / distance;
  const uz = dz / distance;
  // slow down on the last half meter so we stop on the spot
  const speed = state.path.length === 1 ? Math.min(1, distance / 0.5 + 0.2) : 1;
  const { forward, strafe } = intentToward(ux * speed, uz * speed, yaw);
  let turn = 0;
  if (steer) {
    const delta = angleDelta(yaw, yawToward(ux, uz));
    const maxTurn = TURN_SPEED * dt;
    turn = Math.max(-maxTurn, Math.min(maxTurn, delta));
  }
  return { intent: { forward, strafe, run }, turn, done: false };
}

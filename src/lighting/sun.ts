/** Pure sun / daylight math. Angles in radians unless suffixed `Deg`. */

const DEG = Math.PI / 180;

export interface SolarPosition {
  /** angle above the horizon */
  elevation: number;
  /** compass bearing, clockwise from north */
  azimuth: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function dayOfYear(month: number, day: number): number {
  const cumulative = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return cumulative[month] + day;
}

/**
 * Convert a wall-clock hour to local solar time.
 * `utcOffsetHours` is the legal offset (e.g. +2 in French summer time).
 * Ignores the equation of time (±15 min), fine for a walkthrough.
 */
export function clockToSolarHour(
  clock: number,
  longitudeDeg: number,
  utcOffsetHours: number,
): number {
  return clock - utcOffsetHours + longitudeDeg / 15;
}

/** Sun position from the day of year, solar hour and latitude. */
export function solarPosition(day: number, solarHour: number, latitudeDeg: number): SolarPosition {
  const declination = 23.44 * DEG * Math.sin(((2 * Math.PI) / 365) * (day - 81));
  const hourAngle = 15 * DEG * (solarHour - 12);
  const lat = latitudeDeg * DEG;
  const sinElevation =
    Math.sin(lat) * Math.sin(declination) +
    Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation)));
  const azimuth =
    Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat),
    ) + Math.PI;
  return { elevation, azimuth };
}

/**
 * Unit vector pointing toward the sun in world space.
 * World axes: x → plan right, z → plan down, y up.
 * `northAngleDeg`: where north points, clockwise from plan "up" (-z).
 */
export function sunDirection(position: SolarPosition, northAngleDeg: number): Vec3 {
  const bearing = position.azimuth + northAngleDeg * DEG;
  const horizontal = Math.cos(position.elevation);
  return {
    x: Math.sin(bearing) * horizontal,
    y: Math.sin(position.elevation),
    z: -Math.cos(bearing) * horizontal,
  };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Rgb = [number, number, number];

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export interface Daylight {
  /** directional sun intensity */
  sun: number;
  sunColor: Rgb;
  /** hemisphere (sky + bounce) intensity */
  ambient: number;
  ambientSky: Rgb;
  ambientGround: Rgb;
  skyZenith: Rgb;
  skyHorizon: Rgb;
}

const NIGHT_ZENITH: Rgb = [0.02, 0.03, 0.08];
const NIGHT_HORIZON: Rgb = [0.06, 0.08, 0.15];
const DUSK_HORIZON: Rgb = [0.98, 0.55, 0.3];
const DAY_ZENITH: Rgb = [0.28, 0.52, 0.88];
const DAY_HORIZON: Rgb = [0.74, 0.86, 0.96];
const MOONLIGHT: Rgb = [0.45, 0.55, 0.8];
const LAMP: Rgb = [1.0, 0.9, 0.75];
const LAMP_GROUND: Rgb = [0.75, 0.66, 0.55];
/** Indirect light added by the interior lamps when they are on. */
export const LAMP_BOUNCE = 0.5;

/**
 * Natural light levels and sky colors for a sun elevation. At night (sun
 * below -6°) only faint moonlight remains: with the lamps off, hardly
 * anything is visible. Lamp light is added by `ambientLight`.
 */
export function daylight(elevation: number): Daylight {
  const elevationDeg = elevation / DEG;
  // 0 at civil twilight (-6°), 1 once the sun is 20° high
  const day = clamp01((elevationDeg + 6) / 26);
  // sunset tint peaks near the horizon
  const golden = clamp01(1 - Math.abs(elevationDeg - 2) / 10);
  const sunUp = clamp01(elevationDeg / 4);
  const zenith = mix(NIGHT_ZENITH, DAY_ZENITH, day);
  const horizon = mix(mix(NIGHT_HORIZON, DAY_HORIZON, day), DUSK_HORIZON, golden * 0.7);
  return {
    sun: 3.2 * sunUp * (0.35 + 0.65 * day),
    sunColor: mix([1, 1, 0.95], [1, 0.62, 0.35], golden),
    ambient: lerp(0.03, 2.0, day),
    ambientSky: mix(MOONLIGHT, mix([0.75, 0.85, 1], [1, 0.8, 0.7], golden * 0.5), day),
    // bounce from the floor and walls, lights the ceiling
    ambientGround: mix([0.15, 0.15, 0.2], [0.78, 0.76, 0.72], day),
    skyZenith: zenith,
    skyHorizon: horizon,
  };
}

export interface Ambient {
  intensity: number;
  sky: Rgb;
  ground: Rgb;
}

/**
 * Hemisphere (indirect) light: the natural daylight, plus a warm bounce from
 * the interior lamps when they are on. Pure.
 */
export function ambientLight(light: Daylight, lampsOn: boolean): Ambient {
  if (!lampsOn)
    return { intensity: light.ambient, sky: light.ambientSky, ground: light.ambientGround };
  const intensity = light.ambient + LAMP_BOUNCE;
  const w = LAMP_BOUNCE / intensity;
  return {
    intensity,
    sky: mix(light.ambientSky, LAMP, w),
    ground: mix(light.ambientGround, LAMP_GROUND, w),
  };
}

/** Indirect light of a bright day (the hemisphere intensity at noon). */
const FULL_DAY_AMBIENT = 2.0;

/** 0–1 share of the environment reflections to keep for this light level. Pure. */
export function environmentScale(ambient: Ambient): number {
  return clamp01(ambient.intensity / FULL_DAY_AMBIENT);
}

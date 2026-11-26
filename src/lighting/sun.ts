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
const LAMP: Rgb = [1.0, 0.82, 0.6];

/**
 * Light levels and sky colors for a sun elevation.
 * Night (sun below -6°) keeps a warm "lamps on" ambient so rooms stay visible.
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
    ambient: lerp(0.8, 2.0, day),
    ambientSky: mix(LAMP, mix([0.75, 0.85, 1], [1, 0.8, 0.7], golden * 0.5), day),
    // bounce from the floor and walls, lights the ceiling
    ambientGround: mix([0.6, 0.5, 0.4], [0.78, 0.76, 0.72], day),
    skyZenith: zenith,
    skyHorizon: horizon,
  };
}

import { describe, expect, it } from "vitest";
import {
  ambientLight,
  clockToSolarHour,
  dayOfYear,
  daylight,
  environmentScale,
  solarPosition,
  sunDirection,
} from "../lighting/sun";
import { clampHour, defaultHour, formatClock } from "../ui/sunControls";

const DEG = Math.PI / 180;
const PARIS = 48.85;

describe("sun", () => {
  it("counts days of the year", () => {
    expect(dayOfYear(0, 1)).toBe(1);
    expect(dayOfYear(5, 21)).toBe(172);
  });

  it("converts French summer clock time to solar time", () => {
    // Paris, UTC+2: 14:00 on the clock is ~12:09 solar time
    expect(clockToSolarHour(14, 2.35, 2)).toBeCloseTo(12.157, 2);
  });

  it("puts the sun due south at solar noon, higher in summer", () => {
    const summer = solarPosition(dayOfYear(5, 21), 12, PARIS);
    const winter = solarPosition(dayOfYear(11, 21), 12, PARIS);
    expect(summer.azimuth / DEG).toBeCloseTo(180, 5);
    expect(summer.elevation / DEG).toBeCloseTo(90 - PARIS + 23.44, 0);
    expect(winter.elevation / DEG).toBeCloseTo(90 - PARIS - 23.44, 0);
  });

  it("rises in the east and sets in the west", () => {
    const morning = solarPosition(dayOfYear(2, 21), 7, PARIS);
    const evening = solarPosition(dayOfYear(2, 21), 17, PARIS);
    expect(morning.azimuth / DEG).toBeGreaterThan(45);
    expect(morning.azimuth / DEG).toBeLessThan(135);
    expect(evening.azimuth / DEG).toBeGreaterThan(225);
    expect(evening.azimuth / DEG).toBeLessThan(315);
  });

  it("is below the horizon at midnight", () => {
    expect(solarPosition(dayOfYear(5, 21), 0, PARIS).elevation).toBeLessThan(0);
  });

  it("maps compass bearings onto the plan using the north angle", () => {
    const southNoon = { azimuth: Math.PI, elevation: 0 };
    // North straight up the plan: the southern sun is toward +z (plan bottom)
    const plain = sunDirection(southNoon, 0);
    expect(plain.x).toBeCloseTo(0);
    expect(plain.z).toBeCloseTo(1);
    // North rotated 90° clockwise (plan right): south is plan left
    const rotated = sunDirection(southNoon, 90);
    expect(rotated.x).toBeCloseTo(-1);
    expect(rotated.z).toBeCloseTo(0);
  });

  it("is almost dark at night with the lamps off, lit with the lamps on", () => {
    const night = daylight(-20 * DEG);
    const noon = daylight(60 * DEG);
    expect(night.sun).toBe(0);
    expect(ambientLight(night, false).intensity).toBeLessThan(0.05); // moonlight only
    expect(ambientLight(night, true).intensity).toBeGreaterThan(0.4); // lamp bounce
    expect(ambientLight(noon, false).intensity).toBeGreaterThan(1.5);
    expect(noon.sun).toBeGreaterThan(night.sun);
  });

  it("tints the indirect light warm with the lamps on, blue moonlight with them off", () => {
    const lamps = ambientLight(daylight(-20 * DEG), true);
    expect(lamps.sky[0]).toBeGreaterThan(lamps.sky[2]);
    const moon = ambientLight(daylight(-20 * DEG), false);
    expect(moon.sky[2]).toBeGreaterThan(moon.sky[0]);
  });

  it("fades the environment reflections out at night with the lamps off", () => {
    expect(environmentScale(ambientLight(daylight(-20 * DEG), false))).toBeLessThan(0.03);
    expect(environmentScale(ambientLight(daylight(-20 * DEG), true))).toBeGreaterThan(0.2);
    expect(environmentScale(ambientLight(daylight(60 * DEG), false))).toBe(1);
  });
});

describe("sun controls", () => {
  it("formats the clock", () => {
    expect(formatClock(14.5)).toBe("14:30");
    expect(formatClock(8.25)).toBe("08:15");
    expect(clampHour(2)).toBe(4);
    expect(clampHour(30)).toBe(23);
  });

  it("starts in daylight", () => {
    expect(defaultHour(new Date(2026, 5, 21, 14, 40))).toBe(14.75);
    expect(defaultHour(new Date(2026, 10, 26, 21, 0))).toBe(11);
  });
});

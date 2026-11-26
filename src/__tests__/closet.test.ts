import { describe, expect, it } from "vitest";
import { APARTMENT_DEF } from "../data/apartment";
import { expandCloset } from "../apartment/closet";
import { buildColliders } from "../apartment/plan";

const entree = APARTMENT_DEF.closets.find((c) => c.name === "Placard entrée")!;

describe("built-in cupboards", () => {
  it("builds the entrée cupboard into the wall: flush doors, wall finish, no handles", () => {
    const items = expandCloset(entree);
    const doors = items.filter((i) => i.name.endsWith("(porte)"));
    const carcass = items.find((i) => i.name.endsWith("(caisson)"))!;
    expect(doors.length).toBeGreaterThan(0);
    for (const door of doors) {
      expect(door.rect[2]).toBeCloseTo(entree.rect[2]); // flush with the entrée wall face
      expect(door.rect[0]).toBeGreaterThanOrEqual(carcass.rect[2] - 1e-9);
      expect(door.finish).toBe(APARTMENT_DEF.wallFinish);
    }
    expect(items.some((i) => i.name.endsWith("(poignée)"))).toBe(false);
  });

  it("is not hidden behind a wall: nothing stands between the doors and the entrée", () => {
    // probe just in front of the doors, along the cupboard's length
    const colliders = buildColliders(APARTMENT_DEF);
    const x = entree.rect[2] + 0.01;
    const blocking = colliders.filter(
      (c) =>
        c.minX <= x &&
        c.maxX >= x &&
        c.maxZ > entree.rect[1] + 0.1 &&
        c.minZ < entree.rect[3] - 0.1,
    );
    expect(blocking).toEqual([]);
  });

  it("covers the full cupboard length with overlapping leaves", () => {
    for (const closet of APARTMENT_DEF.closets) {
      const doors = expandCloset(closet).filter((i) => i.name.endsWith("(porte)"));
      const alongX = closet.facing === "+z" || closet.facing === "-z";
      const [a0, a1] = alongX ? [closet.rect[0], closet.rect[2]] : [closet.rect[1], closet.rect[3]];
      const spans = doors.map((d) => (alongX ? [d.rect[0], d.rect[2]] : [d.rect[1], d.rect[3]]));
      expect(Math.min(...spans.map((s) => s[0]))).toBeCloseTo(a0);
      expect(Math.max(...spans.map((s) => s[1]))).toBeCloseTo(a1);
    }
  });
});

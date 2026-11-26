import { describe, expect, it } from "vitest";
import { ceilingText, formatCentimeters, formatSize, roomLabelText } from "../apartment/labels";

describe("labels", () => {
  it("formats lengths in whole centimeters", () => {
    expect(formatCentimeters(4.5)).toBe("450 cm");
    expect(formatCentimeters(9.856)).toBe("986 cm");
  });

  it("formats a room size as width × depth", () => {
    expect(formatSize(4.8, 4.3)).toBe("480 × 430 cm");
  });

  it("builds a two-line room label (name + size)", () => {
    const text = roomLabelText({ label: "Chambre", w: 4.8, d: 4.3 });
    expect(text.split("\n")).toEqual(["Chambre", "480 × 430 cm"]);
  });

  it("shows ceiling heights like the plan (HSP / HSFP)", () => {
    expect(ceilingText(2.5, false)).toBe("HSP 250 cm");
    expect(ceilingText(2.15, true)).toBe("HSFP 215 cm");
    const text = roomLabelText({
      label: "Cellier",
      w: 2.58,
      d: 1.83,
      ceiling: 2.15,
      lowered: true,
    });
    expect(text.split("\n")).toEqual(["Cellier", "258 × 183 cm", "HSFP 215 cm"]);
  });
});

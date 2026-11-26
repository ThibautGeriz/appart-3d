import { describe, expect, it } from "vitest";
import { ceilingText, formatMeters, formatSize, roomLabelText } from "../apartment/labels";

describe("labels", () => {
  it("formats meters with a French decimal comma", () => {
    expect(formatMeters(4.5)).toBe("4,50 m");
    expect(formatMeters(9.86)).toBe("9,86 m");
  });

  it("formats a room size as width × depth", () => {
    expect(formatSize(4.8, 4.3)).toBe("4,80 m × 4,30 m");
  });

  it("builds a two-line room label (name + size)", () => {
    const text = roomLabelText({ label: "Chambre", w: 4.8, d: 4.3 });
    expect(text.split("\n")).toEqual(["Chambre", "4,80 m × 4,30 m"]);
  });

  it("shows ceiling heights like the plan (HSP / HSFP)", () => {
    expect(ceilingText(2.5, false)).toBe("HSP 2,50 m");
    expect(ceilingText(2.15, true)).toBe("HSFP 2,15 m");
    const text = roomLabelText({
      label: "Cellier",
      w: 2.58,
      d: 1.83,
      ceiling: 2.15,
      lowered: true,
    });
    expect(text.split("\n")).toEqual(["Cellier", "2,58 m × 1,83 m", "HSFP 2,15 m"]);
  });
});

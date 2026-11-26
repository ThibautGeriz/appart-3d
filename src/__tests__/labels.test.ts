import { describe, expect, it } from "vitest";
import { formatMeters, formatSize, roomLabelText } from "../apartment/labels";

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
});

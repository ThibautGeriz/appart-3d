/** Pure label formatting for the dimension overlay ("cotes"). */

/** Whole centimeters, as on a plan: "245 cm". */
export function formatCentimeters(value: number): string {
  return `${Math.round(value * 100)} cm`;
}

export function formatSize(w: number, d: number): string {
  return `${Math.round(w * 100)} × ${formatCentimeters(d)}`;
}

export interface RoomLabelData {
  label: string;
  w: number;
  d: number;
  /** ceiling height (shown as on the plan: HSP, or HSFP when lowered) */
  ceiling?: number;
  lowered?: boolean;
}

/** "HSFP 215 cm" for a lowered ceiling (hauteur sous faux plafond), "HSP 250 cm" otherwise. */
export function ceilingText(height: number, lowered: boolean): string {
  return `${lowered ? "HSFP" : "HSP"} ${formatCentimeters(height)}`;
}

export function roomLabelText(room: RoomLabelData): string {
  const lines = [room.label, formatSize(room.w, room.d)];
  if (room.ceiling !== undefined) lines.push(ceilingText(room.ceiling, room.lowered ?? false));
  return lines.join("\n");
}

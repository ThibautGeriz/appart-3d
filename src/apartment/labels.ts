/** Pure label formatting for the dimension overlay ("cotes"). */

export function formatMeters(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} m`;
}

export function formatSize(w: number, d: number): string {
  return `${formatMeters(w)} × ${formatMeters(d)}`;
}

export interface RoomLabelData {
  label: string;
  w: number;
  d: number;
  /** ceiling height (shown as on the plan: HSP, or HSFP when lowered) */
  ceiling?: number;
  lowered?: boolean;
}

/** "HSFP 2,15 m" for a lowered ceiling (hauteur sous faux plafond), "HSP 2,50 m" otherwise. */
export function ceilingText(height: number, lowered: boolean): string {
  return `${lowered ? "HSFP" : "HSP"} ${formatMeters(height)}`;
}

export function roomLabelText(room: RoomLabelData): string {
  const lines = [room.label, formatSize(room.w, room.d)];
  if (room.ceiling !== undefined) lines.push(ceilingText(room.ceiling, room.lowered ?? false));
  return lines.join("\n");
}

/** Pure label formatting for the dimension overlay ("cotes"). */

export function formatMeters(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} m`;
}

export function formatSize(w: number, d: number): string {
  return `${formatMeters(w)} × ${formatMeters(d)}`;
}

/** The long side of an axis-aligned wall segment. */
export function wallLength(wall: { w: number; d: number }): number {
  return Math.max(wall.w, wall.d);
}

export interface RoomLabelData {
  label: string;
  w: number;
  d: number;
}

export function roomLabelText(room: RoomLabelData): string {
  return `${room.label}\n${formatSize(room.w, room.d)}`;
}

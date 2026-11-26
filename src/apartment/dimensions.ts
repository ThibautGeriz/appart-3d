import * as THREE from "three";
import type { ApartmentDef } from "../data/apartment";
import { formatMeters, roomLabelText } from "./labels";
import { wallPieces, type Box } from "./plan";

const PX_PER_UNIT = 90; // canvas px per world meter (sprite scale)
const MIN_WALL_LABEL = 0.5; // skip short segments (door jambs, corner posts)
const LINE_HEIGHT = 38;
const PADDING = 14;
const FONT = "600 30px system-ui, sans-serif";

function makeTextSprite(text: string, color: string): THREE.Sprite {
  const lines = text.split("\n");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.font = FONT;
  const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
  canvas.width = Math.ceil(textWidth + PADDING * 2);
  canvas.height = lines.length * LINE_HEIGHT + PADDING * 2;

  // Re-set font after canvas resize (resets the context state)
  ctx.font = FONT;
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, PADDING + LINE_HEIGHT / 2 + i * LINE_HEIGHT);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, toneMapped: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width / PX_PER_UNIT, canvas.height / PX_PER_UNIT, 1);
  return sprite;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Horizontal length of a box (its long side in the XZ plane). */
function boxLength(box: Box): number {
  return Math.max(box.maxX - box.minX, box.maxZ - box.minZ);
}

/**
 * Dimension overlay ("cotes"): room name + size over each room,
 * lengths of wall parts and openings along each wall. Toggle with Tab / the HUD button.
 */
export function buildDimensions(def: ApartmentDef): THREE.Group {
  const group = new THREE.Group();

  for (const area of def.areas) {
    if (!area.label) continue;
    const [minX, minZ, maxX, maxZ] = area.rect;
    const text = roomLabelText({ label: area.label, w: maxX - minX, d: maxZ - minZ });
    const sprite = makeTextSprite(text, "#1a1a2e");
    sprite.position.set((minX + maxX) / 2, 2.0, (minZ + maxZ) / 2);
    group.add(sprite);
  }

  const addLength = (box: Box, y: number, color: string) => {
    const length = boxLength(box);
    if (length < MIN_WALL_LABEL) return;
    const sprite = makeTextSprite(formatMeters(length), color);
    sprite.position.set((box.minX + box.maxX) / 2, y, (box.minZ + box.maxZ) / 2);
    group.add(sprite);
  };
  for (const wall of def.walls) {
    const pieces = wallPieces(wall, def.wallHeight);
    for (const piece of pieces.solid) {
      if (piece.minY === 0 && piece.maxY === def.wallHeight) addLength(piece, 0.45, "#333333");
    }
    for (const opening of pieces.openings) addLength(opening, 1.2, "#1d5fa8");
  }

  return group;
}

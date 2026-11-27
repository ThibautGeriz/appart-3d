import * as THREE from "three";
import type { ApartmentDef } from "../data/apartment";
import { dimensionChains, formatCm, type DimensionChain } from "./dimensionLines";
import { ceilingText, roomLabelText } from "./labels";

/** Height of the dimension chain on the wall, and of the overall dimension above it. */
const CHAIN_Y = 1.75;
const TOTAL_Y = 2.0;
/** Gap between the wall face and the drawing (no z-fighting). */
const FACE_OFFSET = 0.004;
const LINE_WIDTH = 0.006;
const TICK = 0.1; // vertical tick at each break
const SLASH = 0.035; // half size of the 45° architect's slash
const TEXT_HEIGHT = 0.075;
const TEXT_GAP = 0.012;

/** Room tag size, as a fraction of the screen height per canvas px. */
const ROOM_TAG_SCALE = 0.0011;

const WALL_COLOR = "#222222";
const OPENING_COLOR = "#1d5fa8";

// Label atlas: one canvas, one texture, one draw call
const CELL_W = 128;
const CELL_H = 44;
const ATLAS_COLS = 8;
const ATLAS_FONT = "600 30px system-ui, sans-serif";

interface QuadBuilder {
  positions: number[];
  uvs: number[];
  colors: number[];
}

function newBuilder(): QuadBuilder {
  return { positions: [], uvs: [], colors: [] };
}

/** Point on a chain's face: `u` along the wall, `y` up. */
function facePoint(chain: DimensionChain, u: number, y: number): [number, number, number] {
  const n = chain.plane + chain.normal * FACE_OFFSET;
  return chain.axis === "x" ? [u, y, n] : [n, y, u];
}

/** Viewer's right along the wall, for a face looked at from the side it points to. */
function rightSign(chain: DimensionChain): number {
  return chain.axis === "x" ? chain.normal : -chain.normal;
}

/** Quad on the face from four (u, y) corners: bottom-left, bottom-right, top-right, top-left. */
function addQuad(
  b: QuadBuilder,
  chain: DimensionChain,
  corners: [number, number][],
  color: THREE.Color,
  uv: [number, number, number, number] = [0, 0, 0, 0],
): void {
  const [u0, v0, u1, v1] = uv;
  const uvCorners: [number, number][] = [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1],
  ];
  // Front side toward the viewer: counter-clockwise as seen from the room
  const area = corners.reduce((sum, [u, y], i) => {
    const [nu, ny] = corners[(i + 1) % corners.length];
    return sum + u * ny - nu * y;
  }, 0);
  const order = area * rightSign(chain) > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  for (const i of order) {
    b.positions.push(...facePoint(chain, corners[i][0], corners[i][1]));
    b.uvs.push(...uvCorners[i]);
    b.colors.push(color.r, color.g, color.b);
  }
}

/** Straight stroke on the face from (ua, ya) to (ub, yb). */
function addStroke(
  b: QuadBuilder,
  chain: DimensionChain,
  [ua, ya]: [number, number],
  [ub, yb]: [number, number],
  color: THREE.Color,
): void {
  const du = ub - ua;
  const dy = yb - ya;
  const len = Math.hypot(du, dy);
  const nu = (-dy / len) * (LINE_WIDTH / 2);
  const ny = (du / len) * (LINE_WIDTH / 2);
  addQuad(
    b,
    chain,
    [
      [ua - nu, ya - ny],
      [ub - nu, yb - ny],
      [ub + nu, yb + ny],
      [ua + nu, ya + ny],
    ],
    color,
  );
}

/** Dimension line from u0 to u1 at height y: line, ticks and slashes at both ends. */
function addDimensionLine(
  b: QuadBuilder,
  chain: DimensionChain,
  u0: number,
  u1: number,
  y: number,
  color: THREE.Color,
): void {
  addStroke(b, chain, [u0, y], [u1, y], color);
  const s = rightSign(chain);
  for (const u of [u0, u1]) {
    addStroke(b, chain, [u, y - TICK / 2], [u, y + TICK / 2], color);
    // Slash leans to the viewer's right, whichever face is looked at
    addStroke(b, chain, [u - s * SLASH, y - SLASH], [u + s * SLASH, y + SLASH], color);
  }
}

interface Label {
  chain: DimensionChain;
  text: string;
  color: string;
  /** center along the wall */
  u: number;
  /** bottom of the text box when above the line, top when below */
  y: number;
  below: boolean;
}

class LabelAtlas {
  private cells = new Map<string, { index: number; width: number }>();
  readonly canvas = document.createElement("canvas");

  constructor(labels: Label[]) {
    const ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.font = ATLAS_FONT;
    for (const { text, color } of labels) {
      const key = `${color}|${text}`;
      if (this.cells.has(key)) continue;
      const width = Math.min(CELL_W, ctx.measureText(text).width + 14);
      this.cells.set(key, { index: this.cells.size, width });
    }
    this.canvas.width = CELL_W * ATLAS_COLS;
    this.canvas.height = CELL_H * Math.max(1, Math.ceil(this.cells.size / ATLAS_COLS));
    // Canvas resize resets the context state
    ctx.font = ATLAS_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const [key, { index, width }] of this.cells) {
      const [color, text] = key.split("|");
      const x = (index % ATLAS_COLS) * CELL_W + (CELL_W - width) / 2;
      const y = Math.floor(index / ATLAS_COLS) * CELL_H;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 3, width - 2, CELL_H - 6, 8);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillText(text, x + width / 2, y + CELL_H / 2 + 1);
    }
  }

  /** Text box size in meters and its UV rect. */
  cell(text: string, color: string): { w: number; uv: [number, number, number, number] } {
    const { index, width } = this.cells.get(`${color}|${text}`)!;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const x = (index % ATLAS_COLS) * CELL_W + (CELL_W - width) / 2;
    const y = Math.floor(index / ATLAS_COLS) * CELL_H;
    return {
      w: (TEXT_HEIGHT * width) / CELL_H,
      uv: [x / W, 1 - (y + CELL_H) / H, (x + width) / W, 1 - y / H],
    };
  }
}

function addLabel(b: QuadBuilder, atlas: LabelAtlas, label: Label): void {
  const { w, uv } = atlas.cell(label.text, label.color);
  const s = rightSign(label.chain);
  const left = label.u - (s * w) / 2;
  const right = label.u + (s * w) / 2;
  const bottom = label.below ? label.y - TEXT_HEIGHT : label.y;
  const top = bottom + TEXT_HEIGHT;
  addQuad(
    b,
    label.chain,
    [
      [left, bottom],
      [right, bottom],
      [right, top],
      [left, top],
    ],
    new THREE.Color(1, 1, 1),
    uv,
  );
}

function toMesh(b: QuadBuilder, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(b.positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(b.uvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(b.colors, 3));
  geometry.computeBoundingSphere();
  return new THREE.Mesh(geometry, material);
}

/**
 * Room name, size and ceiling height, floating over the room (also the
 * furniture tags, smaller: `scale`). Lines of `text` split on "\n", the
 * first one bold.
 */
export function makeRoomSprite(text: string, color: string, scale = ROOM_TAG_SCALE): THREE.Sprite {
  const font = "600 30px system-ui, sans-serif";
  const lineHeight = 38;
  const padding = 12;
  const lines = text.split("\n");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.font = font;
  canvas.width = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2);
  canvas.height = lines.length * lineHeight + padding * 2;
  ctx.font = font;
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, 12);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? "700 32px system-ui, sans-serif" : font;
    ctx.fillText(line, canvas.width / 2, padding + lineHeight / 2 + i * lineHeight);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    // Constant screen size: a room tag must not fill the view when walking under it
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      sizeAttenuation: false,
    }),
  );
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  return sprite;
}

/**
 * Dimension overlay ("cotes"): dimension lines drawn in perspective on every
 * wall face, in centimeters — the chain of wall parts and openings, and the
 * overall length above it — plus the room name and size over each room.
 * Toggle with Tab / the HUD button.
 */
export function buildDimensions(def: ApartmentDef): THREE.Group {
  const group = new THREE.Group();
  const lines = newBuilder();
  const labels: Label[] = [];
  const wallColor = new THREE.Color(WALL_COLOR);
  const openingColor = new THREE.Color(OPENING_COLOR);

  for (const chain of dimensionChains(def)) {
    const { span, segments } = chain;
    for (const seg of segments) {
      const color = seg.opening ? openingColor : wallColor;
      addDimensionLine(lines, chain, seg.min, seg.max, CHAIN_Y, color);
      const length = seg.max - seg.min;
      const text = formatCm(length);
      // Too narrow for its number: write it under the line
      const below = length < 0.03 * text.length + 0.06;
      labels.push({
        chain,
        text,
        color: seg.opening ? OPENING_COLOR : WALL_COLOR,
        u: (seg.min + seg.max) / 2,
        y: below ? CHAIN_Y - TEXT_GAP : CHAIN_Y + TEXT_GAP,
        below,
      });
    }
    if (segments.length > 1) {
      addDimensionLine(lines, chain, span.min, span.max, TOTAL_Y, wallColor);
      labels.push({
        chain,
        text: formatCm(span.max - span.min),
        color: WALL_COLOR,
        u: (span.min + span.max) / 2,
        y: TOTAL_Y + TEXT_GAP,
        below: false,
      });
    }
  }

  group.add(
    toMesh(
      lines,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
      }),
    ),
  );

  const atlas = new LabelAtlas(labels);
  const texts = newBuilder();
  for (const label of labels) addLabel(texts, atlas, label);
  const texture = new THREE.CanvasTexture(atlas.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4; // labels are mostly seen at grazing angles
  const textMesh = toMesh(
    texts,
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  textMesh.renderOrder = 1; // over the lines
  group.add(textMesh);

  for (const area of def.areas) {
    const [minX, minZ, maxX, maxZ] = area.rect;
    const lowered = area.ceiling !== undefined && area.ceiling < def.wallHeight;
    const ceiling = area.outdoor ? undefined : (area.ceiling ?? def.wallHeight);
    let text: string;
    if (area.label) {
      text = roomLabelText({ label: area.label, w: maxX - minX, d: maxZ - minZ, ceiling, lowered });
    } else if (lowered && area.ceiling !== undefined) {
      text = ceilingText(area.ceiling, true);
    } else {
      continue;
    }
    // Lowered-ceiling labels hang just under their soffit
    const y = Math.min(2.2, (ceiling ?? def.wallHeight) - 0.15);
    const sprite = makeRoomSprite(text, lowered ? "#8a3b12" : "#1a1a2e");
    sprite.position.set((minX + maxX) / 2, y, (minZ + maxZ) / 2);
    group.add(sprite);
  }

  return group;
}

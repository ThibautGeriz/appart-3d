import * as THREE from "three";
import { CATALOG } from "../data/catalog";
import type { ApartmentDef } from "../data/apartment";
import type { Collider } from "../player/movement";
import {
  decorLayout,
  defaultSelection,
  fits,
  furnishingLayout,
  type FurnishingDef,
  type Placement,
  type Selection,
  type SlotDef,
  type SlotId,
  wallBedOpenRect,
} from "./furnishing";
import { loadFile, prepare } from "./models";
import { rectCollider } from "./plan";
import { poseWallBed, stepOpening } from "./wallBed";

/** Marks the wall bed's model, so a click on any of its meshes finds it. */
const WALL_BED_TAG = "wallBed";

/** Is this object (or one of its parents) the wall bed? */
export function isWallBed(object: THREE.Object3D | null): boolean {
  for (let o = object; o; o = o.parent) if (o.userData[WALL_BED_TAG]) return true;
  return false;
}

const STORAGE_KEY = "appart-3d.furniture";

/** Material of the sofa fabric (tinted with the chosen colour). */
const SOFA_FABRIC = "roma fabric";
/** Mustard, as in the showroom. */
export const DEFAULT_SOFA_COLOR = "#c9971c";

interface Saved {
  selection: Selection;
  sofaColor: string;
}

/** Saved choice (per viewer), falling back to the slot's default for anything unknown or too wide. */
function load(def: FurnishingDef): Saved {
  const defaults = defaultSelection(def);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<
      Record<SlotId, string>
    > & { sofaColor?: string };
    const valid = (s: SlotDef) => {
      const p = CATALOG.find((x) => x.id === saved[s.id]);
      return p && fits(s, p) ? p.id : defaults[s.id];
    };
    const color = saved.sofaColor;
    return {
      selection: Object.fromEntries(def.slots.map((s) => [s.id, valid(s)])) as Selection,
      sofaColor: color && /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_SOFA_COLOR,
    };
  } catch {
    return { selection: defaults, sofaColor: DEFAULT_SOFA_COLOR };
  }
}

function save(saved: Saved): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...saved.selection, sofaColor: saved.sofaColor }),
    );
  } catch {
    // private mode / blocked storage: the choice just is not remembered
  }
}

export interface Furniture {
  /** add to the apartment group, so click-to-move can aim at it */
  group: THREE.Group;
  selection: Selection;
  placements: Placement[];
  /** put a product in a slot; resolves once the new models are in */
  select(slot: SlotId, id: string): Promise<void>;
  /** fabric colour of the sofa ("#rrggbb") */
  sofaColor: string;
  setSofaColor(color: string): void;
  /** called after each change (rebuild the path grid, shadows…) */
  onChange(listener: () => void): void;
  /** the wall bed is open (or opening) */
  bedOpen: boolean;
  /** open the wall bed if closed, close it if open (animated) */
  toggleBed(): void;
  /** advance animations; true while something moves (shadows need a redraw) */
  update(dt: number): boolean;
}

/**
 * The movable furniture: loads the selected catalog GLBs, places them from the
 * layout and keeps their colliders in `colliders` (shared with the player).
 */
export function createFurniture(
  def: ApartmentDef,
  colliders: Collider[],
  isTouch: boolean,
): Furniture {
  const group = new THREE.Group();
  group.name = "furniture";
  const listeners: (() => void)[] = [];
  let own: Collider[] = [];
  let version = 0;
  let bedModel: THREE.Object3D | null = null;
  let bedPlacement: Placement | null = null;
  /** 0 closed → 1 open */
  let opening = 0;
  let openCollider: Collider | null = null;

  /** The open bed takes floor: add / remove its collider, then notify. */
  const setOpenCollider = (on: boolean) => {
    if (on === (openCollider !== null)) return;
    if (openCollider) {
      colliders.splice(colliders.indexOf(openCollider), 1);
      openCollider = null;
    } else {
      const rect = bedPlacement && wallBedOpenRect(bedPlacement);
      if (!rect) return;
      openCollider = rectCollider(rect);
      colliders.push(openCollider);
    }
    listeners.forEach((l) => l());
  };

  const saved = load(def.furnishing);
  const persist = () => save({ selection: furniture.selection, sofaColor: furniture.sofaColor });
  /** tint the sofa fabric (shared by the sofa's meshes) */
  const tint = () =>
    group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      for (const m of [o.material].flat() as THREE.Material[]) {
        if (m.name === SOFA_FABRIC && "color" in m)
          (m.color as THREE.Color).set(furniture.sofaColor);
      }
    });

  const furniture: Furniture = {
    group,
    selection: saved.selection,
    sofaColor: saved.sofaColor,
    placements: [],
    async select(slot, id) {
      furniture.selection = { ...furniture.selection, [slot]: id };
      persist();
      await place();
    },
    setSofaColor(color) {
      furniture.sofaColor = color;
      persist();
      tint();
    },
    onChange(listener) {
      listeners.push(listener);
    },
    bedOpen: false,
    toggleBed() {
      if (!bedModel) return;
      furniture.bedOpen = !furniture.bedOpen;
      // opening takes the floor right away; closing frees it once folded up
      if (furniture.bedOpen) setOpenCollider(true);
    },
    update(dt) {
      if (!bedModel) return false;
      const target = furniture.bedOpen ? 1 : 0;
      if (opening === target) return false;
      opening = stepOpening(opening, furniture.bedOpen, dt);
      poseWallBed(bedModel, opening);
      if (opening === 0) setOpenCollider(false);
      return true;
    },
  };

  async function place(): Promise<void> {
    const current = ++version;
    const placements = furnishingLayout(def.furnishing, furniture.selection);
    const decor = decorLayout(def.furnishing, furniture.selection, placements);
    const [models, decorModels] = await Promise.all([
      Promise.all(placements.map((p) => loadFile(p.product.id))),
      Promise.all(decor.map((d) => loadFile(d.file))),
    ]);
    if (current !== version) return; // a newer selection won the race
    group.clear();
    bedModel = null;
    bedPlacement = null;
    placements.forEach((p, i) => {
      const model = prepare(models[i].clone(), isTouch);
      model.position.set(p.x, 0, p.z);
      model.rotation.y = p.rotationY;
      if (p.product.wallBed) {
        model.userData[WALL_BED_TAG] = true;
        bedModel = model;
        bedPlacement = p;
        poseWallBed(model, opening);
      }
      group.add(model);
    });
    decor.forEach((d, i) => {
      const model = prepare(decorModels[i].clone(), isTouch);
      model.position.set(d.x, 0, d.z);
      model.rotation.y = d.rotationY;
      // rugs: no shadow of their own, but they receive them
      if (d.file.includes("rug")) model.traverse((o) => (o.castShadow = false));
      group.add(model);
    });
    tint();
    // swap our colliders in the shared list (kept by reference by the player)
    for (const c of own) colliders.splice(colliders.indexOf(c), 1);
    own = [
      ...placements.flatMap((p) => (p.rects ?? [p.rect]).map(rectCollider)),
      ...decor.flatMap((d) => (d.rect ? [rectCollider(d.rect)] : [])),
    ];
    colliders.push(...own);
    // an open bed switched for another product: its open footprint follows
    if (openCollider) colliders.splice(colliders.indexOf(openCollider), 1);
    openCollider = null;
    const openRect = furniture.bedOpen && bedPlacement ? wallBedOpenRect(bedPlacement) : null;
    if (openRect) {
      openCollider = rectCollider(openRect);
      colliders.push(openCollider);
    }
    furniture.placements = placements;
    listeners.forEach((l) => l());
  }

  void place();
  return furniture;
}

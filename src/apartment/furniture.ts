import * as THREE from "three";
import { CATALOG, type ProductKind } from "../data/catalog";
import type { ApartmentDef } from "../data/apartment";
import type { Collider } from "../player/movement";
import { furnishingLayout, type Placement, type Selection } from "./furnishing";
import { loadFile, prepare } from "./models";
import { rectCollider } from "./plan";

const STORAGE_KEY = "appart-3d.furniture";

/** Saved selection (per viewer), falling back to the defaults for anything unknown. */
function savedSelection(defaults: Selection): Selection {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Selection>;
    const valid = (kind: ProductKind) => {
      const id = saved[kind];
      return CATALOG.some((p) => p.id === id && p.kind === kind) ? id! : defaults[kind];
    };
    return { table: valid("table"), chair: valid("chair"), coffeeTable: valid("coffeeTable") };
  } catch {
    return { ...defaults };
  }
}

function save(selection: Selection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // private mode / blocked storage: the choice just is not remembered
  }
}

export interface Furniture {
  /** add to the apartment group, so click-to-move can aim at it */
  group: THREE.Group;
  selection: Selection;
  placements: Placement[];
  /** switch one kind of product; resolves once the new models are in */
  select(kind: ProductKind, id: string): Promise<void>;
  /** called after each change (rebuild the path grid, shadows…) */
  onChange(listener: () => void): void;
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

  const furniture: Furniture = {
    group,
    selection: savedSelection(def.furnishing.defaults),
    placements: [],
    async select(kind, id) {
      furniture.selection = { ...furniture.selection, [kind]: id };
      save(furniture.selection);
      await place();
    },
    onChange(listener) {
      listeners.push(listener);
    },
  };

  async function place(): Promise<void> {
    const current = ++version;
    const placements = furnishingLayout(def.furnishing, furniture.selection);
    const models = await Promise.all(placements.map((p) => loadFile(p.product.id)));
    if (current !== version) return; // a newer selection won the race
    group.clear();
    placements.forEach((p, i) => {
      const model = prepare(models[i].clone(), isTouch);
      model.position.set(p.x, 0, p.z);
      model.rotation.y = p.rotationY;
      group.add(model);
    });
    // swap our colliders in the shared list (kept by reference by the player)
    for (const c of own) colliders.splice(colliders.indexOf(c), 1);
    own = placements.map((p) => rectCollider(p.rect));
    colliders.push(...own);
    furniture.placements = placements;
    listeners.forEach((l) => l());
  }

  void place();
  return furniture;
}

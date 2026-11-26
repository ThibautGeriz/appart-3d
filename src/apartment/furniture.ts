import * as THREE from "three";
import { CATALOG, type ProductKind } from "../data/catalog";
import type { ApartmentDef } from "../data/apartment";
import type { Collider } from "../player/movement";
import { furnishingLayout, type Placement, type Selection } from "./furnishing";
import { loadFile, prepare } from "./models";
import { rectCollider } from "./plan";

const STORAGE_KEY = "appart-3d.furniture";

/** Material of the sofa fabric (tinted with the chosen colour). */
const SOFA_FABRIC = "roma fabric";
/** Mustard, as in the showroom. */
export const DEFAULT_SOFA_COLOR = "#c9971c";

interface Saved {
  selection: Selection;
  sofaColor: string;
}

/** Saved choice (per viewer), falling back to the defaults for anything unknown. */
function load(defaults: Selection): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Selection> & {
      sofaColor?: string;
    };
    const valid = (kind: ProductKind) => {
      const id = saved[kind];
      return CATALOG.some((p) => p.id === id && p.kind === kind) ? id! : defaults[kind];
    };
    const kinds: ProductKind[] = ["table", "chair", "coffeeTable", "sofa", "sideboard", "tvUnit"];
    const color = saved.sofaColor;
    return {
      selection: Object.fromEntries(kinds.map((k) => [k, valid(k)])) as Selection,
      sofaColor: color && /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_SOFA_COLOR,
    };
  } catch {
    return { selection: { ...defaults }, sofaColor: DEFAULT_SOFA_COLOR };
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
  /** switch one kind of product; resolves once the new models are in */
  select(kind: ProductKind, id: string): Promise<void>;
  /** fabric colour of the sofa ("#rrggbb") */
  sofaColor: string;
  setSofaColor(color: string): void;
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

  const saved = load(def.furnishing.defaults);
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
    async select(kind, id) {
      furniture.selection = { ...furniture.selection, [kind]: id };
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
    tint();
    // swap our colliders in the shared list (kept by reference by the player)
    for (const c of own) colliders.splice(colliders.indexOf(c), 1);
    own = placements.flatMap((p) => (p.rects ?? [p.rect]).map(rectCollider));
    colliders.push(...own);
    furniture.placements = placements;
    listeners.forEach((l) => l());
  }

  void place();
  return furniture;
}

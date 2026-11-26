import type * as THREE from "three";
import type { PropModel } from "../data/apartment";
import { mannequin } from "./mannequin";
import { showerDrain, showerScreen, showerSet } from "./shower";
import { toilet } from "./toilet";
import { washingMachine } from "./washingMachine";

/**
 * Model sources, used only by the GLB export (`npm run export:glb`); the app
 * loads the exported models/*.glb. Each builder takes the footprint from the
 * layout data: width `w` (local x), depth `d` (local z), height `h`.
 */
export const PROP_BUILDERS: Record<PropModel, (w: number, d: number, h: number) => THREE.Group> = {
  washingMachine,
  toilet,
  showerSet,
  showerScreen,
  showerDrain,
};

export { mannequin };

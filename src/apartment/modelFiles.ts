import type { PropModel } from "../data/apartment";

/** Models shipped as models/<file>.glb: the layout's props plus the player avatar. */
export type ModelName = PropModel | "avatar";

export const MODEL_FILES: Record<ModelName, string> = {
  washingMachine: "washing-machine",
  toilet: "toilet",
  showerSet: "shower-set",
  showerScreen: "shower-screen",
  showerDrain: "shower-drain",
  kitchenSink: "kitchen-sink",
  kitchenTap: "kitchen-tap",
  avatar: "avatar",
};

import { modelFootprint } from "../apartment/facing";
import { MODEL_FILES } from "../apartment/modelFiles";
import { allFurniture } from "../apartment/plan";
import { APARTMENT_DEF, type PropModel } from "../data/apartment";
import { CATALOG } from "../data/catalog";

/** A shipped model and the product it should look like. */
export interface ModelSource {
  /** models/<file>.glb */
  file: string;
  name: string;
  /** product page, when the model is a real product */
  url?: string;
  /** size it is built at (cm): width x, depth z, height y */
  expected: { w: number; d: number; h: number };
  /** catalog: materials as listed by the seller */
  materials?: string;
}

const cm = (m: number) => Math.round(m * 1000) / 10;

/** Every model the app ships (props + catalog), with its source page. Pure. */
export function modelSources(): ModelSource[] {
  const furniture = allFurniture(APARTMENT_DEF);
  const props = (Object.keys(MODEL_FILES) as (PropModel | "avatar")[]).flatMap((model) => {
    const item = furniture.find((f) => f.model === model);
    if (!item) return [];
    const [w, d] = modelFootprint(item.rect, item.facing ?? "+z");
    return [
      {
        file: MODEL_FILES[model],
        name: item.name,
        url: furniture.find((f) => f.model === model && f.source)?.source,
        expected: { w: cm(w), d: cm(d), h: cm(item.h) },
      },
    ];
  });
  const products = CATALOG.map((p) => ({
    file: p.id,
    name: p.name,
    url: p.url,
    expected: { w: cm(p.w), d: cm(p.d), h: cm(p.h) },
    materials: p.materials,
  }));
  return [...props, ...products];
}

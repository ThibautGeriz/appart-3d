import { fits, type FurnishingDef } from "../apartment/furnishing";
import { CATALOG, kindLabel, type Product } from "../data/catalog";
import { DETAILS, type ProductDetails } from "../data/catalogDetails";

/**
 * The catalog page's rows: each product with its details, where it can go in
 * the apartment, and the characteristics it can be sorted by. Pure.
 */

export interface CatalogRow {
  product: Product;
  details: ProductDetails | null;
  kind: string;
  /** "Séjour / Cuisine · Chaises", for every slot it fits */
  places: string[];
  /** floor taken, m² */
  footprint: number;
}

export type SortKey =
  | "name"
  | "kind"
  | "price"
  | "width"
  | "depth"
  | "height"
  | "footprint"
  | "seat"
  | "weight"
  | "density"
  | "martindale"
  | "load"
  | "warranty"
  | "origin"
  | "seller";

/** Sort options, as listed in the page (French labels). */
export const SORT_KEYS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Nom" },
  { key: "kind", label: "Type" },
  { key: "price", label: "Prix" },
  { key: "width", label: "Largeur" },
  { key: "depth", label: "Profondeur" },
  { key: "height", label: "Hauteur" },
  { key: "footprint", label: "Emprise au sol" },
  { key: "seat", label: "Hauteur d'assise" },
  { key: "weight", label: "Poids" },
  { key: "density", label: "Densité mousse" },
  { key: "martindale", label: "Martindale" },
  { key: "load", label: "Charge max" },
  { key: "warranty", label: "Garantie" },
  { key: "origin", label: "Origine" },
  { key: "seller", label: "Vendeur" },
];

/** Where the model is built from (src/models/furniture/<file>.ts). Pure. */
export function modelSource(p: Product): string {
  const file =
    p.kind === "shelf"
      ? p.id.startsWith("bookcase-")
        ? "study"
        : "bedroom"
      : {
          table: "tables",
          coffeeTable: "tables",
          chair: "chairs",
          sofa: "sofa",
          sideboard: "sideboards",
          tvUnit: "sideboards",
          bed: "bedroom",
          nightstand: "bedroom",
          wallBed: "study",
          desk: "study",
          officeChair: "study",
        }[p.kind];
  return `src/models/furniture/${file}.ts`;
}

export function catalogRows(furnishing: FurnishingDef): CatalogRow[] {
  return CATALOG.map((product) => ({
    product,
    details: DETAILS[product.id] ?? null,
    kind: kindLabel(product.kind),
    places: furnishing.slots
      .filter((s) => s.kind === product.kind && fits(s, product))
      .map((s) => `${s.room} · ${s.title}`),
    footprint: (product.parts ?? [[-product.w / 2, -product.d / 2, product.w / 2, product.d / 2]])
      .map(([x0, z0, x1, z1]) => (x1 - x0) * (z1 - z0))
      .reduce((a, b) => a + b, 0),
  }));
}

/** The value a row is sorted by (null: not known, always listed last). */
export function sortValue(row: CatalogRow, key: SortKey): number | string | null {
  const { product: p, details: d } = row;
  switch (key) {
    case "name":
      return p.name.toLowerCase();
    case "kind":
      return row.kind;
    case "price":
      return p.owned ? null : p.price || null;
    case "width":
      return p.w;
    case "depth":
      return p.d;
    case "height":
      return p.h;
    case "footprint":
      return row.footprint;
    case "seat":
      return p.seatHeight ?? null;
    case "weight":
      return d?.weightKg ?? null;
    case "density":
      return d?.density ?? null;
    case "martindale":
      return d?.martindale ?? null;
    case "load":
      return d?.maxLoadKg ?? null;
    case "warranty":
      return d?.warrantyYears ?? null;
    case "origin":
      return d?.origin?.toLowerCase() ?? null;
    case "seller":
      return d?.seller.toLowerCase() ?? null;
  }
}

/** Sorted copy; unknown values last whatever the direction, ties by name. */
export function sortRows(rows: CatalogRow[], key: SortKey, ascending: boolean): CatalogRow[] {
  const name = (r: CatalogRow) => r.product.name.toLowerCase();
  return [...rows].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va === null || vb === null) {
      if (va !== vb) return va === null ? 1 : -1;
      return name(a).localeCompare(name(b), "fr");
    }
    const order =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb), "fr");
    return (ascending ? order : -order) || name(a).localeCompare(name(b), "fr");
  });
}

/** Rows of these kinds (all: empty set) whose text matches the search. */
export function filterRows(rows: CatalogRow[], kinds: Set<string>, search: string): CatalogRow[] {
  const q = search
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  return rows.filter((r) => {
    if (kinds.size && !kinds.has(r.product.kind)) return false;
    if (!q) return true;
    const text = [
      r.product.name,
      r.kind,
      r.product.materials,
      r.details?.seller,
      r.details?.brand,
      r.details?.origin,
      ...(r.details?.specs.map((s) => `${s.label} ${s.value}`) ?? []),
      ...r.places,
    ]
      .join(" ")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
    return text.includes(q);
  });
}

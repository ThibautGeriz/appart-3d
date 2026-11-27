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
      return p.seatFoamDensity ?? null;
    case "martindale":
      return d?.martindale ?? null;
    case "load":
      return d?.maxLoadKg ?? null;
    case "warranty":
      return d?.warrantyYears ?? null;
    case "origin":
      return p.madeIn?.toLowerCase() ?? null;
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

/** The facets of the left panel: what each row is filtered on. */
export interface Filters {
  /** product kinds (none: all) */
  kinds: Set<string>;
  /** sellers (none: all) */
  sellers: Set<string>;
  /** € range, inclusive (null: any price, the products without a price too) */
  price: [number, number] | null;
  search: string;
}

/** Nothing filtered, with the given facets set. */
export function filters(set: Partial<Filters> = {}): Filters {
  return { kinds: new Set(), sellers: new Set(), price: null, search: "", ...set };
}

/** What the row costs: null when owned or not priced. */
export function priceOf(row: CatalogRow): number | null {
  return row.product.owned ? null : row.product.price || null;
}

export function sellerOf(row: CatalogRow): string {
  return row.details?.seller ?? "Inconnu";
}

/** The € range of the priced rows, rounded out to whole euros. */
export function priceBounds(rows: CatalogRow[]): [number, number] {
  const prices = rows.map(priceOf).filter((p): p is number => p !== null);
  return prices.length ? [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))] : [0, 0];
}

/** Slider position (0..1) ↔ €, on a log scale: most products cost under 1 000 €. */
export function priceAt(t: number, [lo, hi]: [number, number]): number {
  const a = Math.log(Math.max(1, lo));
  const b = Math.log(Math.max(1, hi));
  return Math.round(Math.exp(a + Math.min(1, Math.max(0, t)) * (b - a)));
}

export function positionOf(price: number, [lo, hi]: [number, number]): number {
  const a = Math.log(Math.max(1, lo));
  const b = Math.log(Math.max(1, hi));
  return b === a ? 0 : Math.min(1, Math.max(0, (Math.log(Math.max(1, price)) - a) / (b - a)));
}

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** Rows matching every facet and the search; `ignore` leaves one facet out (for its counts). */
export function filterRows(
  rows: CatalogRow[],
  filters: Filters,
  ignore?: "kinds" | "sellers" | "price",
): CatalogRow[] {
  const q = fold(filters.search);
  return rows.filter((r) => {
    if (ignore !== "kinds" && filters.kinds.size && !filters.kinds.has(r.product.kind))
      return false;
    if (ignore !== "sellers" && filters.sellers.size && !filters.sellers.has(sellerOf(r)))
      return false;
    if (ignore !== "price" && filters.price) {
      const price = priceOf(r);
      if (price === null || price < filters.price[0] || price > filters.price[1]) return false;
    }
    if (!q) return true;
    const text = [
      r.product.name,
      r.kind,
      r.product.materials,
      r.details?.seller,
      r.details?.brand,
      r.product.madeIn,
      ...(r.details?.specs.map((s) => `${s.label} ${s.value}`) ?? []),
      ...r.places,
    ].join(" ");
    return fold(text).includes(q);
  });
}

/**
 * A facet's values with their counts, given the other facets (the usual
 * shop behaviour: ticking a type shows how many of each seller remain).
 * Every value of the catalog is listed, 0 when nothing is left.
 */
export function facetCounts(
  rows: CatalogRow[],
  filters: Filters,
  facet: "kinds" | "sellers",
): Map<string, number> {
  const value = (r: CatalogRow) => (facet === "kinds" ? r.product.kind : sellerOf(r));
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(value(r), 0);
  for (const r of filterRows(rows, filters, facet)) counts.set(value(r), counts.get(value(r))! + 1);
  return counts;
}

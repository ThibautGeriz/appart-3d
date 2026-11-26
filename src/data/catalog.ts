/**
 * Furniture catalog: real products, with the dimensions and prices from the
 * seller's product page (cocktail-scandinave.fr); 0 when the seller gives no price.
 * Only sizes that fit the séjour are listed (no 3 m tables). Each one ships as
 * models/<file>.glb, built from src/models/furniture/ at exactly this size.
 * Sizes in meters: w (width, local x), d (depth, local z, the front faces
 * +z), h (height).
 */

export type ProductKind = "table" | "chair" | "coffeeTable";

export interface Product {
  id: string;
  kind: ProductKind;
  /** name shown in the furniture toolbar */
  name: string;
  /** product page */
  url: string;
  w: number;
  d: number;
  h: number;
  /** chairs: height of the seat */
  seatHeight?: number;
  /** materials as listed by the seller */
  materials: string;
  /** unit price in euros (seller's page, November 2026); 0 when the seller gives none */
  price: number;
}

const SHOP = "https://cocktail-scandinave.fr";

export const CATALOG: Product[] = [
  // ── Tables (length along x) ────────────────────────────────────────────
  {
    id: "table-valmo-180",
    kind: "table",
    name: "Valmo 180",
    url: `${SHOP}/table-valmo/`,
    w: 1.8,
    d: 0.9,
    h: 0.76,
    materials: "Plateau teck recyclé, pieds métal noir",
    price: 569,
  },
  {
    id: "table-valmo-220",
    kind: "table",
    name: "Valmo 220",
    url: `${SHOP}/table-valmo/`,
    w: 2.2,
    d: 0.9,
    h: 0.76,
    materials: "Plateau teck recyclé, pieds métal noir",
    price: 669,
  },
  {
    id: "table-raia-220",
    kind: "table",
    name: "Raia 220",
    url: `${SHOP}/table-raia/`,
    w: 2.2,
    d: 1.06,
    h: 0.76,
    materials: "Plateau suar massif huilé en 2 parties, piétement métal laqué noir",
    price: 795,
  },
  {
    id: "table-willow-220",
    kind: "table",
    name: "Willow 220",
    url: `${SHOP}/table-willow/`,
    w: 2.2,
    d: 1.0,
    h: 0.79,
    materials: "Plateau teck massif, piétement croix en métal",
    price: 695,
  },
  // ── Chairs ──────────────────────────────────────────────────────────────
  {
    id: "chair-bistrot",
    kind: "chair",
    name: "Bistrot",
    url: `${SHOP}/chaise-bistrot-assise-bois-recycle/`,
    w: 0.46,
    d: 0.49,
    h: 0.92,
    seatHeight: 0.478,
    materials: "Fer vieilli, assise orme recyclé",
    price: 99,
  },
  {
    id: "chair-norway",
    kind: "chair",
    name: "Norway",
    url: `${SHOP}/chaise-norway/`,
    w: 0.51,
    d: 0.53,
    h: 1.05,
    seatHeight: 0.48, // not given by the seller ("–"): standard dining seat
    materials: "Chêne huilé, assise tissu microfibre",
    price: 159,
  },
  {
    id: "chair-westmount",
    kind: "chair",
    name: "Westmount",
    url: `${SHOP}/chaise-westmount/`,
    w: 0.4,
    d: 0.5,
    h: 0.88,
    seatHeight: 0.45,
    materials: "Fer vieilli, assise et dossier sapin massif",
    price: 69,
  },
  {
    id: "chair-mackay",
    kind: "chair",
    name: "Mackay",
    url: `${SHOP}/chaise-mackay/`,
    w: 0.43,
    d: 0.5,
    h: 0.82,
    seatHeight: 0.46, // not given by the seller: measured on the photo
    materials: "Fer noir vieilli, assise orme massif",
    price: 65,
  },
  // ── Coffee tables ───────────────────────────────────────────────────────
  {
    id: "coffee-ontario",
    kind: "coffeeTable",
    name: "Ontario",
    url: `${SHOP}/table-basse-ontario/`,
    w: 1.2,
    d: 0.75,
    h: 0.45,
    materials: "Chêne huilé, contreplaqué laqué noir, pieds fer laqué noir, 2 tiroirs et 1 niche",
    price: 469,
  },
  {
    id: "coffee-norway",
    kind: "coffeeTable",
    name: "Norway",
    url: `${SHOP}/table-basse-norway/`,
    w: 1.2,
    d: 0.7,
    h: 0.45,
    materials: "Chêne massif huilé",
    price: 269,
  },
  {
    id: "coffee-dustin",
    kind: "coffeeTable",
    name: "Dustin",
    url: `${SHOP}/table-basse-dustin/`,
    w: 1.2,
    d: 0.7,
    h: 0.4,
    materials: "Métal, plateaux bois de bateau recyclé",
    price: 329,
  },
];

export function product(id: string): Product {
  const p = CATALOG.find((item) => item.id === id);
  if (!p) throw new Error(`unknown product ${id}`);
  return p;
}

export function productsOf(kind: ProductKind): Product[] {
  return CATALOG.filter((p) => p.kind === kind);
}

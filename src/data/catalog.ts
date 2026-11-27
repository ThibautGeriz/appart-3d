/**
 * Furniture catalog: real products, with the dimensions and prices from the
 * seller's product page (cocktail-scandinave.fr); 0 when the seller gives no price.
 * Only sizes that fit the séjour are listed (no 3 m tables). Each one ships as
 * models/<file>.glb, built from src/models/furniture/ at exactly this size.
 * Sizes in meters: w (width, local x), d (depth, local z, the front faces
 * +z), h (height).
 */

export type ProductKind =
  | "table"
  | "chair"
  | "coffeeTable"
  | "sofa"
  | "sideboard"
  | "tvUnit"
  | "bed"
  | "nightstand"
  | "shelf"
  | "wallBed"
  | "desk"
  | "officeChair";

/** Vertical wall bed (lit escamotable): folds down from its cabinet, head against the wall. */
export interface WallBedSpec {
  /** from the wall to the foot of the open bed */
  openDepth: number;
  /** a mattress comes with it (the model always shows one) */
  mattressIncluded: boolean;
  mattressThickness: number;
  /** cabinet and front (underside of the bed) finish */
  finish: "white" | "oak";
}

export interface FabricColor {
  name: string;
  hex: string;
}

/** An upholstery sold in several colours: the toolbar tints its material. */
export interface FabricSpec {
  /** material name in the model (tinted; the same name shares one colour) */
  material: string;
  /** the seller's colours, the first is the default */
  colors: FabricColor[];
  /** any colour can be picked too (the seller has hundreds) */
  custom?: boolean;
}

/** Roma: the shop has 200+ fabrics; a selection, and any can be picked. */
const ROMA_FABRIC: FabricSpec = {
  material: "roma fabric",
  custom: true,
  colors: [
    { name: "Moutarde", hex: "#c9971c" },
    { name: "Terracotta", hex: "#b4553a" },
    { name: "Vert sauge", hex: "#8a9a7b" },
    { name: "Bleu canard", hex: "#1f5f6b" },
    { name: "Bleu nuit", hex: "#233250" },
    { name: "Beige lin", hex: "#d8ccb6" },
    { name: "Gris perle", hex: "#b9b7b2" },
    { name: "Anthracite", hex: "#45464a" },
  ],
};

/**
 * Albatros: fabric "Castello" (cat. Super) from the showroom's UNIQUE fabric
 * card (photographed in store), the blue shown in the shop first; the card
 * has many more, so any colour can be picked.
 */
const ALBATROS_FABRIC: FabricSpec = {
  material: "albatros fabric",
  custom: true,
  colors: [
    { name: "Bleu profond", hex: "#3b5466" },
    { name: "Ivoire", hex: "#e4ded1" },
    { name: "Gris clair", hex: "#bcb7ad" },
    { name: "Taupe", hex: "#7b7166" },
    { name: "Rouge brique", hex: "#9e3a30" },
    { name: "Rouille", hex: "#b2532b" },
    { name: "Moutarde", hex: "#d6a321" },
    { name: "Kaki", hex: "#4f5444" },
    { name: "Bleu nuit", hex: "#29314a" },
    { name: "Vieux rose", hex: "#a58b86" },
    { name: "Corail", hex: "#c8755b" },
    { name: "Anthracite", hex: "#3d3d40" },
  ],
};

/** Olivia: the four colours of the shop's swatches (photographed in store). */
const OLIVIA_FABRIC: FabricSpec = {
  material: "olivia fabric",
  colors: [
    { name: "Terracotta", hex: "#b65c43" },
    { name: "Moutarde", hex: "#c99322" },
    { name: "Anthracite", hex: "#5b5d62" },
    { name: "Beige clair", hex: "#d9d3c7" },
  ],
};

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
  /** sofas: depth of one section (a corner sofa is deeper overall) */
  sofa?: { depth: number };
  /**
   * footprint as several rectangles [x0, z0, x1, z1] in the model's frame
   * (origin at its centre), when it is not a plain rectangle (corner sofa)
   */
  parts?: [number, number, number, number][];
  /** upholstery colours to choose from */
  fabric?: FabricSpec;
  /** wall beds: how it opens */
  wallBed?: WallBedSpec;
  /**
   * country of manufacture, as the seller states it; undefined when the
   * seller publishes none (shown as "non communiqué")
   */
  madeIn?: string;
  /** seat foam density in kg/m³ (the soft part you sit on), from the product sheet */
  seatFoamDensity?: number;
  /** already owned (kept as is, not switchable, nothing to pay) */
  owned?: boolean;
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
  {
    id: "chair-olivia",
    kind: "chair",
    name: "Olivia",
    url: "https://www.monsieur-meuble.com/771-chaise-olivia.html",
    w: 0.53,
    d: 0.63,
    h: 0.91,
    seatHeight: 0.47, // not given by the seller: measured on the photos
    fabric: OLIVIA_FABRIC,
    materials:
      "Tissu texturé 90 % polyester / 10 % nylon (25 000 Martindale), mousse 25 kg/m³, piètement fer époxy gris anthracite",
    seatFoamDensity: 25,
    price: 135, // 170 € before the November offer (until 30/11/2026)
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
  // ── Sideboards ──────────────────────────────────────────────────────────
  {
    id: "sideboard-norway",
    kind: "sideboard",
    name: "Norway",
    url: `${SHOP}/bahut-norway-2/`,
    w: 1.5,
    d: 0.5,
    h: 0.88,
    materials: "Chêne massif huilé, 3 portes, 3 tiroirs, poignées métal",
    price: 795,
  },
  {
    id: "sideboard-biwa",
    kind: "sideboard",
    name: "Biwa",
    url: `${SHOP}/bahut-biwa-2-portes-3-tiroirs/`,
    w: 1.6,
    d: 0.48,
    h: 0.85,
    materials: "Pin recyclé, 2 portes, 3 tiroirs, 2 étagères",
    price: 489,
  },
  // ── TV units ────────────────────────────────────────────────────────────
  {
    id: "tv-norway",
    kind: "tvUnit",
    name: "Norway",
    url: `${SHOP}/meuble-tv-norway-grand/`,
    w: 1.5,
    d: 0.5,
    h: 0.6,
    materials: "Chêne massif huilé, 3 tiroirs, 1 niche, poignées métal",
    price: 549,
  },
  {
    id: "tv-biwa",
    kind: "tvUnit",
    name: "Biwa",
    url: `${SHOP}/meuble-tv-biwa/`,
    w: 1.5,
    d: 0.39,
    h: 0.67,
    materials: "Pin recyclé, 2 portes, 2 niches, 1 tiroir",
    price: 359,
  },
  // ── Beds (160 × 200; overall size of the frame) ─────────────────────────
  {
    id: "bed-lunja",
    kind: "bed",
    name: "Lunja",
    url: "https://www.laredoute.fr/ppdp/prod-529091052.aspx",
    w: 1.7,
    d: 2.09,
    h: 0.8,
    materials: "Pin massif brossé, bois foncé (La Redoute Intérieurs)",
    price: 0, // la page n'affiche pas le prix du 160 × 200 (« à partir de 386,52 € »)
  },
  {
    id: "bed-janis",
    kind: "bed",
    name: "Janis",
    url: `${SHOP}/lit-a-tiroirs-janis/`,
    w: 1.66,
    d: 2.07,
    h: 0.91,
    materials: "Pin massif miel huilé, 3 tiroirs sur roulettes, 2 niches",
    price: 398,
  },
  {
    id: "bed-petra",
    kind: "bed",
    name: "Petra",
    url: `${SHOP}/lit-pin-massif-2-places-petra/`,
    w: 1.82,
    d: 2.18,
    h: 0.84,
    materials: "Pin massif ciré",
    price: 525,
  },
  {
    id: "bed-poutre",
    kind: "bed",
    name: "Poutre",
    url: `${SHOP}/lit-poutre/`,
    w: 1.96,
    d: 2.36,
    h: 0.63,
    materials: "Pin massif ciré et pin recyclé",
    price: 675,
  },
  // ── Bedside tables ──────────────────────────────────────────────────────
  {
    id: "nightstand-lundby",
    kind: "nightstand",
    name: "Lundby",
    url: `${SHOP}/chevet-lundby-en-frene/`,
    w: 0.4,
    d: 0.35,
    h: 0.45,
    materials: "Frêne, 1 niche",
    price: 85,
  },
  {
    id: "nightstand-oregon",
    kind: "nightstand",
    name: "Oregon",
    url: `${SHOP}/chevet-oregon/`,
    w: 0.4,
    d: 0.35,
    h: 0.42,
    materials: "Frêne massif brossé, tiroir à incrustation de troncs, pieds métal noir",
    price: 179,
  },
  // ── Shelves ─────────────────────────────────────────────────────────────
  {
    id: "shelf-borneo",
    kind: "shelf",
    name: "Borneo",
    url: `${SHOP}/etagere-teck-recycle-borneo/`,
    w: 1.0,
    d: 0.305,
    h: 2.0,
    materials: "Teck recyclé",
    price: 489,
  },
  {
    id: "shelf-fina",
    kind: "shelf",
    name: "Fina",
    url: `${SHOP}/etagere-teck-recycle-fina/`,
    w: 1.41,
    d: 0.33,
    h: 2.2,
    materials: "Teck recyclé",
    price: 590,
  },
  {
    id: "shelf-seatle",
    kind: "shelf",
    name: "Seatle",
    url: `${SHOP}/etagere-pin-recycle-seatle/`,
    w: 1.595,
    d: 0.32,
    h: 1.81,
    materials: "Pin recyclé, 5 étagères, structure métal noir",
    price: 395,
  },
  // ── Sofas (Mobilier de France ROMA, 3D mesh fabric, 104 cm seat depth) ──
  {
    id: "sofa-roma-corner",
    kind: "sofa",
    name: "Roma d'angle 312 × 197",
    url: "https://www.mobilierdefrance.com/canapes-droits/canape-roma",
    w: 3.12,
    d: 1.97,
    h: 1.02,
    seatHeight: 0.44,
    sofa: { depth: 1.04 },
    fabric: ROMA_FABRIC,
    // long side along the back, return on the left coming forward
    parts: [
      [-1.56, -0.985, 1.56, 0.055],
      [-1.56, 0.055, -0.52, 0.985],
    ],
    materials:
      "Tissu maillage 3D, dossiers avance-recule, accoudoirs relevables, pieds fer titanio",
    // product page: "Fabrication Italienne"; "Garnissage assise et accoudoirs
    // en mousse polyuréthane densité 30 kg/m3"
    madeIn: "Italie",
    seatFoamDensity: 30,
    price: 6780,
  },
  {
    id: "sofa-roma-210",
    kind: "sofa",
    name: "Roma 210",
    url: "https://www.mobilierdefrance.com/canapes-droits/canape-roma",
    w: 2.1,
    d: 1.04,
    h: 1.02,
    seatHeight: 0.44,
    sofa: { depth: 1.04 },
    fabric: ROMA_FABRIC,
    materials:
      "Tissu maillage 3D, dossiers avance-recule, accoudoirs relevables, pieds fer titanio",
    // product page: "Fabrication Italienne"; "Garnissage assise et accoudoirs
    // en mousse polyuréthane densité 30 kg/m3"
    madeIn: "Italie",
    seatFoamDensity: 30,
    price: 3386.46,
  },
  {
    // Cuir Center ALBATROS (CS-578), element 350 "Canapé 3 places Maxi,
    // assises double profondeur", from the showroom price tag. Origin: not on
    // the tag nor the product page (Cuir Center makes some models in Europe,
    // some in China).
    id: "sofa-albatros-222",
    kind: "sofa",
    name: "Albatros 222",
    url: "https://www.cuircenter.com/produit/albatros-canape-3-places---assises-double-profondeur/A10017541.html",
    w: 2.22,
    d: 1.12,
    h: 0.95,
    seatHeight: 0.45,
    sofa: { depth: 1.12 },
    materials:
      "Tissu Castello (cat. Super), assises double profondeur, dossiers avance-recule (prof. maxi 125 cm), accoudoirs relevables, assise mousse polyuréthane 30 kg/m³, dossiers fibre polyester siliconée, structure sapin massif et panneaux de particules, sangles élastiques, pieds métal titanium dark 15 cm",
    seatFoamDensity: 30,
    fabric: ALBATROS_FABRIC,
    price: 3115,
  },
  // ── Wall beds for chambre 2 (140 × 200, vertical opening) ───────────────
  // the wall zone is 155 cm wide and the plan allows 228 cm open
  {
    id: "bed-beganio",
    kind: "wallBed",
    name: "Beganio (blanc, matelas)",
    url: "https://www.vente-unique.com/p/beganio-lit-escamotable-140-x-200-cm-ouverture-verticale-manuelle-blanc-matelas-beganio",
    w: 1.59,
    d: 0.4,
    h: 2.25,
    wallBed: { openDepth: 2.392, mattressIncluded: true, mattressThickness: 0.2, finish: "white" },
    materials:
      "Panneaux de particules mélaminés blanc, piétement métal, 40 lattes, ouverture manuelle, matelas ressorts ensachés 20 cm inclus",
    madeIn: "Europe",
    price: 1179.99,
  },
  {
    id: "bed-consus",
    kind: "wallBed",
    name: "Lenart Consus (chêne)",
    url: "https://www.vente-unique.com/p/lenart-armoire-lit-escamotable-vertical-140x200-cm-chene-artisan-lit-rabattable-lit-mural-consus",
    w: 1.51,
    d: 0.46,
    h: 2.17,
    wallBed: {
      openDepth: 2.28,
      mattressIncluded: false,
      mattressThickness: 0.18,
      finish: "oak",
    },
    materials:
      "Panneaux décor chêne artisan, vérins pneumatiques soft close, push to open, matelas non inclus (18 cm max)",
    madeIn: "Europe",
    price: 1578.9,
  },
  {
    id: "bed-altera-premium",
    kind: "wallBed",
    name: "Altera Premium (blanc mat)",
    url: "https://alteramobilier.fr/140x200-cm/25-lit-escamotable-relevable-vertical-140x200-cm-blanc-mat-premium.html",
    w: 1.53,
    d: 0.41,
    h: 2.22,
    wallBed: {
      openDepth: 2.34,
      mattressIncluded: false,
      mattressThickness: 0.2,
      finish: "white",
    },
    materials:
      "Panneaux blanc mat, ressorts (8 par côté), fabriqué sur commande, matelas non inclus (20 cm max)",
    price: 899,
  },
  // ── Bookcases for chambre 2 (zone 150 × 30 cm); prices of 27/11/2026,
  // Black Friday promotions for the Vente-unique and AM.PM ones ───────────
  {
    id: "bookcase-vu-white",
    kind: "shelf",
    name: "Étagère 5 niveaux (blanc)",
    url: "https://www.vente-unique.com/p/bibliotheque-etagere-multifonction-blanc-5-niveaux-150x30x189cm-pour-livres-jouets-et-accessoires-de-bureau",
    w: 1.5,
    d: 0.304,
    h: 1.894,
    materials:
      "Stratifié / MDF blanc mat, chants ABS, dos HDF blanc, 3 colonnes (70 + 40 + 40 cm), 5 niveaux de 33 cm",
    madeIn: "Europe",
    price: 324.9,
  },
  {
    id: "bookcase-vu-wotan",
    kind: "shelf",
    name: "Étagère 5 niveaux (chêne Wotan)",
    url: "https://www.vente-unique.com/p/bibliotheque-etagere-multifonction-chene-wotan-5-niveaux-150x30x189cm-pour-livres-jouets-et-accessoires-de-bureau",
    w: 1.5,
    d: 0.304,
    h: 1.894,
    materials:
      "Stratifié décor chêne Wotan, dos HDF blanc, 3 colonnes (70 + 40 + 40 cm), 5 niveaux de 33 cm",
    madeIn: "Europe",
    price: 324.9,
  },
  {
    id: "bookcase-iloss",
    kind: "shelf",
    name: "AM.PM Iloss (chêne massif)",
    url: "https://www.laredoute.fr/ppdp/prod-601762191.aspx",
    w: 1.5,
    d: 0.33,
    h: 2.0,
    materials: "Chêne massif, vernis polyuréthane incolore, 5 tablettes fixes",
    price: 1190.63, // + 99 € delivery to the room
  },
  // ── Office chair (in front of the desk) ─────────────────────────────────
  {
    id: "office-aeron",
    kind: "officeChair",
    name: "Herman Miller Aeron (taille B, graphite)",
    url: "https://frstore.hermanmiller.com/products/aeron-office-chair",
    // official spec sheet, size B: W 719–772, D 698–719, H 933–1045 mm
    w: 0.72,
    d: 0.7,
    h: 0.98,
    seatHeight: 0.45,
    materials:
      "Assise et dossier maille 8Z Pellicle, cadre et piétement graphite, accoudoirs réglables, roulettes",
    price: 1599, // official French store, 25 % off 2 132 € (27/11/2026)
  },
  // ── Desk (already owned, kept as is) ────────────────────────────────────
  {
    id: "desk-flexispot-solid-wood",
    kind: "desk",
    name: "Flexispot assis-debout, plateau bois massif",
    url: "https://www.flexispot.fr/bureau-assis-debout-avec-plateau-en-bois-massif.html",
    w: 1.2,
    d: 0.6,
    h: 0.74, // sitting height; the frame goes up for standing
    materials: "Plateau bois massif, cadre électrique réglable en hauteur",
    owned: true,
    madeIn: "Union européenne (plateau)",
    price: 0, // already bought
  },
];

export function product(id: string): Product {
  const p = CATALOG.find((item) => item.id === id);
  if (!p) throw new Error(`unknown product ${id}`);
  return p;
}

/** "chaise", "table basse"… (lower case, for lists). Pure. */
export function kindLabel(kind: ProductKind): string {
  return {
    table: "table",
    chair: "chaise",
    coffeeTable: "table basse",
    sofa: "canapé",
    sideboard: "bahut",
    tvUnit: "meuble TV",
    bed: "lit",
    nightstand: "chevet",
    shelf: "étagère",
    wallBed: "lit escamotable",
    desk: "bureau",
    officeChair: "fauteuil de bureau",
  }[kind];
}

export function productsOf(kind: ProductKind): Product[] {
  return CATALOG.filter((p) => p.kind === kind);
}

/**
 * What the sellers' pages say about each catalog product beyond its size and
 * price (src/data/catalog.ts): its key characteristics
 * (fabric abrasion, weight, load, warranty…) and the pages it comes from.
 * Only what a page states: null when it does not say. Shown on catalog.html.
 * The country of manufacture and the seat foam density are on the product
 * itself (madeIn, seatFoamDensity in catalog.ts).
 */

export interface Spec {
  label: string;
  value: string;
}

export interface Source {
  label: string;
  url: string;
}

export interface ProductDetails {
  /** the shop selling it */
  seller: string;
  /** manufacturer, when not the shop */
  brand: string | null;
  weightKg: number | null;
  /** load it takes (seat, bed base, per shelf: see specs) */
  maxLoadKg: number | null;
  warrantyYears: number | null;
  /** "à monter", "livré monté"… */
  assembly: string | null;
  /** fabric abrasion resistance (Martindale cycles) */
  martindale: number | null;
  /** the page's key characteristics, in its words */
  specs: Spec[];
  /** every page used */
  sources: Source[];
  /** where the page disagrees with the catalog (price changed…) */
  notes: string | null;
}

/** Read from the pages on 27/11/2026 (Black Friday week: some prices are offers). */
export const DETAILS: Record<string, ProductDetails> = {
  "sofa-albatros-222": {
    seller: "Cuir Center",
    brand: null,
    weightKg: null,
    maxLoadKg: null,
    warrantyYears: 5,
    assembly: null,
    martindale: null,
    specs: [
      { label: "Élément", value: "350, canapé 3 places Maxi, assises double profondeur (CS-578)" },
      {
        label: "Revêtement",
        value: "Tissu Castello (catégorie Super), coloris Deep Blue en magasin",
      },
      { label: "Assise", value: "Mousse polyuréthane 30 kg/m³" },
      {
        label: "Dossiers",
        value: "Fibre polyester siliconée ; avance-recule (profondeur maxi 125 cm)",
      },
      { label: "Accoudoirs", value: "Relevables (« accoudoirs déployables »)" },
      { label: "Structure", value: "Sapin massif et panneaux de particules ; sangles élastiques" },
      { label: "Pieds", value: "Métal titanium dark, 15 cm" },
      { label: "Garantie", value: "5 ans structure, 2 ans revêtement (garantie générale du site)" },
      { label: "Livraison", value: "Délai estimé 8 à 10 semaines" },
    ],
    sources: [
      {
        label: "Cuir Center – Albatros, canapé 3 places assises double profondeur",
        url: "https://www.cuircenter.com/produit/albatros-canape-3-places---assises-double-profondeur/A10017541.html",
      },
    ],
    notes:
      "La page en ligne ne donne ni prix, ni mousses, ni structure : prix (3 115 €), mousse, structure et pieds viennent de l'étiquette du magasin (photos). Pays de fabrication non communiqué par Cuir Center.",
  },
  "table-valmo-180": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 60,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter (pieds à fixer)",
    martindale: null,
    specs: [
      {
        label: "Plateau",
        value: "teck recyclé",
      },
      {
        label: "Pieds (à fixer)",
        value: "métal noir à monter",
      },
      {
        label: "Matière",
        value: "Bois, Métal",
      },
      {
        label: "Bois",
        value: "Teck",
      },
      {
        label: "Taille",
        value: "L 180 x H 76 x P 90 cm",
      },
      {
        label: "Allonge",
        value: "L 90 x H 4 x P 50 cm, vendue séparément (119 €)",
      },
      {
        label: "Référence",
        value: "DOMAVATA1800",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Table VALMO (variante L 180 cm)",
        url: "https://cocktail-scandinave.fr/table-valmo/",
      },
    ],
    notes:
      "Taille, prix et poids viennent des données de la variante L 180 cm (le tableau général indique « ND »). La description parle aussi de « MDF chêne teinté noir », ce qui contredit « teck recyclé ».",
  },
  "table-valmo-220": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 67,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter (pieds à fixer)",
    martindale: null,
    specs: [
      {
        label: "Plateau",
        value: "teck recyclé",
      },
      {
        label: "Pieds (à fixer)",
        value: "métal noir à monter",
      },
      {
        label: "Matière",
        value: "Bois, Métal",
      },
      {
        label: "Bois",
        value: "Teck",
      },
      {
        label: "Taille",
        value: "L 220 x H 76 x P 90 cm",
      },
      {
        label: "Allonge",
        value: "L 90 x H 4 x P 50 cm, vendue séparément (119 €)",
      },
      {
        label: "Référence",
        value: "DOMAVATA2200",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Table VALMO (variante L 220 cm)",
        url: "https://cocktail-scandinave.fr/table-valmo/",
      },
    ],
    notes:
      "Taille, prix et poids viennent des données de la variante L 220 cm. La description mentionne du « MDF chêne teinté noir ».",
  },
  "table-raia-220": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 112,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter",
    martindale: null,
    specs: [
      {
        label: "Plateau",
        value: "bois de Suar massif huilé en 2 parties",
      },
      {
        label: "Piétement",
        value: "métal laqué noir (pieds-tréteaux)",
      },
      {
        label: "Matière",
        value: "Bois, Métal",
      },
      {
        label: "Bois",
        value: "Suar",
      },
      {
        label: "Fabrication artisanale",
        value: "chaque meuble est unique, les dimensions et couleurs peuvent légèrement varier",
      },
      {
        label: "Taille",
        value: "L 220 x H 76 x P 106 cm",
      },
      {
        label: "Référence",
        value: "DOYURATA220",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Table RAIA (variante L 220 cm)",
        url: "https://cocktail-scandinave.fr/table-raia/",
      },
    ],
    notes:
      "Taille et poids viennent des données de la variante L 220 cm. Prix 795 € écotaxe 19,5 € incluse. Une option L 300 cm existe aussi.",
  },
  "table-willow-220": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 94,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter",
    martindale: null,
    specs: [
      {
        label: "Plateau",
        value: "teck massif (recyclé selon la description)",
      },
      {
        label: "Piètement",
        value: "croix en métal noir",
      },
      {
        label: "Matière",
        value: "Bois, Métal",
      },
      {
        label: "Fabrication artisanale",
        value: "Les dimensions peuvent légèrement varier de 10%",
      },
      {
        label: "Taille",
        value: "L 220 x H 79 x P 100 cm",
      },
      {
        label: "Référence",
        value: "DOAHWILPL121",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Table WILLOW (variante L 220 cm)",
        url: "https://cocktail-scandinave.fr/table-willow/",
      },
    ],
    notes:
      "Taille et poids viennent des données de la variante L 220 cm. Variante L 300 cm : 895 €, 134 kg, H 78 cm.",
  },
  "chair-bistrot": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 5,
    maxLoadKg: 100,
    warrantyYears: null,
    assembly: "monté",
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "fer vieilli",
      },
      {
        label: "Assise",
        value: "orme recyclé",
      },
      {
        label: "Dossier",
        value: "fer vieilli et orme recyclé",
      },
      {
        label: "Bois",
        value: "Orme",
      },
      {
        label: "Fabrication artisanale",
        value: "Les dimensions peuvent légèrement varier",
      },
      {
        label: "Poids max",
        value: "Supporte poids maxi 100kg",
      },
      {
        label: "Référence",
        value: "NIEACH5",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Chaise bistrot assise bois recyclé",
        url: "https://cocktail-scandinave.fr/chaise-bistrot-assise-bois-recycle/",
      },
    ],
    notes: "Le tableau indique « Bois, Rotin » mais la description ne mentionne pas de rotin.",
  },
  "chair-norway": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 10,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: null,
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "chêne massif",
      },
      {
        label: "Finition",
        value: "huilé",
      },
      {
        label: "Assise",
        value: "tissu microfibre",
      },
      {
        label: "Matière",
        value: "Bois, Tissu",
      },
      {
        label: "Bois",
        value: "Chêne",
      },
      {
        label: "Référence",
        value: "MXLODCHA2",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Chaise NORWAY",
        url: "https://cocktail-scandinave.fr/chaise-norway/",
      },
    ],
    notes:
      "Hauteur d'assise affichée « – cm » (non renseignée) : 48 cm dans le catalogue, valeur standard.",
  },
  "chair-westmount": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 6,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: null,
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "fer vieilli",
      },
      {
        label: "Assise",
        value: "sapin massif",
      },
      {
        label: "Dossier",
        value: "sapin massif",
      },
      {
        label: "Pieds",
        value: "fer vieilli",
      },
      {
        label: "Matière",
        value: "Bois, Métal",
      },
      {
        label: "Bois",
        value: "Sapin",
      },
      {
        label: "Coloris",
        value: "Marron, Noir",
      },
      {
        label: "Référence",
        value: "NISNWECH64",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Chaise WESTMOUNT",
        url: "https://cocktail-scandinave.fr/chaise-westmount/",
      },
    ],
    notes: null,
  },
  "chair-mackay": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 6,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter",
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "fer, finition vieillie",
      },
      {
        label: "Assise",
        value: "orme massif",
      },
      {
        label: "Coloris",
        value: "noir",
      },
      {
        label: "Style",
        value: "Inspirée de l'esthétique industrielle des années 50",
      },
      {
        label: "Référence",
        value: "NIYOCHNO6",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Chaise MACKAY",
        url: "https://cocktail-scandinave.fr/chaise-mackay/",
      },
    ],
    notes: "Hauteur d'assise non indiquée : 46 cm dans le catalogue, mesurée sur la photo.",
  },
  "coffee-ontario": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 58,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "pieds à fixer",
    martindale: null,
    specs: [
      {
        label: "Plateau",
        value: "chêne huilé avec déco centrale en contreplaqué laqué noir",
      },
      {
        label: "Côtés et dos",
        value: "contreplaqué laqué noir",
      },
      {
        label: "Façades tiroirs",
        value: "chêne huilé",
      },
      {
        label: "Pieds (à fixer)",
        value: "fer laqué noir",
      },
      {
        label: "Rangements",
        value: "2 tiroirs et 1 niche",
      },
      {
        label: "Bois",
        value: "Chêne",
      },
      {
        label: "Référence",
        value: "NIBAIOTABA55",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Table basse ONTARIO",
        url: "https://cocktail-scandinave.fr/table-basse-ontario/",
      },
    ],
    notes: null,
  },
  "coffee-norway": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 31,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter",
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "chêne et contreplaqué",
      },
      {
        label: "Piètement",
        value: "chêne massif sur structure pin",
      },
      {
        label: "Finition",
        value: "huilé (couleur miel)",
      },
      {
        label: "Forme",
        value: "Rectangle",
      },
      {
        label: "Bois",
        value: "Chêne",
      },
      {
        label: "Référence",
        value: "MXLODTAB2",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Table basse NORWAY",
        url: "https://cocktail-scandinave.fr/table-basse-norway/",
      },
    ],
    notes: null,
  },
  "coffee-dustin": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 38,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: null,
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "métal",
      },
      {
        label: "Plateau",
        value: "bois de bateau recyclé",
      },
      {
        label: "Matière",
        value: "Bois, Métal",
      },
      {
        label: "Bois",
        value: "Bois de bateau recyclé",
      },
      {
        label: "Référence",
        value: "DOKKTABA11",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Table basse DUSTIN",
        url: "https://cocktail-scandinave.fr/table-basse-dustin/",
      },
    ],
    notes:
      "Le tableau de caractéristiques indique par erreur « Largeur 70 cm » ; le résumé et la ligne Dimensions donnent bien 120 cm.",
  },
  "sideboard-norway": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 91,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: null,
    martindale: null,
    specs: [
      {
        label: "Structure et portes",
        value: "chêne massif huilé",
      },
      {
        label: "Fonds",
        value: "contreplaqué chêne et eucalyptus",
      },
      {
        label: "Plateau",
        value: "fibres de bois plaqué chêne",
      },
      {
        label: "Piètement",
        value: "chêne massif sur structure pin",
      },
      {
        label: "Poignées",
        value: "métal",
      },
      {
        label: "Portes",
        value: "3",
      },
      {
        label: "Tiroirs",
        value: "3 sur rails métal",
      },
      {
        label: "Finition",
        value: "huilé",
      },
      {
        label: "Référence",
        value: "MXLODBAH33",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Bahut NORWAY 3 portes",
        url: "https://cocktail-scandinave.fr/bahut-norway-2/",
      },
    ],
    notes: null,
  },
  "sideboard-biwa": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 63,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter (pieds à fixer)",
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "pin recyclé",
      },
      {
        label: "Façades",
        value: "en damier ajourées",
      },
      {
        label: "Portes",
        value: "2",
      },
      {
        label: "Tiroirs",
        value: "3",
      },
      {
        label: "Étagères",
        value: "2 étagères intérieures",
      },
      {
        label: "Bois",
        value: "Pin",
      },
      {
        label: "Référence",
        value: "NIDABIBAH63",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Bahut BIWA 2 portes 3 tiroirs",
        url: "https://cocktail-scandinave.fr/bahut-biwa-2-portes-3-tiroirs/",
      },
    ],
    notes: null,
  },
  "tv-norway": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 58,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: null,
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "chêne et contreplaqué",
      },
      {
        label: "Piètement",
        value: "chêne massif sur structure pin",
      },
      {
        label: "Poignées",
        value: "métal",
      },
      {
        label: "Finition",
        value: "huilé (couleur miel)",
      },
      {
        label: "Tiroirs",
        value: "3 sur rails métal",
      },
      {
        label: "Niche",
        value: "1",
      },
      {
        label: "Bois",
        value: "Chêne",
      },
      {
        label: "Référence",
        value: "MXLODTV2",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Meuble TV NORWAY 3 tiroirs",
        url: "https://cocktail-scandinave.fr/meuble-tv-norway-grand/",
      },
    ],
    notes: null,
  },
  "tv-biwa": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 43,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter (pieds à fixer)",
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "pin recyclé",
      },
      {
        label: "Façades",
        value: "en damier ajourées",
      },
      {
        label: "Portes",
        value: "2",
      },
      {
        label: "Niches",
        value: "2",
      },
      {
        label: "Tiroir",
        value: "1",
      },
      {
        label: "Bois",
        value: "Pin",
      },
      {
        label: "Référence",
        value: "NIDABITV67",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Meuble TV BIWA",
        url: "https://cocktail-scandinave.fr/meuble-tv-biwa/",
      },
    ],
    notes: null,
  },
  "bed-lunja": {
    seller: "La Redoute",
    brand: "La Redoute Intérieurs",
    weightKg: null,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter (vendu prêt à monter, plan de montage PDF)",
    martindale: null,
    specs: [
      {
        label: "Matière",
        value: "Pin massif brossé, vernis acrylique",
      },
      {
        label: "Finition",
        value: "Style rustique",
      },
      {
        label: "Coloris",
        value: "Bois foncé",
      },
      {
        label: "Pieds",
        value: "Grosses sections de pieds pour une meilleure solidité et durée dans le temps",
      },
      {
        label: "Couchages",
        value: "140x190, 160x200, 180x200 cm",
      },
      {
        label: "Dimensions (160x200)",
        value: "L170 x H80 x P209 cm",
      },
      {
        label: "Sommier",
        value: "Sommier vendu séparément",
      },
      {
        label: "Colis (160x200)",
        value: "2 colis : 30,5 kg + 16 kg",
      },
      {
        label: "Fabrication",
        value: "Fabriqué à la demande",
      },
      {
        label: "Recyclage",
        value: "Produit totalement recyclable",
      },
    ],
    sources: [
      {
        label: "La Redoute – Lit en pin massif brossé, Lunja",
        url: "https://www.laredoute.fr/ppdp/prod-529091052.aspx",
      },
    ],
    notes:
      "Prix actuel « dès 386,52 € » (−30 % Black Friday, 549 € d'ordinaire), éco-part 7,40 € incluse ; ce « dès » vaut peut-être pour le 140×190. Notre taille 1,70 × 2,09 × 0,80 m est celle du 160×200. Poids du lit non indiqué, seulement les colis.",
  },
  "bed-janis": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: null,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter",
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "Pin massif",
      },
      {
        label: "Finition",
        value: "Miel huilé",
      },
      {
        label: "Rangements",
        value: "3 de rangement sur roulettes",
      },
      {
        label: "Niches",
        value: "2 avec étagère",
      },
      {
        label: "Chevets",
        value: "2 à roulettes mobiles",
      },
      {
        label: "Couchages",
        value: "140 x 200 cm, 160 x 200 cm",
      },
      {
        label: "Sommier / matelas",
        value: "Sommier et matelas vendus séparément",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Lit à tiroirs JANIS",
        url: "https://cocktail-scandinave.fr/lit-a-tiroirs-janis/",
      },
    ],
    notes:
      "La page n'affiche que « à partir de 369,00 € » (éco-taxe 7 € incluse), sans prix par taille : nos 398 € ne peuvent pas être vérifiés. Dimensions et poids « ND » sur la page.",
  },
  "bed-petra": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: null,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter",
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "Pin massif ciré",
      },
      {
        label: "Bois",
        value: "Pin",
      },
      {
        label: "Couchages",
        value: "140 x 200 cm, 160 x 200 cm, 180 x 200 cm",
      },
      {
        label: "Sommier / matelas",
        value: "Matelas et sommier vendus séparément",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Lit pin massif 2 places PETRA",
        url: "https://cocktail-scandinave.fr/lit-pin-massif-2-places-petra/",
      },
    ],
    notes:
      "La page n'affiche que « à partir de 489,00 € » (éco-taxe 23,88 € incluse), sans prix par taille : nos 525 € ne peuvent pas être vérifiés. Dimensions et poids « ND » sur la page.",
  },
  "bed-poutre": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: null,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter",
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "Pin massif ciré et pin recyclé",
      },
      {
        label: "Piétement",
        value: "Pin massif ciré et pin recyclé",
      },
      {
        label: "Bois",
        value: "Pin",
      },
      {
        label: "Fabrication",
        value: "Fabrication artisanale, les dimensions peuvent légèrement varier",
      },
      {
        label: "Couchages",
        value: "140 x 200 cm, 160 x 200 cm, 180 x 200 cm",
      },
      {
        label: "Sommier / matelas",
        value: "Matelas et sommier vendus séparément",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Lit POUTRE",
        url: "https://cocktail-scandinave.fr/lit-poutre/",
      },
    ],
    notes:
      "La page n'affiche que « à partir de 589,00 € » (éco-taxe 27,3 € incluse), sans prix par taille : nos 675 € ne peuvent pas être vérifiés. Dimensions et poids « ND » sur la page.",
  },
  "nightstand-lundby": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 5,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: null,
    martindale: null,
    specs: [
      {
        label: "Bois",
        value: "Frêne",
      },
      {
        label: "Niche",
        value: "1",
      },
      {
        label: "Dimensions",
        value: "L 40 x H 45 x P 35 cm",
      },
      {
        label: "Collection",
        value: "Ensemble Lundby",
      },
      {
        label: "Référence",
        value: "KSPCH1FR",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Chevet frêne LUNDBY",
        url: "https://cocktail-scandinave.fr/chevet-lundby-en-frene/",
      },
    ],
    notes: null,
  },
  "nightstand-oregon": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 10,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: null,
    martindale: null,
    specs: [
      {
        label: "Bois",
        value: "Frêne massif brossé",
      },
      {
        label: "Tiroir",
        value: "1, façade avec incrustation de troncs (carrés en bois debout)",
      },
      {
        label: "Pieds",
        value: "Métal noir, fuselés d'influence scandinave",
      },
      {
        label: "Dimensions",
        value: "L 40 x H 42 x P 35 cm",
      },
      {
        label: "Collection",
        value: "Mobilier OREGON avec incrustation de troncs",
      },
      {
        label: "Référence",
        value: "KORCH1",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Chevet OREGON",
        url: "https://cocktail-scandinave.fr/chevet-oregon/",
      },
    ],
    notes: null,
  },
  "shelf-borneo": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 85,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "monté",
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "Teck recyclé",
      },
      {
        label: "Bois",
        value: "Teck",
      },
      {
        label: "Design",
        value: "Lignes arrondies",
      },
      {
        label: "Dimensions",
        value: "L 100 x H 200 x P 30,5 cm",
      },
      {
        label: "Collection",
        value: "Mobilier BORNEO en teck recyclé",
      },
      {
        label: "Référence",
        value: "DORABOETA28",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Etagère teck recyclé BORNEO",
        url: "https://cocktail-scandinave.fr/etagere-teck-recycle-borneo/",
      },
    ],
    notes: null,
  },
  "shelf-fina": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 96,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: null,
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "Teck recyclé",
      },
      {
        label: "Bois",
        value: "Teck",
      },
      {
        label: "Dimensions",
        value: "L 141 x H 220 x P 33 cm",
      },
      {
        label: "Référence",
        value: "DORAETA8",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Etagère teck recyclé FINA",
        url: "https://cocktail-scandinave.fr/etagere-teck-recycle-fina/",
      },
    ],
    notes: null,
  },
  "shelf-seatle": {
    seller: "Cocktail Scandinave",
    brand: null,
    weightKg: 40,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter",
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "Pin recyclé",
      },
      {
        label: "Bois",
        value: "Pin",
      },
      {
        label: "Etagères",
        value: "5",
      },
      {
        label: "Style",
        value: "Design nordique, 5 niveaux",
      },
      {
        label: "Dimensions",
        value: "L 159,5 x H 181 x P 32 cm",
      },
      {
        label: "Référence",
        value: "NIDAETA69",
      },
    ],
    sources: [
      {
        label: "Cocktail Scandinave – Etagère pin recyclé SEATLE",
        url: "https://cocktail-scandinave.fr/etagere-pin-recycle-seatle/",
      },
    ],
    notes: null,
  },
  "bookcase-iloss": {
    seller: "La Redoute",
    brand: "AM.PM",
    weightKg: null,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "à monter",
    martindale: null,
    specs: [
      {
        label: "Matière",
        value: "Chêne massif",
      },
      {
        label: "Finition",
        value: "Vernis polyuréthane incolore",
      },
      {
        label: "Montants",
        value: "Travaillés en finition ailes d'avion",
      },
      {
        label: "Etagères",
        value: "5 étagères fixes chanfreinées, extrémités coupées droit",
      },
      {
        label: "Coloris",
        value: "Chêne Naturel",
      },
      {
        label: "Dimensions",
        value: "L 150 x H 200 x P 33 cm",
      },
      {
        label: "Fixation murale",
        value: "Trous pour fixation murale (vis et chevilles non fournies)",
      },
      {
        label: "Colis",
        value: "2 colis : 42,5 kg + 37 kg",
      },
      {
        label: "Fabrication",
        value: "Fabriqué à la demande",
      },
    ],
    sources: [
      {
        label: "La Redoute – Bibliothèque en chêne massif, Iloss (AM.PM)",
        url: "https://www.laredoute.fr/ppdp/prod-601762191.aspx",
      },
    ],
    notes:
      "1 190,63 € est un prix Black Friday temporaire (−15 %) ; 1 400 € d'ordinaire, éco-part 4,20 € incluse. Poids non indiqué, seulement les colis (79,5 kg au total).",
  },
  "chair-olivia": {
    seller: "Monsieur Meuble",
    brand: null,
    weightKg: 7,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: "livrée démontée (à monter), emballée par 2",
    martindale: 25000,
    specs: [
      {
        label: "Assise et dossier",
        value: "Tissu, 4 couleurs disponibles",
      },
      {
        label: "Composition tissu",
        value: "90 % polyester / 10 % nylon",
      },
      {
        label: "Résistance à l'abrasion",
        value: "Martindale 25 000",
      },
      {
        label: "Résistance lumière",
        value: "> 4",
      },
      {
        label: "Densité mousse",
        value: "25 kg/m³",
      },
      {
        label: "Piètement",
        value: "Fer finition époxy gris anthracite",
      },
      {
        label: "Référence",
        value: "031150 - OLIVIA (exclusivité Monsieur Meuble)",
      },
    ],
    sources: [
      {
        label: "Monsieur Meuble – Chaise Olivia",
        url: "https://www.monsieur-meuble.com/771-chaise-olivia.html",
      },
    ],
    notes:
      "135 € du 02/11 au 30/11/2026 (170 € avant), éco-participation 2,63 € incluse. La description annonce 5 coloris, la fiche technique 4. Pas de hauteur d'assise, de charge, de garantie ni d'origine sur la page (les pastilles « Fabriqué en Europe » concernent d'autres chaises).",
  },
  "sofa-roma-corner": {
    seller: "Mobilier de France",
    brand: null,
    weightKg: null,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: null,
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "Bois de peuplier et hêtre",
      },
      {
        label: "Suspension",
        value: "Sangles élastiques",
      },
      {
        label: "Garnissage assise et accoudoirs",
        value: "Mousse polyuréthane densité 30 kg/m³",
      },
      {
        label: "Garnissage dossiers",
        value: "Flocons en fibre de polyuréthane",
      },
      {
        label: "Dossier",
        value: "Mécanisme avance/recule : profondeur d'assise réglable",
      },
      {
        label: "Accoudoirs",
        value: "Relevables multipositions",
      },
      {
        label: "Piètement",
        value: "Fer coloris titanio (hauteur 13,5 cm), 2 teintes au choix",
      },
      {
        label: "Revêtements",
        value: "Microfibre, tissu (cuir selon pictogramme), plus de 200 coloris",
      },
      {
        label: "Configurations",
        value: "Multiples dimensions et configurations, sur-mesure possible",
      },
      {
        label: "Disponibilité",
        value: "En magasin uniquement",
      },
    ],
    sources: [
      {
        label: "Mobilier de France – Canapé ROMA",
        url: "https://www.mobilierdefrance.com/canapes-droits/canape-roma",
      },
      {
        label: "Mobilier de France – Canapé d'angle ROMA (tissu)",
        url: "https://www.mobilierdefrance.com/canapes-d-angle/canape-d-angle-roma",
      },
      {
        label: "Mobilier de France – Canapé d'angle méridienne cuir ROMA",
        url: "https://www.mobilierdefrance.com/canapes-d-angle/canape-d-angle-meridienne-cuir-roma",
      },
    ],
    notes:
      "La page liée ne vend que les canapés droits (210 et 230 cm). La page d'angle en tissu indique L 300 × H 102 × P 104/170 cm ; l'angle méridienne cuir existe en L 279/292/299/312 cm. Aucune page ne donne 197 cm de profondeur (le sur-mesure est proposé). Aucun prix en ligne (« en magasin uniquement ») : les 6 780 € ne sont pas vérifiables.",
  },
  "sofa-roma-210": {
    seller: "Mobilier de France",
    brand: null,
    weightKg: null,
    maxLoadKg: null,
    warrantyYears: null,
    assembly: null,
    martindale: null,
    specs: [
      {
        label: "Structure",
        value: "Bois de peuplier et hêtre",
      },
      {
        label: "Suspension",
        value: "Sangles élastiques",
      },
      {
        label: "Garnissage assise et accoudoirs",
        value: "Mousse polyuréthane densité 30 kg/m³",
      },
      {
        label: "Garnissage dossiers",
        value: "Flocons en fibre de polyuréthane",
      },
      {
        label: "Dossier",
        value: "Mécanisme avance/recule : profondeur d'assise réglable",
      },
      {
        label: "Accoudoirs",
        value: "Relevables multipositions",
      },
      {
        label: "Piètement",
        value: "Fer coloris titanio (hauteur 13,5 cm), 2 teintes au choix",
      },
      {
        label: "Revêtements",
        value: "Microfibre, tissu (cuir selon pictogramme), plus de 200 coloris",
      },
      {
        label: "Dimensions / places",
        value: "Largeurs 210, 230 cm ; 2, 2,5 ou 3 places ; sans relaxation",
      },
      {
        label: "Disponibilité",
        value: "En magasin uniquement",
      },
    ],
    sources: [
      {
        label: "Mobilier de France – Canapé ROMA",
        url: "https://www.mobilierdefrance.com/canapes-droits/canape-roma",
      },
    ],
    notes:
      "La page donne une seule taille, L 230 × H 102 × P 104 cm, et cite 210 parmi les largeurs : la profondeur et la hauteur du 210 sont supposées identiques. Aucun prix en ligne (« en magasin uniquement ») : les 3 386,46 € ne sont pas vérifiables.",
  },
  "bed-beganio": {
    seller: "Vente-unique.com",
    brand: "Beganio (gamme Les Astucieux) ; matelas Ambracie de Ysmée",
    weightKg: null,
    maxLoadKg: 200,
    warrantyYears: 2,
    assembly: "à monter (2 personnes, fixation murale obligatoire, vis et chevilles non fournies)",
    martindale: null,
    specs: [
      {
        label: "Matière",
        value: "Panneau de particules, finition mélaminé blanc ; piètement métal",
      },
      {
        label: "Ouverture",
        value: "Verticale, manuelle (sans moteur), silencieuse, sécurité anti-basculement",
      },
      {
        label: "Sommier",
        value: "Sommier à lattes, 40 lattes",
      },
      {
        label: "Couchage",
        value: "140 × 200 cm, hauteur de couchage 38 cm",
      },
      {
        label: "Matelas",
        value:
          "Ambracie ressorts ensachés (464 ressorts), épaisseur 20 cm, âme 15 cm, livré compressé",
      },
      {
        label: "Densité accueil matelas",
        value: "23 kg/m³ (mousse de confort)",
      },
      {
        label: "Matelas – finitions",
        value: "Réversible été/hiver, coutil stretch ; garantie 5 ans",
      },
      {
        label: "Épaisseur matelas max",
        value: "25 cm",
      },
      {
        label: "Charge maximale",
        value: "200 kg",
      },
      {
        label: "Colis",
        value: "Lit 5 colis (173 kg au total), matelas 25 kg",
      },
    ],
    sources: [
      {
        label: "Vente-unique – Lit escamotable BEGANIO + matelas",
        url: "https://www.vente-unique.com/p/beganio-lit-escamotable-140-x-200-cm-ouverture-verticale-manuelle-blanc-matelas-beganio",
      },
    ],
    notes:
      "Fermé L 159 × H 225 × P 40 cm, ouvert 239,2 cm. 1 179,99 € éco-part 44,40 € incluse. Poids du lit non indiqué (seulement les colis). Garantie 2 ans du site, 5 ans pour le matelas. La densité est celle de l'accueil du matelas.",
  },
  "bed-consus": {
    seller: "Vente-unique.com",
    brand: "Lenart",
    weightKg: null,
    maxLoadKg: null,
    warrantyYears: 2,
    assembly: "à monter (fixation à un mur solide obligatoire)",
    martindale: null,
    specs: [
      {
        label: "Matière",
        value: "Panneau de particules laminé 16 mm, armature en métal",
      },
      {
        label: "Finition",
        value: "Chêne artisan",
      },
      {
        label: "Ouverture",
        value: "Verticale, mécanisme pneumatique, fermeture silencieuse (soft close)",
      },
      {
        label: "Sommier",
        value: "Sommier à lattes (jusqu'à 40 lattes selon la taille)",
      },
      {
        label: "Surface de couchage",
        value: "140 × 200 cm",
      },
      {
        label: "Matelas",
        value: "Non inclus ; hauteur max 18 cm",
      },
      {
        label: "Série / réf.",
        value: "Consus+, réf. 1847373",
      },
    ],
    sources: [
      {
        label: "Vente-unique – Lenart Consus armoire-lit escamotable",
        url: "https://www.vente-unique.com/p/lenart-armoire-lit-escamotable-vertical-140x200-cm-chene-artisan-lit-rabattable-lit-mural-consus",
      },
    ],
    notes:
      "Fermé L 151 × H 217 × P 46 cm (228 cm ouvert) selon la description ; le tableau dit 140/200/217. 1 578,90 € éco-part 11 € incluse. Matelas non inclus. Garantie 2 ans du site (produit peut-être vendu par un partenaire).",
  },
  "bed-altera-premium": {
    seller: "Altera Mobilier",
    brand: null,
    weightKg: 152,
    maxLoadKg: 200,
    warrantyYears: 2,
    assembly: "à monter (plan de montage fourni, 7 colis)",
    martindale: null,
    specs: [
      {
        label: "Panneaux",
        value: "MDF et panneaux stratifiés 16 à 23 mm, fond de lit plein en HDF",
      },
      {
        label: "Chants",
        value: "ABS",
      },
      {
        label: "Ouverture",
        value: "Ressorts (8 par côté), cachés sous console métal",
      },
      {
        label: "Sécurité",
        value: "Butée anti-retour à 1/4 d'ouverture, verrou manuel, sécurité enfant",
      },
      {
        label: "Sommier",
        value: "Lattes en bois doublées (1,6 cm), renfort central en métal",
      },
      {
        label: "Poignées / pieds",
        value: "Double poignée en aluminium ; pieds métal avec patins PVC",
      },
      {
        label: "Matelas",
        value: "Non inclus ; hauteur max 20 cm",
      },
      {
        label: "Garantie",
        value: "Lit 2 ans, ressorts 10 ans",
      },
      {
        label: "Fabrication",
        value: "Sur commande, livraison sous 15 à 25 jours ouvrés",
      },
    ],
    sources: [
      {
        label: "Altera Mobilier – Lit escamotable vertical 140x200 blanc mat Premium",
        url: "https://alteramobilier.fr/140x200-cm/25-lit-escamotable-relevable-vertical-140x200-cm-blanc-mat-premium.html",
      },
    ],
    notes:
      "Fermé L 153 × H 222 × P 41 cm, ouvert 234 cm. 899 € en promotion (1 049 € avant), éco-part 11 € incluse. La page dit « entreprise française, 100 % fournisseurs européens », sans pays de fabrication.",
  },
  "bookcase-vu-white": {
    seller: "Vente-unique.com",
    brand: null,
    weightKg: null,
    maxLoadKg: null,
    warrantyYears: 2,
    assembly: "à monter (accessoires et notice inclus, 3 colis)",
    martindale: null,
    specs: [
      {
        label: "Corps et façades",
        value: "Panneau stratifié (type MDF, finition mat)",
      },
      {
        label: "Panneau arrière",
        value: "HDF blanc",
      },
      {
        label: "Chants",
        value: "ABS 0,5 mm",
      },
      {
        label: "Largeur",
        value: "150 cm (70 + 40 + 40 cm)",
      },
      {
        label: "Niveaux",
        value: "5 niveaux, 33 cm entre étagères",
      },
      {
        label: "Pose",
        value: "À poser au sol",
      },
      {
        label: "Référence",
        value: "Réf. 4726412",
      },
    ],
    sources: [
      {
        label: "Vente-unique – Bibliothèque étagère 5 niveaux blanc",
        url: "https://www.vente-unique.com/p/bibliotheque-etagere-multifonction-blanc-5-niveaux-150x30x189cm-pour-livres-jouets-et-accessoires-de-bureau",
      },
    ],
    notes:
      "324,90 € (424,90 € avant), éco-part 2 € incluse. Poids, charge par étagère et épaisseur des panneaux non indiqués. Garantie 2 ans du site.",
  },
  "bookcase-vu-wotan": {
    seller: "Vente-unique.com",
    brand: null,
    weightKg: null,
    maxLoadKg: null,
    warrantyYears: 2,
    assembly: "à monter (accessoires et notice inclus, 3 colis)",
    martindale: null,
    specs: [
      {
        label: "Corps et façades",
        value: "Panneau stratifié (type MDF)",
      },
      {
        label: "Coloris",
        value: "Chêne Wotan (naturel clair)",
      },
      {
        label: "Panneau arrière",
        value: "HDF blanc",
      },
      {
        label: "Chants",
        value: "ABS 0,5 mm (0,7 mm selon un autre passage)",
      },
      {
        label: "Largeur",
        value: "150 cm (70 + 40 + 40 cm)",
      },
      {
        label: "Niveaux",
        value: "5 niveaux, 33 cm entre étagères",
      },
      {
        label: "Pose",
        value: "À poser au sol",
      },
      {
        label: "Référence",
        value: "Réf. 4726414",
      },
    ],
    sources: [
      {
        label: "Vente-unique – Bibliothèque étagère 5 niveaux chêne Wotan",
        url: "https://www.vente-unique.com/p/bibliotheque-etagere-multifonction-chene-wotan-5-niveaux-150x30x189cm-pour-livres-jouets-et-accessoires-de-bureau",
      },
    ],
    notes:
      "324,90 € (424,90 € avant), éco-part 2 € incluse. Poids, charge par étagère et épaisseur des panneaux non indiqués.",
  },
  "office-aeron": {
    seller: "Herman Miller France",
    brand: "Herman Miller",
    weightKg: 18.6,
    maxLoadKg: 159,
    warrantyYears: 12,
    assembly: "livré entièrement assemblé",
    martindale: null,
    specs: [
      {
        label: "Tailles",
        value: "A (142–163 cm), B (158–183 cm), C (178–200 cm)",
      },
      {
        label: "Taille B – dimensions",
        value:
          "Hauteur 950–1080 mm, profondeur 598 mm, largeur 658 mm, siège 450–580 mm, assise 514 × 462 mm",
      },
      {
        label: "Suspension",
        value: "Siège et dossier en élastomère 8Z Pellicle (8 zones de soutien)",
      },
      {
        label: "Soutien dorsal",
        value: "PostureFit SL fixe ou réglable",
      },
      {
        label: "Inclinaison",
        value: "Harmonic 2, limiteur de bascule et basculement avant",
      },
      {
        label: "Accoudoirs",
        value: "Fixes, hauteur réglable ou entièrement réglables",
      },
      {
        label: "Structure",
        value: "Aluminium moulé ; base nylon renforcé de verre (graphite)",
      },
      {
        label: "Environnement",
        value: "Cradle to Cradle V3 Silver, Indoor Advantage Gold, recyclable à 91 %",
      },
      {
        label: "Garantie",
        value: "12 ans (vérins, bascules et mécanismes compris)",
      },
    ],
    sources: [
      {
        label: "Herman Miller France – Siège de bureau Aeron",
        url: "https://frstore.hermanmiller.com/products/aeron-office-chair",
      },
    ],
    notes:
      "La taille du catalogue (72 × 70 × 98 cm) ne correspond pas à la taille B : 65,8 × 59,8 × 95–108 cm. 1 599 € = −25 % (Black Friday) sur 2 132 € pour le cadre graphite avec piètement aluminium poli ; le tout-graphite est à 1 586 € ou 1 775 € selon le PostureFit (1 189,50 € ou 1 331,25 € à −25 %). Hauteur d'assise : 45–58 cm.",
  },
  "desk-flexispot-solid-wood": {
    seller: "FlexiSpot",
    brand: null,
    weightKg: null,
    maxLoadKg: 180,
    warrantyYears: 2,
    assembly: "à monter (env. 20 min, perçage de la traverse nécessaire)",
    martindale: null,
    specs: [
      {
        label: "Plateau",
        value:
          "Bois massif (chêne blanc européen, noyer, hêtre allemand ou hévéa), 2,7 cm, coins arrondis",
      },
      {
        label: "Tailles plateau",
        value: "140/160/180/200 × 80 cm (23/26/29/32 kg)",
      },
      {
        label: "Finitions",
        value: "Chêne huile-cire ; noyer huile-cire et laque ; hêtre UV ; hévéa vernis UV",
      },
      {
        label: "Cadre E7 PRO",
        value: "Pieds en C, 2 moteurs, 50 mm/s, < 45 dB",
      },
      {
        label: "Plage de hauteur (cadre)",
        value: "E7 PRO 635–1285 mm ; E7 Plus 660–1310 mm",
      },
      {
        label: "Charge",
        value: "E7 PRO 180 kg dynamique / 260 kg statique ; E7 Plus 200 / 280 kg",
      },
      {
        label: "Commande",
        value: "Écran tactile, positions mémoire, USB-C 20 W, anti-collision",
      },
      {
        label: "Garantie",
        value: "Plateau 2 ans ; cadre E7 PRO 15 ans, E7 Plus 10 ans",
      },
    ],
    sources: [
      {
        label: "FlexiSpot – Bureau assis debout avec plateau en bois massif",
        url: "https://www.flexispot.fr/bureau-assis-debout-avec-plateau-en-bois-massif.html",
      },
    ],
    notes:
      "Déjà acheté. La page ne vend que des plateaux de 80 cm de profondeur, à partir de 140 × 80 cm (le cadre E7 PRO accepte 120–200 × 60–80 cm) : le 120 × 60 du catalogue est celui du bureau possédé. À partir de 829,98 € neuf (hévéa 140 × 80, E7 PRO). Charge et garantie : cadre E7 PRO et plateau (le modèle exact du bureau n'est pas connu).",
  },
};

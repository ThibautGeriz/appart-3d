import { APARTMENT_DEF } from "../data/apartment";
import { kindLabel, type ProductKind } from "../data/catalog";
import { formatEuros } from "../apartment/furnishing";
import { modelUrl } from "../apartment/models";
import {
  catalogRows,
  facetCounts,
  filterRows,
  modelSource,
  positionOf,
  priceOf,
  priceAt,
  priceBounds,
  sellerOf,
  SORT_KEYS,
  sortRows,
  type CatalogRow,
  type Filters,
  type SortKey,
} from "./rows";
import { createPreviews } from "./preview";

/**
 * catalog.html: every product of the catalog with its 3D model, origin, key
 * characteristics and sources, sortable by size and the other figures, with
 * facets on the left (type, seller, price range). Sort, direction, facets and
 * search live in the URL (shareable).
 */

const REPO = "https://github.com/ThibautGeriz/appart-3d/blob/main/";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

const link = (href: string, text: string, className = "") => {
  const a = el("a", className, text);
  Object.assign(a, { href, target: "_blank", rel: "noopener" });
  return a;
};

const cm = (m: number) => `${Math.round(m * 1000) / 10}`.replace(".", ",");
const num = (n: number, unit: string) => `${String(n).replace(".", ",")} ${unit}`;
const dash = "—";

const rows = catalogRows(APARTMENT_DEF.furnishing);
const bounds = priceBounds(rows);
const previews = createPreviews();

// ── State (URL) ───────────────────────────────────────────────────────
const isKey = (k: string | null): k is SortKey => SORT_KEYS.some((s) => s.key === k);
const list = (value: string | null) => new Set((value ?? "").split(",").filter(Boolean));
/** "prix=100-900": a range inside the catalog's, else none */
const readPrice = (value: string | null): [number, number] | null => {
  const m = /^(\d+)-(\d+)$/.exec(value ?? "");
  if (!m) return null;
  const lo = Math.max(bounds[0], Number(m[1]));
  const hi = Math.min(bounds[1], Number(m[2]));
  return lo <= hi && (lo > bounds[0] || hi < bounds[1]) ? [lo, hi] : null;
};
const readState = (): Filters & { sort: SortKey; ascending: boolean } => {
  const params = new URLSearchParams(location.hash.slice(1));
  return {
    sort: isKey(params.get("tri")) ? (params.get("tri") as SortKey) : ("kind" as SortKey),
    ascending: params.get("ordre") !== "desc",
    kinds: list(params.get("type")),
    sellers: list(params.get("vendeur")),
    price: readPrice(params.get("prix")),
    search: params.get("q") ?? "",
  };
};
const state = readState();
const saveState = () => {
  const p = new URLSearchParams();
  p.set("tri", state.sort);
  if (!state.ascending) p.set("ordre", "desc");
  if (state.kinds.size) p.set("type", [...state.kinds].join(","));
  if (state.sellers.size) p.set("vendeur", [...state.sellers].join(","));
  if (state.price) p.set("prix", state.price.join("-"));
  if (state.search) p.set("q", state.search);
  history.replaceState(null, "", `#${p}`);
};

// ── Controls ──────────────────────────────────────────────────────────
const app = document.getElementById("catalog")!;
const search = el("input", "c-search");
Object.assign(search, {
  type: "search",
  placeholder: "Rechercher (chêne, Inde, tissu…)",
  value: state.search,
});
const sortSelect = el("select", "c-select");
sortSelect.setAttribute("aria-label", "Trier par");
for (const { key, label } of SORT_KEYS) {
  const o = el("option", "", label);
  o.value = key;
  sortSelect.appendChild(o);
}
const direction = el("button", "c-dir");
direction.type = "button";

// ── Facets (left panel) ───────────────────────────────────────────────
const facets = el("aside", "c-facets");
facets.id = "c-facets";
facets.setAttribute("aria-label", "Filtres");
const facetToggle = el("button", "c-facet-toggle");
facetToggle.type = "button";
facetToggle.setAttribute("aria-controls", facets.id);
facetToggle.addEventListener("click", () => {
  const open = !facets.classList.contains("open");
  facets.classList.toggle("open", open);
  facetToggle.setAttribute("aria-expanded", String(open));
});

/** A facet: a titled list of checkboxes, one per value, with its count. */
function checkboxFacet(
  title: string,
  values: { value: string; label: string }[],
  selected: () => Set<string>,
) {
  const box = el("fieldset", "c-facet");
  box.appendChild(el("legend", "", title));
  const items = new Map<
    string,
    { input: HTMLInputElement; count: HTMLSpanElement; row: HTMLLabelElement }
  >();
  for (const { value, label } of values) {
    const row = el("label", "c-option");
    const input = el("input");
    input.type = "checkbox";
    input.addEventListener("change", () => {
      if (input.checked) selected().add(value);
      else selected().delete(value);
      render();
    });
    const count = el("span", "c-option-count");
    row.append(input, el("span", "c-option-label", label), count);
    box.appendChild(row);
    items.set(value, { input, count, row });
  }
  return {
    box,
    update(counts: Map<string, number>) {
      for (const [value, { input, count, row }] of items) {
        const n = counts.get(value) ?? 0;
        input.checked = selected().has(value);
        count.textContent = String(n);
        row.classList.toggle("empty", n === 0 && !input.checked);
      }
    },
  };
}

const cap = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;
const kindFacet = checkboxFacet(
  "Type",
  ([...new Set(rows.map((r) => r.product.kind))] as ProductKind[])
    .map((kind) => ({ value: kind, label: cap(kindLabel(kind)) }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr")),
  () => state.kinds,
);
const sellerFacet = checkboxFacet(
  "Vendeur",
  [...new Set(rows.map(sellerOf))]
    .sort((a, b) => a.localeCompare(b, "fr"))
    .map((seller) => ({ value: seller, label: seller })),
  () => state.sellers,
);

// price: two thumbs on one track (log scale) and the two figures, editable
const priceBox = el("fieldset", "c-facet c-price-facet");
priceBox.appendChild(el("legend", "", "Prix"));
const track = el("div", "c-range");
const fill = el("div", "c-range-fill");
const thumb = (label: string) => {
  const r = el("input", "c-range-thumb");
  Object.assign(r, { type: "range", min: "0", max: "1000", step: "1" });
  r.setAttribute("aria-label", label);
  return r;
};
const lowThumb = thumb("Prix minimum");
const highThumb = thumb("Prix maximum");
track.append(fill, lowThumb, highThumb);
const euros = (label: string) => {
  const box = el("label", "c-euros");
  const input = el("input", "c-euro-input");
  Object.assign(input, {
    type: "number",
    min: String(bounds[0]),
    max: String(bounds[1]),
    step: "1",
  });
  input.setAttribute("aria-label", label);
  box.append(input, el("span", "", "€"));
  return { box, input };
};
const lowEuros = euros("Prix minimum (€)");
const highEuros = euros("Prix maximum (€)");
const priceFigures = el("div", "c-euro-row");
priceFigures.append(lowEuros.box, el("span", "c-euro-dash", "–"), highEuros.box);
const priceNote = el("p", "c-price-note");
priceBox.append(track, priceFigures, priceNote);

const range = (): [number, number] => state.price ?? bounds;
const setPrice = (lo: number, hi: number) => {
  lo = Math.max(bounds[0], Math.min(lo, bounds[1]));
  hi = Math.max(bounds[0], Math.min(hi, bounds[1]));
  if (lo > hi) [lo, hi] = [hi, lo];
  state.price = lo > bounds[0] || hi < bounds[1] ? [lo, hi] : null;
  render();
};
const fromThumbs = (moved: HTMLInputElement) => {
  let a = Number(lowThumb.value);
  let b = Number(highThumb.value);
  if (a > b) {
    // the thumbs do not cross: the moved one stops at the other
    if (moved === lowThumb) a = b;
    else b = a;
  }
  setPrice(
    a === 0 ? bounds[0] : priceAt(a / 1000, bounds),
    b === 1000 ? bounds[1] : priceAt(b / 1000, bounds),
  );
};
lowThumb.addEventListener("input", () => fromThumbs(lowThumb));
highThumb.addEventListener("input", () => fromThumbs(highThumb));
lowEuros.input.addEventListener("change", () =>
  setPrice(Number(lowEuros.input.value) || bounds[0], range()[1]),
);
highEuros.input.addEventListener("change", () =>
  setPrice(range()[0], Number(highEuros.input.value) || bounds[1]),
);

const clear = el("button", "c-clear", "Effacer les filtres");
clear.type = "button";
clear.addEventListener("click", () => {
  state.kinds.clear();
  state.sellers.clear();
  state.price = null;
  state.search = "";
  search.value = "";
  render();
});
const facetsHead = el("div", "c-facets-head");
facetsHead.append(el("h2", "", "Filtres"), clear);
facets.append(facetsHead, kindFacet.box, sellerFacet.box, priceBox);

function renderFacets(): void {
  kindFacet.update(facetCounts(rows, state, "kinds"));
  sellerFacet.update(facetCounts(rows, state, "sellers"));
  const [lo, hi] = range();
  lowThumb.value = String(lo <= bounds[0] ? 0 : Math.round(positionOf(lo, bounds) * 1000));
  highThumb.value = String(hi >= bounds[1] ? 1000 : Math.round(positionOf(hi, bounds) * 1000));
  // the low thumb on top when both are at the right end (else it cannot be grabbed)
  lowThumb.classList.toggle("top", Number(lowThumb.value) > 900);
  fill.style.left = `${Number(lowThumb.value) / 10}%`;
  fill.style.right = `${100 - Number(highThumb.value) / 10}%`;
  if (document.activeElement !== lowEuros.input) lowEuros.input.value = String(lo);
  if (document.activeElement !== highEuros.input) highEuros.input.value = String(hi);
  priceNote.textContent = state.price
    ? "Hors produits sans prix et déjà achetés"
    : `Tous les prix, et les ${rows.filter((r) => priceOf(r) === null).length} produits sans prix`;
  const active =
    state.kinds.size + state.sellers.size + (state.price ? 1 : 0) + (state.search ? 1 : 0);
  clear.hidden = active === 0;
  facetToggle.textContent = active ? `Filtres (${active})` : "Filtres";
}

const count = el("p", "c-count");
const controls = el("div", "c-controls");
const sortBox = el("label", "c-sort");
sortBox.append(el("span", "", "Trier par"), sortSelect, direction);
controls.append(facetToggle, search, sortBox);
const results = el("section", "c-results");
results.append(count);
app.append(controls, facets, results);

search.addEventListener("input", () => {
  state.search = search.value;
  render();
});
sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value as SortKey;
  render();
});
direction.addEventListener("click", () => {
  state.ascending = !state.ascending;
  render();
});

// ── Table ─────────────────────────────────────────────────────────────
const COLUMNS: { label: string; key?: SortKey; className?: string }[] = [
  { label: "" },
  { label: "Produit", key: "name" },
  { label: "Type", key: "kind" },
  { label: "L", key: "width", className: "n" },
  { label: "P", key: "depth", className: "n" },
  { label: "H", key: "height", className: "n" },
  { label: "Emprise", key: "footprint", className: "n" },
  { label: "Assise", key: "seat", className: "n" },
  { label: "Poids", key: "weight", className: "n" },
  { label: "Prix", key: "price", className: "n" },
  { label: "Origine", key: "origin" },
  { label: "Caractéristiques clés" },
];
const table = el("table", "c-table");
const head = el("tr");
const headers = new Map<SortKey, HTMLTableCellElement>();
for (const c of COLUMNS) {
  const th = el("th", c.className ?? "");
  if (c.key) {
    const b = el("button", "c-th", c.label);
    b.type = "button";
    const key = c.key;
    b.addEventListener("click", () => {
      if (state.sort === key) state.ascending = !state.ascending;
      else {
        state.sort = key;
        state.ascending = true;
      }
      render();
    });
    th.appendChild(b);
    headers.set(key, th);
  } else th.textContent = c.label;
  head.appendChild(th);
}
const thead = el("thead");
thead.appendChild(head);
const tbody = el("tbody");
table.append(thead, tbody);
results.appendChild(table);

// thumbnails: drawn when the row scrolls into view
const thumbs = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const img = e.target as HTMLImageElement;
      thumbs.unobserve(img);
      previews.thumbnail(img.dataset.file!).then(
        (url) => (img.src = url),
        () => img.classList.add("c-thumb-missing"),
      );
    }
  },
  { rootMargin: "300px" },
);

/** Key figures as chips: what the sorts use, and the build facts. */
function keyFacts(row: CatalogRow): HTMLElement {
  const d = row.details;
  const box = el("div", "c-facts");
  const chip = (text: string, title?: string) => {
    const c = el("span", "c-fact", text);
    if (title) c.title = title;
    box.appendChild(c);
  };
  if (row.product.seatFoamDensity)
    chip(`Mousse ${row.product.seatFoamDensity} kg/m³`, "Densité de la mousse d'assise");
  if (d?.martindale)
    chip(`${d.martindale.toLocaleString("fr-FR")} Martindale`, "Résistance à l'abrasion du tissu");
  if (d?.maxLoadKg) chip(`Charge ${d.maxLoadKg} kg`);
  if (d?.warrantyYears) chip(`Garantie ${d.warrantyYears} ans`);
  if (d?.assembly) chip(d.assembly.split(" (")[0], d.assembly);
  if (row.product.fabric) chip(`${row.product.fabric.colors.length} coloris`);
  if (!box.childElementCount) box.textContent = dash;
  return box;
}

function details(row: CatalogRow): HTMLElement {
  const { product: p, details: d } = row;
  const box = el("div", "c-details");
  const col = (title: string, ...content: (Node | string)[]) => {
    const s = el("section");
    s.append(el("h3", "", title), ...content);
    box.appendChild(s);
  };
  const specs = el("dl", "c-specs");
  const add = (label: string, value: string) =>
    specs.append(el("dt", "", label), el("dd", "", value));
  add("Matériaux", p.materials);
  for (const s of d?.specs ?? []) add(s.label, s.value);
  col("Caractéristiques", specs);

  const origin = el("dl", "c-specs");
  const addOrigin = (label: string, value: string | null) =>
    origin.append(el("dt", "", label), el("dd", value ? "" : "c-unknown", value ?? "non indiqué"));
  addOrigin("Vendeur", d?.seller ?? null);
  if (d?.brand) addOrigin("Marque", d.brand);
  addOrigin("Fabriqué en", p.madeIn ?? null);
  addOrigin("Montage", d?.assembly ?? null);
  const sources = el("ul", "c-sources");
  for (const s of d?.sources ?? [{ label: "Page produit", url: p.url }]) {
    const li = el("li");
    li.appendChild(link(s.url, s.label));
    sources.appendChild(li);
  }
  col("Origine et sources", origin, sources);

  const model = el("dl", "c-specs");
  const file = `models/${p.id}.glb`;
  const addModel = (label: string, value: Node | string) => {
    const dd = el("dd");
    dd.append(value);
    model.append(el("dt", "", label), dd);
  };
  addModel("Fichier", link(REPO + file, file));
  addModel("Construit par", link(REPO + modelSource(p), modelSource(p)));
  addModel("À la taille", `L ${cm(p.w)} × P ${cm(p.d)} × H ${cm(p.h)} cm (celle du vendeur)`);
  const size = el("span", "", "…");
  addModel("Poids du fichier", size);
  const url = modelUrl(p.id);
  if (url) {
    void fetch(url, { method: "HEAD" }).then((r) => {
      const bytes = Number(r.headers.get("content-length"));
      size.textContent = bytes ? `${Math.round(bytes / 1024)} Ko` : dash;
    });
  }
  const view = el("button", "c-view", "Voir en 3D");
  view.type = "button";
  view.addEventListener("click", () => openViewer(row));
  col("Modèle 3D", model, view);

  if (d?.notes) {
    const note = el("p", "c-note", d.notes);
    box.appendChild(note);
  }
  return box;
}

function rowElements(row: CatalogRow): HTMLTableRowElement[] {
  const { product: p, details: d } = row;
  const tr = el("tr", "c-row");
  const td = (content: Node | string, className = "") => {
    const cell = el("td", className);
    cell.append(content);
    tr.appendChild(cell);
    return cell;
  };
  const img = el("img", "c-thumb");
  Object.assign(img, { alt: p.name, width: 96, height: 96 });
  img.dataset.file = p.id;
  thumbs.observe(img);
  const thumbButton = el("button", "c-thumb-button");
  thumbButton.type = "button";
  thumbButton.title = "Voir en 3D";
  thumbButton.appendChild(img);
  thumbButton.addEventListener("click", (e) => {
    e.stopPropagation();
    openViewer(row);
  });
  td(thumbButton, "c-thumb-cell");

  const name = el("div", "c-name");
  name.append(
    link(p.url, p.name, "c-product"),
    el("span", "c-seller", d ? [d.seller, d.brand].filter(Boolean).join(" · ") : ""),
  );
  td(name);
  const kind = el("div");
  kind.append(
    el("span", "c-kind", row.kind),
    el("span", "c-places", row.places.join(" · ") || "hors plan"),
  );
  td(kind);
  td(cm(p.w), "n").dataset.label = "L (cm)";
  td(cm(p.d), "n").dataset.label = "P (cm)";
  td(cm(p.h), "n").dataset.label = "H (cm)";
  td(num(Math.round(row.footprint * 100) / 100, "m²"), "n").dataset.label = "Emprise";
  td(p.seatHeight ? `${cm(p.seatHeight)} cm` : dash, "n").dataset.label = "Assise";
  td(d?.weightKg ? num(d.weightKg, "kg") : dash, "n").dataset.label = "Poids";
  td(p.owned ? "déjà acheté" : p.price ? formatEuros(p.price) : dash, "n c-price").dataset.label =
    "Prix";
  td(p.madeIn ?? "non indiqué", p.madeIn ? "" : "c-unknown").dataset.label = "Origine";
  td(keyFacts(row), "c-facts-cell");

  const more = el("tr", "c-more");
  more.hidden = true;
  const cell = el("td");
  cell.colSpan = COLUMNS.length;
  more.appendChild(cell);
  tr.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (!cell.firstChild) cell.appendChild(details(row));
    more.hidden = !more.hidden;
    tr.classList.toggle("open", !more.hidden);
  });
  tr.tabIndex = 0;
  tr.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tr.click();
    }
  });
  return [tr, more];
}

const elements = new Map(rows.map((r) => [r.product.id, rowElements(r)]));

// nothing matches: say so, and offer to clear the filters
const emptyRow = el("tr", "c-empty");
const emptyCell = el("td", "", "Aucun produit ne correspond à ces filtres. ");
emptyCell.colSpan = COLUMNS.length;
const emptyClear = el("button", "c-clear", "Effacer les filtres");
emptyClear.type = "button";
emptyClear.addEventListener("click", () => clear.click());
emptyCell.appendChild(emptyClear);
emptyRow.appendChild(emptyCell);

function render(): void {
  saveState();
  sortSelect.value = state.sort;
  direction.textContent = state.ascending ? "↑ croissant" : "↓ décroissant";
  renderFacets();
  for (const [key, th] of headers) {
    th.classList.toggle("sorted", key === state.sort);
    th.querySelector("button")!.dataset.dir =
      key === state.sort ? (state.ascending ? "↑" : "↓") : "";
  }
  const shown = sortRows(filterRows(rows, state), state.sort, state.ascending);
  tbody.replaceChildren(...shown.flatMap((r) => elements.get(r.product.id)!));
  if (!shown.length) tbody.appendChild(emptyRow);
  const total = shown.reduce((s, r) => s + (r.product.owned ? 0 : r.product.price), 0);
  count.textContent = `${shown.length} produit${shown.length > 1 ? "s" : ""} · ${formatEuros(total)} au total (1 de chaque)`;
}

// ── 3D viewer ─────────────────────────────────────────────────────────
const dialog = el("dialog", "c-dialog");
const dialogTitle = el("h2");
const dialogInfo = el("p", "c-dialog-info");
const stage = el("div", "c-stage");
const close = el("button", "c-close", "✕");
close.type = "button";
close.setAttribute("aria-label", "Fermer");
const dialogHead = el("div", "c-dialog-head");
dialogHead.append(dialogTitle, close);
dialog.append(dialogHead, stage, dialogInfo);
document.body.appendChild(dialog);
let viewer: { close(): void } | null = null;
close.addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => {
  viewer?.close();
  viewer = null;
});

async function openViewer(row: CatalogRow): Promise<void> {
  const p = row.product;
  dialogTitle.textContent = p.name;
  dialogInfo.textContent = "Chargement…";
  dialog.showModal();
  try {
    const opened = await previews.open(p.id, stage);
    if (!dialog.open) return opened.close();
    viewer = opened;
    dialogInfo.textContent = `L ${cm(p.w)} × P ${cm(p.d)} × H ${cm(p.h)} cm · ${opened.triangles.toLocaleString("fr-FR")} triangles · faites glisser pour tourner, molette pour zoomer`;
  } catch (e) {
    dialogInfo.textContent = String(e);
  }
}

render();
// a link to another sort / filter (same page, new hash)
window.addEventListener("hashchange", () => {
  Object.assign(state, readState());
  search.value = state.search;
  render();
});

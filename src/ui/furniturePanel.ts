import type { ApartmentDef } from "../data/apartment";
import { productsOf, type Product, type ProductKind } from "../data/catalog";
import type { Furniture } from "../apartment/furniture";
import { budget, fits, formatEuros, type SlotDef } from "../apartment/furnishing";

const cm = (m: number) => Math.round(m * 100);

/** "L 220 × P 90 × H 76 cm". Pure. */
export function sizeLabel(p: Product): string {
  return `L ${cm(p.w)} × P ${cm(p.d)} × H ${cm(p.h)} cm`;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * Furniture toolbar (top left): a "Meubles" tab to switch each product and a
 * "Budget" tab with the price of the selection, grouped by room.
 */
export function createFurniturePanel(
  container: HTMLElement,
  def: ApartmentDef,
  furniture: Furniture,
): void {
  const button = el("button", "hud-dim hud-furniture", "🪑 MEUBLES");
  button.type = "button";
  const panel = el("div", "hud-furniture-panel");
  panel.hidden = true;
  // keep touches and clicks on the panel away from the look / walk controls
  for (const target of [button, panel]) {
    for (const type of ["pointerdown", "pointerup", "wheel"] as const) {
      target.addEventListener(type, (e) => e.stopPropagation());
    }
  }

  const tabs = el("div", "fp-tabs");
  tabs.setAttribute("role", "tablist");
  const pages = { meubles: el("div", "fp-page"), budget: el("div", "fp-page") };
  const tabButtons = {
    meubles: el("button", "fp-tab", "Meubles"),
    budget: el("button", "fp-tab", "Budget"),
  };
  let current: keyof typeof pages = "meubles";
  const show = (tab: keyof typeof pages) => {
    current = tab;
    for (const key of Object.keys(pages) as (keyof typeof pages)[]) {
      pages[key].hidden = key !== tab;
      tabButtons[key].classList.toggle("active", key === tab);
      tabButtons[key].setAttribute("aria-selected", String(key === tab));
    }
    if (tab === "budget") renderBudget();
  };
  for (const key of Object.keys(tabButtons) as (keyof typeof pages)[]) {
    const b = tabButtons[key];
    b.type = "button";
    b.setAttribute("role", "tab");
    b.addEventListener("click", () => show(key));
    tabs.appendChild(b);
  }

  // ── Meubles: the room first, then a row of choices per slot ─────────
  const slots = def.furnishing.slots;
  const rooms = [...new Set(slots.map((s) => s.room))];
  const roomBar = el("div", "fp-rooms");
  const roomButtons = new Map<string, HTMLButtonElement>();
  const roomPages = new Map<string, HTMLElement>();
  let room = rooms[0];
  const showRoom = (name: string) => {
    room = name;
    for (const [r, b] of roomButtons) b.classList.toggle("active", r === name);
    for (const [r, page] of roomPages) page.hidden = r !== name;
  };
  for (const r of rooms) {
    const b = el("button", "fp-room", r);
    b.type = "button";
    b.addEventListener("click", () => showRoom(r));
    roomButtons.set(r, b);
    roomBar.appendChild(b);
    const page = el("div", "fp-room-page");
    roomPages.set(r, page);
  }
  pages.meubles.appendChild(roomBar);

  const options: { slot: SlotDef; product: Product; button: HTMLButtonElement }[] = [];
  for (const s of slots) {
    const section = el("section", "fp-section");
    section.appendChild(el("h3", "fp-title", s.title));
    const list = el("div", "fp-options");
    for (const p of productsOf(s.kind)) {
      const ok = fits(s, p);
      const option = el("button", "fp-option");
      option.type = "button";
      option.disabled = !ok;
      option.append(
        el("span", "fp-name", p.name),
        el(
          "span",
          "fp-size",
          ok ? sizeLabel(p) : `${sizeLabel(p)} · trop large (max ${cm(s.maxWidth!)} cm)`,
        ),
        el("span", "fp-price", formatEuros(p.price)),
      );
      option.title = p.materials;
      option.addEventListener("click", () => {
        if (!ok || furniture.selection[s.id] === p.id) return;
        option.classList.add("loading");
        void furniture.select(s.id, p.id).finally(() => option.classList.remove("loading"));
        refreshOptions();
      });
      const link = el("a", "fp-link", "↗");
      Object.assign(link, {
        href: p.url,
        target: "_blank",
        rel: "noopener",
        title: "Voir le produit",
      });
      const row = el("div", "fp-row");
      row.append(option, link);
      list.appendChild(row);
      options.push({ slot: s, product: p, button: option });
    }
    section.appendChild(list);
    if (s.kind === "sofa") section.appendChild(colorPicker(furniture));
    roomPages.get(s.room)!.appendChild(section);
  }
  for (const page of roomPages.values()) pages.meubles.appendChild(page);
  showRoom(room);
  const refreshOptions = () => {
    for (const { slot: s, product: p, button } of options) {
      button.classList.toggle("active", furniture.selection[s.id] === p.id);
    }
  };

  // ── Budget: rooms → products × quantity ─────────────────────────────
  const renderBudget = () => {
    const rooms = budget(def, furniture.placements);
    const page = pages.budget;
    page.replaceChildren();
    for (const room of rooms) {
      const section = el("section", "fp-section");
      section.appendChild(el("h3", "fp-title", room.room));
      const table = el("table", "fp-budget");
      for (const line of room.lines) {
        const tr = el("tr", "");
        const name = el("td", "");
        const link = el("a", "", line.product.name);
        Object.assign(link, { href: line.product.url, target: "_blank", rel: "noopener" });
        name.append(link, el("span", "fp-kind", ` · ${kindLabel(line.product.kind)}`));
        tr.append(
          el("td", "fp-qty", `${line.quantity} ×`),
          name,
          el("td", "fp-unit", formatEuros(line.product.price)),
          el("td", "fp-amount", formatEuros(line.total)),
        );
        table.appendChild(tr);
      }
      const total = el("tr", "fp-subtotal");
      total.append(
        el("td", "", ""),
        el("td", "", "Sous-total"),
        el("td", "", ""),
        el("td", "fp-amount", formatEuros(room.total)),
      );
      table.appendChild(total);
      section.appendChild(table);
      page.appendChild(section);
    }
    const grand = rooms.reduce((s, r) => s + r.total, 0);
    page.appendChild(el("div", "fp-total", `Total : ${formatEuros(grand)}`));
  };

  furniture.onChange(() => {
    refreshOptions();
    if (current === "budget") renderBudget();
  });
  refreshOptions();
  show("meubles");

  panel.append(tabs, pages.meubles, pages.budget);
  button.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    button.classList.toggle("active", !panel.hidden);
  });
  container.append(button, panel);
}

/** Fabric colours offered for the sofa (the shop has 200+; any can be picked). */
export const SOFA_COLORS: { name: string; hex: string }[] = [
  { name: "Moutarde", hex: "#c9971c" },
  { name: "Terracotta", hex: "#b4553a" },
  { name: "Vert sauge", hex: "#8a9a7b" },
  { name: "Bleu canard", hex: "#1f5f6b" },
  { name: "Bleu nuit", hex: "#233250" },
  { name: "Beige lin", hex: "#d8ccb6" },
  { name: "Gris perle", hex: "#b9b7b2" },
  { name: "Anthracite", hex: "#45464a" },
];

/** Swatches + a free colour input, tinting the sofa fabric live. */
function colorPicker(furniture: Furniture): HTMLElement {
  const row = el("div", "fp-colors");
  row.appendChild(el("span", "fp-size", "Couleur"));
  const swatches: HTMLButtonElement[] = [];
  const custom = el("input", "fp-color-input");
  custom.type = "color";
  custom.title = "Autre couleur";
  const refresh = () => {
    for (const s of swatches) s.classList.toggle("active", s.dataset.hex === furniture.sofaColor);
    custom.value = furniture.sofaColor;
  };
  for (const { name, hex } of SOFA_COLORS) {
    const swatch = el("button", "fp-swatch");
    swatch.type = "button";
    swatch.title = name;
    swatch.setAttribute("aria-label", name);
    swatch.dataset.hex = hex;
    swatch.style.background = hex;
    swatch.addEventListener("click", () => {
      furniture.setSofaColor(hex);
      refresh();
    });
    swatches.push(swatch);
    row.appendChild(swatch);
  }
  custom.addEventListener("input", () => {
    furniture.setSofaColor(custom.value);
    refresh();
  });
  row.appendChild(custom);
  refresh();
  return row;
}

function kindLabel(kind: ProductKind): string {
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
  }[kind];
}

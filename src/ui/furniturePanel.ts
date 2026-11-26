import type { ApartmentDef } from "../data/apartment";
import { productsOf, type Product, type ProductKind } from "../data/catalog";
import type { Furniture } from "../apartment/furniture";
import { budget, formatEuros } from "../apartment/furnishing";

const SECTIONS: { kind: ProductKind; title: string }[] = [
  { kind: "table", title: "Table" },
  { kind: "chair", title: "Chaises" },
  { kind: "coffeeTable", title: "Table basse" },
];

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

  // ── Meubles: one row of choices per kind ────────────────────────────
  const options = new Map<string, HTMLButtonElement>();
  for (const { kind, title } of SECTIONS) {
    const section = el("section", "fp-section");
    section.appendChild(el("h3", "fp-title", title));
    const list = el("div", "fp-options");
    for (const p of productsOf(kind)) {
      const option = el("button", "fp-option");
      option.type = "button";
      option.append(
        el("span", "fp-name", p.name),
        el("span", "fp-size", sizeLabel(p)),
        el("span", "fp-price", formatEuros(p.price)),
      );
      option.title = p.materials;
      option.addEventListener("click", () => {
        if (furniture.selection[kind] === p.id) return;
        option.classList.add("loading");
        void furniture.select(kind, p.id).finally(() => option.classList.remove("loading"));
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
      options.set(p.id, option);
    }
    section.appendChild(list);
    pages.meubles.appendChild(section);
  }
  const refreshOptions = () => {
    for (const [id, option] of options) {
      option.classList.toggle("active", Object.values(furniture.selection).includes(id));
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

function kindLabel(kind: ProductKind): string {
  return { table: "table", chair: "chaise", coffeeTable: "table basse" }[kind];
}

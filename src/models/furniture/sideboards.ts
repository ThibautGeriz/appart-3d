import * as THREE from "three";
import type { Product } from "../../data/catalog";
import { darkGap } from "../materials";
import { oiledOak, recycledPine } from "./materials";
import { bar, board, v } from "./parts";

/*
 * Sideboards (bahuts) at the seller's dimensions. Origin: floor, centred;
 * width along x, the front facing +z.
 */

/*
 * Local tints of the shared woods. A clone keeps the material name, so the
 * same photo scan is attached at export; only the tint differs (measured on
 * the seller's photos, the shared tints read too dark / too orange here).
 */
/** Biwa: weathered recycled pine, a greyer red-brown than the shared tint. */
const biwaPine = recycledPine.clone();
biwaPine.color.set("#e8ac90");
/** Biwa: the bar pulls, a little darker (worn, handled) so they read. */
const biwaPull = recycledPine.clone();
biwaPull.color.set("#a8705a");
/** Norway: honey oiled oak ("couleur miel"), lighter than the shared oak. */
const norwayOak = oiledOak.clone();
norwayOak.color.set("#fff4e2");
norwayOak.roughness = 0.75;
/** Norway: the inside of the TV niche, in shade. */
const norwayShade = oiledOak.clone();
norwayShade.color.set("#9a8670");
/** Norway: shadow in the groove around the door panels. */
const oakGroove = new THREE.MeshStandardMaterial({
  name: "oak groove",
  color: "#5a3e24",
  roughness: 0.9,
});
/** Norway: aged dark pewter-iron pulls and latches. */
const agedIron = new THREE.MeshStandardMaterial({
  name: "aged iron",
  color: "#48443e",
  metalness: 0.7,
  roughness: 0.45,
});
/** Norway: dark square oak pegs at the post joints. */
const oakPeg = new THREE.MeshStandardMaterial({
  name: "oak peg",
  color: "#3a2a1c",
  roughness: 0.8,
});

/**
 * BIWA: recycled pine, two doors faced with an open checkerboard of
 * horizontal slats laid like bricks (dark squares between them), wooden bar
 * pulls, three drawers in the middle (sideboard) or one drawer under two open
 * niches (TV unit), splayed legs. Sideboard L 160 × P 48 × H 85 cm.
 */
export function biwa(p: Product, center: "drawers" | "niches" = "drawers"): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const legH = 0.13;
  const top = 0.03;
  const t = 0.025; // carcass boards
  const bodyD = d - 0.01;
  const body0 = legH;
  const body1 = h - top;
  // fronts sit inside the carcass, so the pulls stay within the depth
  const front = bodyD / 2 - 0.014;
  g.add(board(w, top, d, biwaPine, 0, h - top / 2, 0, 0.004, "x"));
  g.add(board(w - 0.02, t, bodyD, biwaPine, 0, body0 + t / 2, 0, 0.003, "x"));
  for (const sx of [-1, 1])
    g.add(
      board(
        t,
        body1 - body0,
        bodyD,
        biwaPine,
        sx * (w / 2 - 0.01 - t / 2),
        (body0 + body1) / 2,
        0,
        0.003,
        "y",
      ),
    );
  g.add(
    board(
      w - 0.04,
      body1 - body0,
      0.012,
      darkGap,
      0,
      (body0 + body1) / 2,
      -bodyD / 2 + 0.006,
      0.001,
    ),
  );

  // front layout: door | drawers | door, with stiles between
  const inner0 = -w / 2 + 0.01 + t;
  const inner1 = w / 2 - 0.01 - t;
  const doorW = (inner1 - inner0) * 0.335;
  const stile = 0.025;
  const drawers0 = inner0 + doorW + stile;
  const drawers1 = inner1 - doorW - stile;
  const fy0 = body0 + t;
  const fy1 = body1;
  for (const x of [drawers0 - stile / 2, drawers1 + stile / 2]) {
    g.add(board(stile, fy1 - fy0, bodyD - 0.01, biwaPine, x, (fy0 + fy1) / 2, 0, 0.002, "y"));
  }
  // middle: three drawers (sideboard), or one drawer under two open niches (TV unit)
  const dh = (fy1 - fy0) / 3;
  if (center === "niches") {
    const mx = (drawers0 + drawers1) / 2;
    const mw = drawers1 - drawers0;
    for (const y of [fy0 + dh, fy0 + 2 * dh]) {
      g.add(board(mw, 0.02, bodyD - 0.03, biwaPine, mx, y + 0.01, -0.005, 0.002, "x")); // shelves
    }
    // the niches' back, in pine (the dark back is behind the doors only)
    g.add(
      board(
        mw,
        fy1 - fy0 - dh,
        0.012,
        biwaPine,
        mx,
        fy0 + dh + (fy1 - fy0 - dh) / 2,
        -bodyD / 2 + 0.014,
        0.001,
        "x",
      ),
    );
  }
  const pull = 0.014; // depth of the wooden bar pulls
  for (let i = 0; i < (center === "niches" ? 1 : 3); i++) {
    const y = fy0 + dh * (i + 0.5);
    g.add(
      board(
        drawers1 - drawers0 - 0.006,
        dh - 0.006,
        0.02,
        biwaPine,
        (drawers0 + drawers1) / 2,
        y,
        front - 0.01,
        0.002,
        "x",
      ),
    );
    // horizontal wooden bar pull, a little above the middle
    g.add(
      board(0.12, 0.016, pull, biwaPull, (drawers0 + drawers1) / 2, y, front + pull / 2, 0.003),
    );
  }
  // doors: frame + checkerboard of horizontal slats over a dark back
  for (const [x0, x1, handleX] of [
    [inner0, inner0 + doorW, 1],
    [drawers1 + stile, inner1, -1],
  ]) {
    const cxDoor = (x0 + x1) / 2;
    const frame = 0.035;
    const dz = front - 0.012;
    g.add(board(x1 - x0 - 0.004, frame, 0.022, biwaPine, cxDoor, fy1 - frame / 2, dz, 0.002, "x"));
    g.add(board(x1 - x0 - 0.004, frame, 0.022, biwaPine, cxDoor, fy0 + frame / 2, dz, 0.002, "x"));
    for (const x of [x0 + frame / 2, x1 - frame / 2])
      g.add(
        board(frame, fy1 - fy0 - 2 * frame, 0.022, biwaPine, x, (fy0 + fy1) / 2, dz, 0.002, "y"),
      );
    // vertical wooden bar handle on the stile next to the drawers
    const hx = handleX > 0 ? x1 - frame / 2 : x0 + frame / 2;
    g.add(board(0.016, 0.12, pull, biwaPull, hx, (fy0 + fy1) / 2, dz + 0.011 + pull / 2, 0.003));
    const lx0 = x0 + frame;
    const lx1 = x1 - frame;
    const ly0 = fy0 + frame;
    const ly1 = fy1 - frame;
    g.add(board(lx1 - lx0, ly1 - ly0, 0.01, darkGap, cxDoor, (ly0 + ly1) / 2, dz - 0.008, 0.001));
    // brick bond on a 10-unit grid: slats 2 units long, a dark square under
    // the middle of every slat of the row above
    const u = (lx1 - lx0) / 10;
    const rows = Math.max(3, Math.round((ly1 - ly0) / (u * 1.4)));
    const ch = (ly1 - ly0) / rows;
    for (let j = 0; j < rows; j++) {
      const spans =
        j % 2 === 0
          ? [
              [1, 3],
              [4, 6],
              [7, 9],
            ]
          : [
              [0, 1.5],
              [2.5, 4.5],
              [5.5, 7.5],
              [8.5, 10],
            ];
      for (const [a, b] of spans) {
        g.add(
          board(
            (b - a) * u - 0.003,
            ch * 0.88,
            0.014,
            biwaPine,
            lx0 + ((a + b) / 2) * u,
            ly1 - ch * (j + 0.5),
            dz + 0.002 + (j % 2) * 0.002,
            0.002,
            "x",
          ),
        );
      }
    }
  }
  // splayed legs
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const topAt = v(sx * (w / 2 - 0.09), legH + 0.01, sz * (bodyD / 2 - 0.05));
      // lifted a little: the tilted leg's corners then stop at the floor
      const foot = v(sx * (w / 2 - 0.045), 0.007, sz * (bodyD / 2 - 0.03));
      g.add(bar(foot, topAt, 0.04, 0.04, biwaPine, 0.004));
    }
  }
  return g;
}

/**
 * NORWAY: solid honey oiled oak, square corner posts as legs, a rail under
 * the top and one at the base, square pegs at the joints, iron bail pulls.
 * Sideboard: three drawers over three framed doors with latch handles,
 * L 150 × P 50 × H 88 cm. TV unit: an open niche over three drawers,
 * L 150 × P 50 × H 60 cm.
 */
export function norwaySideboard(p: Product, tv = false): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = p;
  const post = 0.065;
  const top = 0.035;
  const apron = tv ? 0.055 : 0.06; // rail under the top
  const bottom = tv ? 0.1 : 0.085; // underside of the carcass
  const baseRail = tv ? 0.055 : 0.06;
  const drawerH = tv ? 0.15 : 0.17;
  g.add(board(w, top, d, norwayOak, 0, h - top / 2, 0, 0.004, "x"));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(
        board(
          post,
          h - top,
          post,
          norwayOak,
          sx * (w / 2 - post / 2),
          (h - top) / 2,
          sz * (d / 2 - post / 2),
          0.004,
          "y",
        ),
      );
    }
    // side panel between the posts
    g.add(
      board(
        0.02,
        h - top - bottom - 0.02,
        d - 2 * post,
        norwayOak,
        sx * (w / 2 - post / 2),
        (h - top + bottom) / 2,
        0,
        0.002,
        "y",
      ),
    );
  }
  const inner = w - 2 * post;
  const front = d / 2 - 0.034; // pulls and latches stay within the depth
  const y0 = bottom;
  const y1 = h - top;
  // base rail, rail under the top, back and floor
  g.add(board(inner, baseRail, 0.025, norwayOak, 0, y0 + baseRail / 2, front - 0.005, 0.002, "x"));
  g.add(board(inner, apron, 0.025, norwayOak, 0, y1 - apron / 2, front - 0.005, 0.002, "x"));
  const back = tv ? norwayShade : norwayOak;
  g.add(board(inner, y1 - y0, 0.012, back, 0, (y0 + y1) / 2, -d / 2 + 0.03, 0.001, "x"));
  g.add(board(inner, 0.02, d - 0.05, norwayOak, 0, y0 + 0.01, 0, 0.001, "x"));
  const col = inner / 3;
  const face = front + 0.011; // front face of drawers and doors
  const drawer = (x: number, y: number): void => {
    g.add(board(col - 0.008, drawerH - 0.008, 0.022, norwayOak, x, y, front, 0.002, "x"));
    // bail pull: back plate + a U handle hanging in front of it
    g.add(board(0.075, 0.04, 0.004, agedIron, x, y + 0.006, face + 0.002, 0.001));
    g.add(board(0.06, 0.008, 0.007, agedIron, x, y - 0.008, face + 0.0075, 0.002));
    for (const s of [-1, 1])
      g.add(board(0.007, 0.022, 0.007, agedIron, x + s * 0.0265, y, face + 0.0075, 0.002));
  };
  if (tv) {
    // TV unit: three drawers at the bottom, an open niche above them
    const dy = y0 + baseRail + drawerH / 2;
    for (let i = 0; i < 3; i++) drawer(-inner / 2 + col * (i + 0.5), dy);
    const mid = 0.04; // rail over the drawers, front of the niche floor
    const midY = y0 + baseRail + drawerH + mid / 2;
    g.add(board(inner, mid, 0.025, norwayOak, 0, midY, front - 0.005, 0.002, "x"));
    g.add(board(inner, 0.02, d - 0.05, norwayOak, 0, midY + mid / 2 - 0.01, 0, 0.002, "x"));
  } else {
    const drawerY = y1 - apron - drawerH / 2;
    const doorTop = y1 - apron - drawerH - 0.008;
    const doorBottom = y0 + baseRail;
    for (let i = 0; i < 3; i++) {
      const x = -inner / 2 + col * (i + 0.5);
      drawer(x, drawerY);
      // framed door: four rails, a raised panel in a dark groove, latch handle
      const dw = col - 0.008;
      const dh = doorTop - doorBottom;
      const dy = (doorTop + doorBottom) / 2;
      const rail = 0.05;
      g.add(board(dw, rail, 0.022, norwayOak, x, doorTop - rail / 2, front, 0.002, "x"));
      g.add(board(dw, rail, 0.022, norwayOak, x, doorBottom + rail / 2, front, 0.002, "x"));
      for (const s of [-1, 1])
        g.add(
          board(
            rail,
            dh - 2 * rail,
            0.022,
            norwayOak,
            x + s * (dw / 2 - rail / 2),
            dy,
            front,
            0.002,
          ),
        );
      g.add(
        board(dw - 2 * rail + 0.004, dh - 2 * rail + 0.004, 0.006, oakGroove, x, dy, front - 0.006),
      );
      g.add(
        board(
          dw - 2 * rail - 0.012,
          dh - 2 * rail - 0.012,
          0.016,
          norwayOak,
          x,
          dy,
          front - 0.004,
          0.006,
          "y",
        ),
      );
      const side = i === 0 ? 1 : -1; // handles near the meeting stiles
      const hx = x + side * (dw / 2 - 0.03);
      g.add(board(0.02, 0.075, 0.004, agedIron, hx, dy + 0.05, face + 0.002, 0.002));
      g.add(board(0.009, 0.035, 0.009, agedIron, hx, dy + 0.04, face + 0.0085, 0.003));
    }
  }
  // square pegs at the rail joints, on the front and the sides of the posts
  for (const sx of [-1, 1]) {
    for (const y of [y1 - apron / 2, y0 + baseRail / 2]) {
      g.add(board(0.011, 0.011, 0.004, oakPeg, sx * (w / 2 - post / 2), y, d / 2 - 0.0019, 0.001));
      for (const sz of [-1, 1])
        g.add(
          board(
            0.004,
            0.011,
            0.011,
            oakPeg,
            sx * (w / 2 - 0.0019),
            y,
            sz * (d / 2 - post / 2),
            0.001,
          ),
        );
    }
  }
  return g;
}

export const SIDEBOARD_BUILDERS: Record<string, (p: Product) => THREE.Group> = {
  "sideboard-biwa": (p) => biwa(p),
  "sideboard-norway": (p) => norwaySideboard(p),
  "tv-biwa": (p) => biwa(p, "niches"),
  "tv-norway": (p) => norwaySideboard(p, true),
};

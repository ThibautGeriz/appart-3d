/**
 * Kitchen sink: Franke KUBUS 2.0 KNG 120 (ref. 125.0748.925), Fragranite
 * "gris ardoise", undermount (sous-plan), 1.5 bowls, for an 80 cm cabinet.
 * https://www.franke.com/fr/fr/home-solutions/produits/evier-cuisine/product-detail-page.html/125.0748.925.html
 * Dimensions in meters, from the product sheet and Franke drawing
 * KNG 120-47-22 (20127772 rev. F): plan (DT), cut-out (CO), section (DF).
 */
export const KUBUS_2_KNG_120_URL =
  "https://www.franke.com/fr/fr/home-solutions/produits/evier-cuisine/product-detail-page.html/125.0748.925.html";

export const KUBUS_2_KNG_120 = {
  /** overall, along the worktop */
  length: 0.76,
  /** overall, wall → room */
  width: 0.46,
  /** bowl lengths, along the worktop (large, small) */
  bowls: [0.464, 0.214],
  /** bowl size wall → room */
  bowlWidth: 0.42,
  /**
   * overall height under the worktop: the sheet's 200 mm bowl depth, which
   * the DF section measures from the rim top to the outside of the bowl
   * floor (waste fittings excluded)
   */
  bowlDepth: 0.2,
  /** flange around the opening, at both ends and front / back (DT: 20) */
  rim: 0.02,
  /**
   * the divider stops below the rim: one 720 × 420 opening at the top, two
   * bowls below (top of the divider measured on the DF section, ~7 cm)
   */
  dividerDrop: 0.07,
  /** Fragranite thickness */
  wall: 0.012,
  /** corner radius, outside and in the bowls (DT: R10) */
  radius: 0.01,
  /** square drain cover side, both bowls (DT / photo: ~12.5 cm; 90 mm waste) */
  drainSize: 0.125,
  /** drain centre behind the bowl centre, towards the wall (DT: ~8 cm) */
  drainBack: 0.08,
};

export type SinkSpec = typeof KUBUS_2_KNG_120;

/**
 * Bowl openings along the sink length, centred on it: [start, end] offsets
 * from the sink centre, large bowl first. Equal rims at both ends, the
 * divider takes the rest (~4 cm). Pure.
 */
export function bowlSpans(spec: SinkSpec): [number, number][] {
  const divider =
    (spec.length - 2 * spec.rim - spec.bowls.reduce((a, b) => a + b, 0)) / (spec.bowls.length - 1);
  const spans: [number, number][] = [];
  let at = -spec.length / 2 + spec.rim;
  for (const b of spec.bowls) {
    spans.push([at, at + b]);
    at += b + divider;
  }
  return spans;
}

/**
 * Worktop cut-out along the sink length (CO: a single 720 mm opening over
 * both bowls, the divider sits below it), same frame as `bowlSpans`. Pure.
 */
export function cutOutSpans(spec: SinkSpec): [number, number][] {
  return [[-spec.length / 2 + spec.rim, spec.length / 2 - spec.rim]];
}

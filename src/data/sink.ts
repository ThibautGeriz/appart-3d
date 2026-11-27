/**
 * Kitchen sink: Franke KUBUS 2.0 KNG 120 (ref. 125.0748.925), Fragranite
 * "gris ardoise", undermount (sous-plan), 1.5 bowls, for an 80 cm cabinet.
 * https://www.franke.com/fr/fr/home-solutions/produits/evier-cuisine/product-detail-page.html/125.0748.925.html
 * Dimensions in meters, from the product sheet.
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
  bowlDepth: 0.2,
  /** Fragranite thickness */
  wall: 0.012,
  /** inner corner radius (Kubus: nearly square) */
  radius: 0.012,
};

export type SinkSpec = typeof KUBUS_2_KNG_120;

/**
 * Bowl openings along the sink length, centred on it: [start, end] offsets
 * from the sink centre, large bowl first. The rims around and between the
 * bowls are equal. Pure.
 */
export function bowlSpans(spec: SinkSpec): [number, number][] {
  const rim = (spec.length - spec.bowls.reduce((a, b) => a + b, 0)) / (spec.bowls.length + 1);
  const spans: [number, number][] = [];
  let at = -spec.length / 2 + rim;
  for (const b of spec.bowls) {
    spans.push([at, at + b]);
    at += b + rim;
  }
  return spans;
}

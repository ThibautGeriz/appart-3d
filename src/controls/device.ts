/** Touch detection — used to pick the input scheme and performance profile. */
export function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

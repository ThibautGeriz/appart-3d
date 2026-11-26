import * as THREE from "three";
import { APARTMENT_DEF } from "./data/apartment";
import { buildApartment } from "./apartment/build";
import { buildDimensions } from "./apartment/dimensions";
import { Player } from "./player/controller";
import { KeyboardMouseInput } from "./controls/keyboardMouse";
import { TouchInput } from "./controls/touch";
import { isTouchDevice } from "./controls/device";
import { createHud } from "./ui/hud";
import type { InputSource } from "./controls/types";

const container = document.getElementById("app") as HTMLElement;
const isTouch = isTouchDevice();

const renderer = new THREE.WebGLRenderer({
  antialias: !isTouch,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0d1117");
scene.add(new THREE.HemisphereLight("#ffffff", "#8b8b8b", 1.1));
const sun = new THREE.DirectionalLight("#fff5e6", 0.8);
sun.position.set(5, 10, 3);
scene.add(sun);

const apartment = buildApartment(APARTMENT_DEF);
scene.add(apartment.group);

// Dimension overlay ("cotes") — toggle with Tab or the HUD button
const dimensions = buildDimensions(APARTMENT_DEF);
dimensions.visible = false;
scene.add(dimensions);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
const player = new Player(APARTMENT_DEF.spawn);

const hud = createHud(container, isTouch);
const input: InputSource = isTouch
  ? new TouchInput(container, hud)
  : new KeyboardMouseInput(renderer.domElement);

if (isTouch) {
  // Fade the hint out once the user has had time to read it.
  setTimeout(() => (hud.hint.style.opacity = "0"), 6000);
} else {
  const onLockChange = () => (hud.hint.style.display = document.pointerLockElement ? "none" : "");
  document.addEventListener("pointerlockchange", onLockChange);
}

const toggleDimensions = () => {
  dimensions.visible = !dimensions.visible;
  hud.dimButton.classList.toggle("active", dimensions.visible);
};
window.addEventListener("keydown", (e) => {
  if (e.code === "Tab") {
    e.preventDefault(); // keep keyboard focus in the game
    toggleDimensions();
  }
});
hud.dimButton.addEventListener("click", toggleDimensions);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const timer = new THREE.Timer();
renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1); // clamp huge tab-switch deltas
  input.update(dt);
  player.update(dt, input.moveIntent(), input.consumeLook(), apartment.colliders);
  player.applyToCamera(camera);
  renderer.render(scene, camera);
});

import * as THREE from "three";
import { APARTMENT_DEF } from "./data/apartment";
import { buildApartment } from "./apartment/build";
import { buildDimensions } from "./apartment/dimensions";
import { Player } from "./player/controller";
import { KeyboardMouseInput } from "./controls/keyboardMouse";
import { TouchInput } from "./controls/touch";
import { isTouchDevice } from "./controls/device";
import { createHud } from "./ui/hud";
import { bindSunControls, defaultHour } from "./ui/sunControls";
import { createLighting } from "./lighting/environment";
import { buildFixtures } from "./lighting/fixtures";
import { applyRoomMask } from "./lighting/roomMask";
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
const lighting = createLighting(scene, renderer, APARTMENT_DEF, isTouch);
const fixtures = buildFixtures(APARTMENT_DEF, isTouch);
scene.add(fixtures.group);

const apartment = buildApartment(APARTMENT_DEF);
scene.add(apartment.group);

// Dimension overlay ("cotes") — toggle with Tab or the HUD button
const dimensions = buildDimensions(APARTMENT_DEF);
dimensions.visible = false;
scene.add(dimensions);
// Interior lights stop at their room's walls
scene.traverse((o) => o instanceof THREE.Mesh && applyRoomMask(o.material));

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const player = new Player(APARTMENT_DEF.spawn);

const hud = createHud(container, isTouch);
const now = new Date();
bindSunControls(hud, lighting, { month: now.getMonth(), hour: defaultHour(now) });
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

let lightsOn = true;
const toggleLights = () => {
  lightsOn = !lightsOn;
  fixtures.setOn(lightsOn);
  hud.lightButton.classList.toggle("active", lightsOn);
};
hud.lightButton.addEventListener("click", toggleLights);
window.addEventListener("keydown", (e) => e.code === "KeyL" && toggleLights());

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
  fixtures.update(camera.position.x, camera.position.z);
  renderer.render(scene, camera);
});

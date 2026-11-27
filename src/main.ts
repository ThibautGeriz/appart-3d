import * as THREE from "three";
import { APARTMENT_DEF } from "./data/apartment";
import { buildApartment } from "./apartment/build";
import { buildDimensions } from "./apartment/dimensions";
import { Player } from "./player/controller";
import { KeyboardMouseInput } from "./controls/keyboardMouse";
import { TouchInput } from "./controls/touch";
import { isTouchDevice } from "./controls/device";
import { createHud } from "./ui/hud";
import { createFpsCounter } from "./ui/fps";
import { bindSunControls, defaultHour } from "./ui/sunControls";
import { createLighting } from "./lighting/environment";
import { createPipeline } from "./lighting/postprocessing";
import { usePhysicalSurfaces } from "./apartment/textures";
import { buildFixtures } from "./lighting/fixtures";
import { applyRoomMask } from "./lighting/roomMask";
import type { InputSource } from "./controls/types";
import { createClickToMove } from "./player/clickToMove";
import { apartmentBounds } from "./apartment/plan";
import { cameraObstacles } from "./player/camera";
import { loadModels } from "./apartment/models";
import { createFurniture, isWallBed } from "./apartment/furniture";
import { createFurniturePanel } from "./ui/furniturePanel";

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
usePhysicalSurfaces(!isTouch); // PBR walls and floors on desktop, Lambert on phones
const lighting = createLighting(scene, renderer, APARTMENT_DEF, isTouch);
const fixtures = buildFixtures(APARTMENT_DEF, isTouch);
scene.add(fixtures.group);

const apartment = buildApartment(APARTMENT_DEF);
scene.add(apartment.group);

// Dimension overlay ("cotes") — toggle with Tab or the HUD button
const dimensions = buildDimensions(APARTMENT_DEF);
dimensions.visible = false;
scene.add(dimensions);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const pipeline = createPipeline(renderer, scene, camera, !isTouch); // ambient occlusion on desktop
const player = new Player(APARTMENT_DEF.spawn);
scene.add(player.avatar);
// Interior lights stop at their room's walls; again once the GLB models are in
const maskLights = () =>
  scene.traverse((o) => o instanceof THREE.Mesh && [o.material].flat().forEach(applyRoomMask));
maskLights();
void loadModels(apartment.models, player.avatar, isTouch).then(() => {
  maskLights();
  renderer.shadowMap.needsUpdate = true; // static shadows: include the models
});
const obstacles = cameraObstacles(APARTMENT_DEF); // keeps the third-person camera inside

const hud = createHud(container, isTouch);
const now = new Date();
bindSunControls(hud, lighting, { month: now.getMonth(), hour: defaultHour(now) });
const input: InputSource = isTouch
  ? new TouchInput(container, hud)
  : new KeyboardMouseInput(renderer.domElement);

// Fade the hint out once the user has had time to read it.
setTimeout(() => (hud.hint.style.opacity = "0"), 8000);

// Click / tap to walk there (WoW click-to-move)
const clickToMove = createClickToMove({
  scene,
  camera,
  targets: apartment.group,
  colliders: apartment.colliders,
  bounds: apartmentBounds(APARTMENT_DEF),
  radius: player.radius,
  // a click on the wall bed opens / closes it instead of walking there
  interact: (hit) => {
    if (!isWallBed(hit.object)) return false;
    furniture.toggleBed();
    return true;
  },
});

// Movable furniture (catalog products), switched from the toolbar
const furniture = createFurniture(APARTMENT_DEF, apartment.colliders, isTouch);
apartment.group.add(furniture.group); // clickable like the rest
furniture.onChange(() => {
  clickToMove.refresh();
  maskLights();
  renderer.shadowMap.needsUpdate = true;
});
createFurniturePanel(container, APARTMENT_DEF, furniture);
input.onClick((x, y) => clickToMove.goTo(x, y, player));

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
  lighting.setLamps(lightsOn);
  hud.lightButton.classList.toggle("active", lightsOn);
};
hud.lightButton.addEventListener("click", toggleLights);
window.addEventListener("keydown", (e) => e.code === "KeyL" && toggleLights());

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  pipeline.setSize(window.innerWidth, window.innerHeight);
});

const fpsCounter = createFpsCounter(container);
const timer = new THREE.Timer();
renderer.setAnimationLoop(() => {
  timer.update();
  fpsCounter.update(timer.getDelta());
  const dt = Math.min(timer.getDelta(), 0.1); // clamp huge tab-switch deltas
  input.update(dt);
  let intent = input.moveIntent();
  const look = input.consumeLook();
  const auto = clickToMove.update(dt, player, intent, input.looking());
  if (auto) {
    intent = auto.intent;
    look.yaw += auto.turn;
  }
  // the wall bed folding: static shadows are redrawn only while it moves
  if (furniture.update(dt)) renderer.shadowMap.needsUpdate = true;
  player.update(dt, intent, look, apartment.colliders);
  player.applyToCamera(camera, obstacles);
  fixtures.update(camera.position.x, camera.position.z);
  pipeline.render();
});

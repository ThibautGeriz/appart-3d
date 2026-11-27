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
import { perfProbe } from "./ui/perfProbe";
import { bindSunControls, defaultHour } from "./ui/sunControls";
import { createLighting } from "./lighting/environment";
import { createPipeline } from "./lighting/postprocessing";
import { usePhysicalSurfaces } from "./apartment/textures";
import { initKtx2, mapsLoaded } from "./apartment/ktx2";
import { buildFixtures } from "./lighting/fixtures";
import { applyRoomMask } from "./lighting/roomMask";
import { loadLightmap } from "./lighting/bakedLight";
import { createProbes } from "./lighting/probes";
import { buildDressing } from "./apartment/dressing";
import type { InputSource } from "./controls/types";
import { createClickToMove } from "./player/clickToMove";
import { apartmentBounds } from "./apartment/plan";
import { createRoomCuller } from "./apartment/rooms";
import { roomAt } from "./apartment/furnishing";
import { cameraObstacles } from "./player/camera";
import { loadModels } from "./apartment/models";
import { createFurniture, isSlidingSofa, isWallBed } from "./apartment/furniture";
import { createFurniturePanel } from "./ui/furniturePanel";
import { attachFurnitureDimensions } from "./apartment/furnitureDimensions";

const container = document.getElementById("app") as HTMLElement;
const isTouch = isTouchDevice();

const renderer = new THREE.WebGLRenderer({
  antialias: !isTouch,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);
initKtx2(renderer); // compressed GPU textures (surfaces and models)

const scene = new THREE.Scene();
usePhysicalSurfaces(!isTouch); // PBR walls and floors on desktop, Lambert on phones
const lighting = createLighting(scene, renderer, APARTMENT_DEF, isTouch);
const fixtures = buildFixtures(APARTMENT_DEF, isTouch);
scene.add(fixtures.group);

const apartment = buildApartment(APARTMENT_DEF, { lightmap: loadLightmap(APARTMENT_DEF) });
scene.add(apartment.group);
// skirting boards, door frames, sills, switches and sockets, curtains
apartment.group.add(buildDressing(APARTMENT_DEF, APARTMENT_DEF.outlets));

// Dimension overlay ("cotes") — toggle with Tab or the HUD button
const dimensions = buildDimensions(APARTMENT_DEF);
dimensions.visible = false;
scene.add(dimensions);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const pipeline = createPipeline(renderer, scene, camera, !isTouch); // ambient occlusion on desktop
pipeline.excludeFromAO(dimensions); // its labels would turn black
const player = new Player(APARTMENT_DEF.spawn);
scene.add(player.avatar);
// Interior lights stop at their room's walls; again once the GLB models are in
const maskLights = () =>
  scene.traverse((o) => o instanceof THREE.Mesh && [o.material].flat().forEach(applyRoomMask));
maskLights();
// Rooms you cannot see from where the camera stands are not drawn, and their
// models load the first time they can be seen
const culler = createRoomCuller(APARTMENT_DEF);
const roomOfObject = (o: THREE.Object3D) => {
  const p = o.getWorldPosition(new THREE.Vector3());
  return roomAt(APARTMENT_DEF, p.x, p.z);
};
// Reflection probes per room (the avatar walks between rooms: it keeps the global light);
// a capture sees every room, culled or not
const probes = createProbes(renderer, scene, APARTMENT_DEF, {
  isTouch,
  hide: [player.avatar, dimensions],
  around: culler.withAll,
});
loadModels(apartment.models, player.avatar, isTouch, culler, roomOfObject, (rooms) => {
  maskLights();
  player.avatar.traverse((o) => (o.userData.noProbe = true));
  renderer.shadowMap.needsUpdate = true; // static shadows: include the models
  probes.request(rooms); // the rooms whose models just came in
});
// the surfaces' KTX2 scans load after the first captures: capture them again
void mapsLoaded().then(() => probes.request());
// the probes see the light: capture again when the time of day changes
const setTime = lighting.setTime.bind(lighting);
lighting.setTime = (state) => {
  setTime(state);
  probes.request();
};
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
  // a click on the wall bed opens / closes it, on a sofa with sliding backs
  // slides them back / forward, instead of walking there
  interact: (hit) => {
    if (isWallBed(hit.object)) {
      furniture.toggleBed();
      return true;
    }
    if (isSlidingSofa(hit.object)) {
      furniture.toggleSofaBacks();
      return true;
    }
    return false;
  },
});

// Movable furniture (catalog products), switched from the toolbar
const furniture = createFurniture(APARTMENT_DEF, apartment.colliders, isTouch, culler);
apartment.group.add(furniture.group); // clickable like the rest
furniture.onChange((rooms) => {
  clickToMove.refresh();
  maskLights();
  renderer.shadowMap.needsUpdate = true;
  probes.request(rooms);
});
createFurniturePanel(container, APARTMENT_DEF, furniture);
attachFurnitureDimensions(dimensions, furniture, APARTMENT_DEF); // the pieces' cotes, with the walls'
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
  probes.request();
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
const probe = perfProbe(player, renderer); // ?perf: the browser performance test
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
  // another set of rooms in view: static shadows are redrawn for what is drawn
  if (culler.update(camera.position.x, camera.position.z)) renderer.shadowMap.needsUpdate = true;
  pipeline.render();
  probe();
});

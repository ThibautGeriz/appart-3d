import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { defaultColors } from "../apartment/furniture";
import { initKtx2 } from "../apartment/ktx2";
import { loadFile, prepare } from "../apartment/models";

/**
 * Pictures of the catalog's GLB models: thumbnails drawn one after the other
 * by a single renderer (one WebGL context for the whole page), and a 3D view
 * to turn a model around. Fabrics in their first colour, as the app shows them.
 */

const THUMB = 320; // px (shown at 96–160 CSS px)
const colors = defaultColors();

/** A copy of the model, prepared and tinted like in the app. */
async function model(file: string): Promise<THREE.Object3D> {
  const m = prepare((await loadFile(file)).clone(), false);
  m.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    for (const mat of [o.material].flat() as THREE.Material[]) {
      const color = colors[mat.name];
      if (color && "color" in mat) (mat.color as THREE.Color).set(color);
    }
  });
  return m;
}

function lights(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const sun = new THREE.DirectionalLight("#ffffff", 1.6);
  sun.position.set(2, 4, 3);
  scene.add(sun, new THREE.HemisphereLight("#ffffff", "#bbb6ad", 0.6));
}

/** Frame the model from the front-left, slightly above (models face +z). */
function frame(camera: THREE.PerspectiveCamera, object: THREE.Object3D): THREE.Vector3 {
  const sphere = new THREE.Box3().setFromObject(object).getBoundingSphere(new THREE.Sphere());
  const distance = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.05;
  const dir = new THREE.Vector3(-0.55, 0.45, 1).normalize();
  camera.position.copy(sphere.center).addScaledVector(dir, distance);
  camera.near = distance / 50;
  camera.far = distance * 10;
  camera.updateProjectionMatrix();
  camera.lookAt(sphere.center);
  return sphere.center;
}

export interface Previews {
  /** a picture of the model (PNG data URL), queued behind the others */
  thumbnail(file: string): Promise<string>;
  /** the model in 3D, turned with the mouse / a finger; returns a cleanup */
  open(file: string, host: HTMLElement): Promise<{ triangles: number; close(): void }>;
}

export function createPreviews(): Previews {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(THUMB, THUMB, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  initKtx2(renderer); // the models' textures are KTX2
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f4f1ec");
  lights(scene, renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

  let queue = Promise.resolve();
  const thumbnail = (file: string) => {
    const shot = queue.then(async () => {
      const m = await model(file);
      scene.add(m);
      frame(camera, m);
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL("image/png");
      scene.remove(m);
      return url;
    });
    queue = shot.then(
      () => undefined,
      () => undefined,
    );
    return shot;
  };

  const open = async (file: string, host: HTMLElement) => {
    const view = new THREE.WebGLRenderer({ antialias: true });
    view.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    view.toneMapping = THREE.ACESFilmicToneMapping;
    host.replaceChildren(view.domElement);
    const stage = new THREE.Scene();
    stage.background = new THREE.Color("#f4f1ec");
    lights(stage, view);
    const m = await model(file);
    stage.add(m);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    const target = frame(cam, m);
    const controls = new OrbitControls(cam, view.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      view.setSize(w, h);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    view.setAnimationLoop(() => {
      controls.update();
      view.render(stage, cam);
    });
    let triangles = 0;
    m.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const g = o.geometry as THREE.BufferGeometry;
      const n = (g.index ? g.index.count : g.getAttribute("position").count) / 3;
      triangles += o instanceof THREE.InstancedMesh ? n * o.count : n;
    });
    return {
      triangles,
      close() {
        observer.disconnect();
        view.setAnimationLoop(null);
        controls.dispose();
        view.dispose();
        view.forceContextLoss();
        host.replaceChildren();
      },
    };
  };

  return { thumbnail, open };
}

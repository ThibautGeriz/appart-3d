import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { loadFile, prepare } from "../apartment/models";
import { inspectModel, type ModelReport } from "./inspect";
import { modelSources, type ModelSource } from "./sources";

/**
 * Dev-only turntable for one shipped model (models/<file>.glb, exactly what
 * the app loads), to compare it with its product page — see
 * .claude/skills/improve-model. Query parameters:
 *   model=<file>   e.g. toilet, table-valmo-180 (default: list them all)
 *   view=front|side|back|top|iso   bg=ffffff   grid=0 (hide the 10 cm grid)
 * Orthographic for front/side/back/top so proportions match product drawings.
 */
declare global {
  interface Window {
    __viewer?: {
      models: ModelSource[];
      model?: ModelSource & { view: string; report: ModelReport };
      error?: string;
      ready: boolean;
    };
  }
}

const params = new URLSearchParams(location.search);
const view = params.get("view") ?? "iso";
const info = document.getElementById("info") as HTMLElement;
const models = modelSources();
const source = models.find((m) => m.file === params.get("model"));
window.__viewer = { models, ready: false };

if (!source) {
  info.textContent = `?model=<file>&view=front|side|back|top|iso\n\n${models
    .map((m) => `${m.file.padEnd(28)} ${m.url ?? "(no source)"}`)
    .join("\n")}`;
  window.__viewer.ready = true;
} else {
  void show(source);
}

async function show(source: ModelSource): Promise<void> {
  let model: THREE.Object3D;
  try {
    model = prepare((await loadFile(source.file)).clone(), false);
  } catch (e) {
    info.textContent = String(e);
    window.__viewer = { models, error: String(e), ready: true };
    return;
  }
  const report = inspectModel(model);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(`#${params.get("bg") ?? "ffffff"}`);
  scene.add(model);
  // neutral studio light so colors read like a product photo
  scene.add(new THREE.HemisphereLight("#ffffff", "#d8d8d8", 1.6));
  const key = new THREE.DirectionalLight("#ffffff", 1.4);
  key.position.set(1.5, 3, 2.5);
  scene.add(key);
  if (params.get("grid") !== "0") {
    const grid = new THREE.GridHelper(4, 40, "#9aa0a6", "#d5d8db"); // 10 cm cells
    grid.position.y = 0.0005;
    scene.add(grid);
  }

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = Math.max(...box.getSize(new THREE.Vector3()).toArray());
  const aspect = window.innerWidth / window.innerHeight;
  const half = size * 0.65;
  const ortho = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.01, 50);
  const persp = new THREE.PerspectiveCamera(35, aspect, 0.01, 50);
  const dirs: Record<string, [number, number, number]> = {
    front: [0, 0, 1],
    back: [0, 0, -1],
    side: [1, 0, 0],
    top: [0, 1, 0.0001],
    iso: [1, 0.8, 1.4],
  };
  const camera = view in dirs && view !== "iso" ? ortho : persp;
  const dir = new THREE.Vector3(...(dirs[view] ?? dirs.iso)).normalize();
  camera.position.copy(center).addScaledVector(dir, size * 3.2);
  camera.lookAt(center);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(center);

  const { w, d, h } = report.size;
  const e = source.expected;
  info.textContent =
    `${source.name} (${source.file}) — ${view}\n` +
    `bbox     L ${w} × P ${d} × H ${h} cm\n` +
    `attendu  L ${e.w} × P ${e.d} × H ${e.h} cm` +
    (source.url ? `\n${source.url}` : "");

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
  window.__viewer = { models, model: { ...source, view, report }, ready: true };
}

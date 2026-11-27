import * as THREE from "three";
import type { ApartmentDef } from "../data/apartment";
import { roomAt } from "../apartment/furnishing";
import { roomOf } from "../apartment/plan";
import { applyRoomMask, setProbe } from "./roomMask";

/**
 * Reflection probes, one per room: a cube capture of the room (lightmapped
 * walls, furniture, the windows, the sky behind them) from its middle at
 * 1.4 m, prefiltered (PMREM). Every PBR mesh in the room reflects it,
 * box-projected onto the room so a tap reflects the real bathroom and the
 * floor the real windows; it also gives the furniture its indirect light
 * (dim in a corner, bright by a window). Captured again when the furniture
 * or the light changes (debounced).
 */

interface Probe {
  min: THREE.Vector3;
  max: THREE.Vector3;
  position: THREE.Vector3;
  texture: THREE.Texture | null;
}

export interface Probes {
  /** capture these rooms again soon (furniture came in), or all of them (time of day, lamps) */
  request(rooms?: Iterable<string>): void;
}

const CAPTURE_HEIGHT = 1.4;
const MAP_SLOTS = ["map", "normalMap", "roughnessMap"] as const;

/** Rooms (by name) with their box and probe position: the middle of their largest area. Pure. */
export function probeRooms(
  def: ApartmentDef,
): Map<string, { min: number[]; max: number[]; position: number[] }> {
  const rooms = new Map<
    string,
    { min: number[]; max: number[]; position: number[]; largest: number }
  >();
  def.areas.forEach((area, i) => {
    if (area.outdoor) return;
    const name = roomOf(area, i);
    const [x0, z0, x1, z1] = area.rect;
    const r = rooms.get(name) ?? {
      min: [x0, 0, z0],
      max: [x1, def.wallHeight, z1],
      position: [0, 0, 0],
      largest: 0,
    };
    r.min = [Math.min(r.min[0], x0), 0, Math.min(r.min[2], z0)];
    r.max = [Math.max(r.max[0], x1), def.wallHeight, Math.max(r.max[2], z1)];
    const size = (x1 - x0) * (z1 - z0);
    if (size > r.largest) {
      r.largest = size;
      r.position = [(x0 + x1) / 2, CAPTURE_HEIGHT, (z0 + z1) / 2];
    }
    rooms.set(name, r);
  });
  return new Map(
    [...rooms].map(([name, { min, max, position }]) => [name, { min, max, position }]),
  );
}

export function createProbes(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  def: ApartmentDef,
  options: {
    isTouch: boolean;
    hide?: THREE.Object3D[];
    /** runs each capture (the room culler shows every room for it) */
    around?: (capture: () => void) => void;
  },
): Probes {
  const probes = new Map<string, Probe>();
  for (const [name, r] of probeRooms(def)) {
    probes.set(name, {
      min: new THREE.Vector3(...r.min),
      max: new THREE.Vector3(...r.max),
      position: new THREE.Vector3(...r.position),
      texture: null,
    });
  }
  const target = new THREE.WebGLCubeRenderTarget(options.isTouch ? 64 : 128, {
    type: THREE.HalfFloatType,
  });
  const camera = new THREE.CubeCamera(0.05, 60, target);
  const pmrem = new THREE.PMREMGenerator(renderer);
  /** per source material and room, the copy carrying that room's probe */
  const copies = new Map<THREE.Material, Map<string, THREE.MeshStandardMaterial>>();
  const roomOfMesh = new WeakMap<THREE.Mesh, string>();
  const box = new THREE.Box3();
  const centre = new THREE.Vector3();

  const meshRoom = (mesh: THREE.Mesh): string | undefined => {
    if (mesh.userData.room) {
      const named = mesh.userData.room as string;
      return probes.has(named) ? named : undefined; // outdoors (balcony): no probe
    }
    let room = roomOfMesh.get(mesh);
    if (room === undefined) {
      box.setFromObject(mesh).getCenter(centre);
      room = roomAt(def, centre.x, centre.z);
      roomOfMesh.set(mesh, room);
    }
    return probes.has(room) ? room : undefined;
  };

  const materialFor = (source: THREE.MeshStandardMaterial, room: string) => {
    let byRoom = copies.get(source);
    if (!byRoom) copies.set(source, (byRoom = new Map()));
    let m = byRoom.get(room);
    if (!m) {
      m = source.clone();
      m.userData = { ...source.userData, roomMask: false, probeSource: source };
      applyRoomMask(m);
      byRoom.set(room, m);
    }
    return m;
  };

  const assign = () => {
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.noProbe) return;
      const room = meshRoom(o);
      if (!room) return;
      const probe = probes.get(room)!;
      if (!probe.texture) return;
      const swap = (m: THREE.Material) => {
        if (!(m instanceof THREE.MeshStandardMaterial) || m.transparent) return m;
        const source = (m.userData.probeSource as THREE.MeshStandardMaterial | undefined) ?? m;
        const copy = materialFor(source, room);
        // scans arrive after the copy was made (KTX2, loaded asynchronously)
        if (MAP_SLOTS.some((slot) => copy[slot] !== source[slot])) {
          for (const slot of MAP_SLOTS) copy[slot] = source[slot];
          copy.needsUpdate = true;
        }
        setProbe(copy, probe.texture!, probe.min, probe.max, probe.position);
        return copy;
      };
      o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
    });
  };

  /** rooms to capture at the next one (all: null) */
  let pending: Set<string> | null = new Set();
  const capture = () => {
    const rooms = pending;
    pending = new Set();
    const hidden = (options.hide ?? []).filter((o) => o.visible);
    for (const o of hidden) o.visible = false;
    const draw = () => {
      for (const [name, probe] of probes) {
        if (rooms && !rooms.has(name)) continue;
        camera.position.copy(probe.position);
        camera.update(renderer, scene);
        const env = pmrem.fromCubemap(target.texture);
        probe.texture?.dispose();
        probe.texture = env.texture;
      }
    };
    if (options.around) options.around(draw);
    else draw();
    for (const o of hidden) o.visible = true;
    assign();
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    request(rooms) {
      if (!rooms) pending = null;
      else if (pending) for (const r of rooms) pending.add(r);
      if (pending?.size === 0) return;
      clearTimeout(timer);
      timer = setTimeout(capture, 250);
    },
  };
}

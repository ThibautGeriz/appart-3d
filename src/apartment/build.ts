import * as THREE from "three";
import type { ApartmentDef } from "../data/apartment";
import { wallCollider } from "./plan";
import type { Collider } from "../player/movement";

export interface BuiltApartment {
  group: THREE.Group;
  colliders: Collider[];
}

/** Build the apartment scene graph and colliders from the layout data. */
export function buildApartment(def: ApartmentDef): BuiltApartment {
  const group = new THREE.Group();
  const colliders: Collider[] = [];

  const { width, depth, wallHeight } = def;

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshLambertMaterial({ color: def.floorColor }),
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshLambertMaterial({ color: def.ceilingColor }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallHeight;
  group.add(ceiling);

  // Walls
  const wallMaterial = new THREE.MeshLambertMaterial({ color: def.wallColor });
  for (const wall of def.walls) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.w, wallHeight, wall.d), wallMaterial);
    mesh.position.set(wall.x, wallHeight / 2, wall.z);
    group.add(mesh);
    colliders.push(wallCollider(wall));
  }

  // Furniture
  for (const item of def.furniture) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(item.w, item.h, item.d),
      new THREE.MeshLambertMaterial({ color: item.color }),
    );
    mesh.position.set(item.x, item.h / 2, item.z);
    group.add(mesh);
    if (item.solid !== false) {
      colliders.push({
        minX: item.x - item.w / 2,
        maxX: item.x + item.w / 2,
        minZ: item.z - item.d / 2,
        maxZ: item.z + item.d / 2,
      });
    }
  }

  // Decor (windows…)
  for (const deco of def.decor) {
    const material = new THREE.MeshLambertMaterial({
      color: deco.color,
      transparent: (deco.opacity ?? 1) < 1,
      opacity: deco.opacity ?? 1,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(deco.w, deco.h, deco.d), material);
    mesh.position.set(deco.x, deco.y, deco.z);
    group.add(mesh);
  }

  return { group, colliders };
}

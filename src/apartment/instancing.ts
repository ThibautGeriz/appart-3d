import * as THREE from "three";

/**
 * Several copies of one model drawn as InstancedMeshes: one draw call per
 * sub-mesh for all the copies (the six dining chairs cost what one costs).
 * `transforms` place each copy (world matrices, the model's root at identity).
 * Raycasting, shadows and frustum culling work as with plain meshes.
 */
export function instanced(model: THREE.Object3D, transforms: THREE.Matrix4[]): THREE.Group {
  const group = new THREE.Group();
  group.name = `${model.name || "model"} ×${transforms.length}`;
  model.updateMatrixWorld(true);
  const rootInverse = model.matrixWorld.clone().invert();
  const local = new THREE.Matrix4();
  const world = new THREE.Matrix4();
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    // the mesh's transform inside the model (relative to its root)
    local.multiplyMatrices(rootInverse, o.matrixWorld);
    const mesh = new THREE.InstancedMesh(o.geometry, o.material, transforms.length);
    mesh.name = o.name;
    transforms.forEach((t, i) => mesh.setMatrixAt(i, world.multiplyMatrices(t, local)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = o.castShadow;
    mesh.receiveShadow = o.receiveShadow;
    mesh.computeBoundingSphere(); // covers every copy, for frustum culling
    group.add(mesh);
  });
  return group;
}

/** Matrix of a copy standing at (x, y, z), turned by `rotationY`. */
export function placementMatrix(x: number, y: number, z: number, rotationY: number): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY),
    new THREE.Vector3(1, 1, 1),
  );
}

/** Group items by a key (product + room), keeping the first-seen order. Pure. */
export function groupBy<T>(items: T[], key: (item: T) => string): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return [...groups.values()];
}

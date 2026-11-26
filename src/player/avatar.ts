import * as THREE from "three";

/**
 * Simple mannequin shown in third person: body, head, and a dark visor so
 * the facing direction reads at a glance. Local origin at the feet, facing -z.
 */
export function createAvatar(): THREE.Group {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: "#d7d9dc" });
  const clothes = new THREE.MeshLambertMaterial({ color: "#56677a" });
  const visor = new THREE.MeshLambertMaterial({ color: "#1d2329" });

  // capsule from the floor to the shoulders (1.44 m), head right on top
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 1.04, 6, 16), clothes);
  body.position.y = 0.19 + 1.04 / 2 + 0.02;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), skin);
  head.position.y = 1.55;
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), visor);
  eyes.position.set(0, 1.57, -0.1);
  group.add(body, head, eyes);
  group.visible = false;
  return group;
}

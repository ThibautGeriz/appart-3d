import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { APARTMENT_DEF } from "../data/apartment";
import { createRoomCuller, roomGraph, visibleRooms } from "../apartment/rooms";
import { groupBy, instanced, placementMatrix } from "../apartment/instancing";

const graph = roomGraph(APARTMENT_DEF);
const links = (room: string) => [...(graph.get(room) ?? [])].sort();

describe("room graph (openings of the plan)", () => {
  it("links rooms through their doors, passages and windows", () => {
    expect(links("Entrée")).toEqual(["Dégagement", "SdB", "Séjour / Cuisine"].sort());
    expect(links("Séjour / Cuisine")).toEqual(
      expect.arrayContaining(["Entrée", "Balcon", "Cellier"]),
    );
    expect(links("Dégagement")).toEqual(
      expect.arrayContaining(["Bureau", "Chambre", "WC", "Entrée"]),
    );
    expect(links("Bureau")).toEqual(expect.arrayContaining(["Dégagement", "Balcon"]));
  });

  it("has every room as a node", () => {
    for (const room of ["Cellier", "SdB", "WC", "Balcon", "Chambre", "Bureau"]) {
      expect(graph.has(room), room).toBe(true);
    }
  });

  it("hides the séjour from the bedroom (three doorways away)", () => {
    const seen = visibleRooms(graph, "Chambre");
    expect(seen.has("Dégagement")).toBe(true);
    expect(seen.has("Entrée")).toBe(true);
    expect(seen.has("Séjour / Cuisine")).toBe(false);
    expect(seen.has("Cellier")).toBe(false);
  });

  it("hides the bedroom from the séjour", () => {
    const seen = visibleRooms(graph, "Séjour / Cuisine");
    expect(seen.has("Entrée")).toBe(true);
    expect(seen.has("Chambre")).toBe(false);
  });

  it("draws everything when the camera is outside the rooms", () => {
    expect(visibleRooms(graph, "Autre").size).toBe(graph.size);
  });
});

describe("room culler", () => {
  it("shows and hides objects as the camera moves, and reveals new rooms once", () => {
    const culler = createRoomCuller(APARTMENT_DEF);
    const sofa = new THREE.Object3D();
    const bed = new THREE.Object3D();
    culler.add(sofa, "Séjour / Cuisine");
    culler.add(bed, "Chambre");
    const revealed: string[][] = [];
    culler.onReveal((rooms) => revealed.push([...rooms]));
    expect(culler.update(3.5, 2)).toBe(true); // in the séjour
    expect(sofa.visible).toBe(true);
    expect(bed.visible).toBe(false);
    expect(culler.update(3.6, 2.1)).toBe(false); // same room: nothing to do
    culler.update(12.8, 5); // in the bedroom
    expect(sofa.visible).toBe(false);
    expect(bed.visible).toBe(true);
    culler.update(3.5, 2); // back: nothing new to load
    expect(revealed).toHaveLength(2);
    expect(revealed[1]).toContain("Chambre");
  });
});

describe("instancing", () => {
  it("draws N copies with one mesh per part, at the copies' places", () => {
    const model = new THREE.Group();
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.05, 0.4),
      new THREE.MeshBasicMaterial(),
    );
    seat.position.y = 0.45;
    model.add(seat);
    const places = [placementMatrix(0, 0, 0, 0), placementMatrix(2, 0, 0, Math.PI / 2)];
    const group = instanced(model, places);
    expect(group.children).toHaveLength(1);
    const mesh = group.children[0] as THREE.InstancedMesh;
    expect(mesh.count).toBe(2);
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(1, m);
    const p = new THREE.Vector3().setFromMatrixPosition(m);
    expect(p.x).toBeCloseTo(2);
    expect(p.y).toBeCloseTo(0.45); // the part keeps its height in the model
  });

  it("groups items by key, keeping their order", () => {
    expect(groupBy(["a1", "b1", "a2"], (s) => s[0])).toEqual([["a1", "a2"], ["b1"]]);
  });
});

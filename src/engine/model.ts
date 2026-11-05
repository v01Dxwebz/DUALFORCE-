import * as THREE from 'three';
import {
  SLIDER_CRANK_CONFIGURATION,
  solveSliderCrank,
  type SliderCrankSolution,
} from './kinematics.js';
import { coilUpstrokeActivity } from './motion.js';
import { createCrankcase } from './crankcase.js';

export type ComponentKey =
  | 'casing'
  | 'frame'
  | 'cylinders'
  | 'pistons'
  | 'rods'
  | 'crank'
  | 'stator'
  | 'magnets';

export interface MechanicalEngineState {
  phase: number;
  explodeAmount: number;
  electromagnetic: boolean;
  visible: Record<ComponentKey, boolean>;
  cutaway: boolean;
  casingMode?: 'solid' | 'transparent';
  selectedComponent?: ComponentKey;
  caseOpenAmount?: number;
  longitudinalSection?: boolean;
  visualAngularVelocity?: number;
}

export interface MechanicalEngine {
  groups: Record<ComponentKey, THREE.Group>;
  update(state: MechanicalEngineState): void;
  dispose(): void;
}

const C = SLIDER_CRANK_CONFIGURATION;
const UP = new THREE.Vector3(0, 1, 0);
const NEGATIVE_Y = new THREE.Vector3(0, -1, 0);
const PI2 = Math.PI * 2;

/**
 * The mesh is a reference-inspired visual study, not a proven engine or CAD
 * model. Inline-2 phase is provisionally pi-offset; no timing-chain path or
 * performance claim is implied. Parent code supplies scene lighting/PMREM.
 */
export function createMechanicalEngine(root: THREE.Group): MechanicalEngine {
  const groups: Record<ComponentKey, THREE.Group> = {
    casing: new THREE.Group(),
    frame: new THREE.Group(),
    cylinders: new THREE.Group(),
    pistons: new THREE.Group(),
    rods: new THREE.Group(),
    crank: new THREE.Group(),
    stator: new THREE.Group(),
    magnets: new THREE.Group(),
  };
  Object.entries(groups).forEach(([key, group]) => {
    group.name = `dualforce-${key}`;
    root.add(group);
  });

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const linerMaterials: THREE.MeshPhysicalMaterial[] = [];
  const electromagneticMaterials: THREE.MeshStandardMaterial[] = [];
  const windingLights: THREE.PointLight[] = [];
  const coilIndicators: THREE.Mesh[] = [];
  const sectionPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const highlightMaterials = new Set<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>();

  const ownGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometries.add(geometry);
    return geometry;
  };
  const ownMaterial = <T extends THREE.Material>(material: T): T => {
    materials.add(material);
    if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
      highlightMaterials.add(material);
    }
    return material;
  };
  const ownTexture = <T extends THREE.Texture>(texture: T): T => {
    textures.add(texture);
    return texture;
  };

  const silver = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x9da8aa,
    metalness: 0.92,
    roughness: 0.25,
    clearcoat: 0.22,
    clearcoatRoughness: 0.18,
  }));
  const silverDark = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x576367,
    metalness: 0.9,
    roughness: 0.32,
  }));
  const silverEdge = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xc8d0cd,
    metalness: 0.95,
    roughness: 0.19,
    clearcoat: 0.35,
  }));
  const steelDark = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x252c2f,
    metalness: 0.84,
    roughness: 0.28,
  }));
  const copper = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xb5683c,
    metalness: 0.78,
    roughness: 0.24,
    clearcoat: 0.2,
  }));
  const copperHot = ownMaterial(new THREE.MeshStandardMaterial({
    color: 0x9d4e28,
    metalness: 0.78,
    roughness: 0.21,
    emissive: 0x271006,
    emissiveIntensity: 0,
  }));
  electromagneticMaterials.push(copperHot);
  copperHot.userData.isWinding = true;
  const brass = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xc89750,
    metalness: 0.86,
    roughness: 0.2,
  }));
  const brassDark = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x785229,
    metalness: 0.82,
    roughness: 0.28,
  }));
  const black = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x101619,
    metalness: 0.72,
    roughness: 0.32,
  }));
  const ceramic = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xc8cec4,
    metalness: 0.24,
    roughness: 0.34,
    clearcoat: 0.12,
  }));
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh => {
    const item = new THREE.Mesh(geometry, material);
    item.castShadow = true;
    item.receiveShadow = true;
    return item;
  };

  const box = (
    parent: THREE.Object3D,
    size: THREE.Vector3,
    position: THREE.Vector3,
    material: THREE.Material,
    bevel = 0,
  ): THREE.Mesh => {
    const geometry = ownGeometry(new THREE.BoxGeometry(size.x, size.y, size.z));
    const item = mesh(geometry, material);
    item.position.copy(position);
    parent.add(item);
    if (bevel > 0) {
      const edges = ownGeometry(new THREE.EdgesGeometry(geometry, 18));
      const edgeItem = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
        color: 0xd3d9d5,
        transparent: true,
        opacity: 0.19,
      }));
      ownMaterial(edgeItem.material);
      edgeItem.position.copy(position);
      edgeItem.scale.setScalar(1 + bevel);
      parent.add(edgeItem);
    }
    return item;
  };

  const cylinder = (
    parent: THREE.Object3D,
    radius: number,
    height: number,
    position: THREE.Vector3,
    material: THREE.Material,
    radialSegments = 32,
    rotateX = 0,
    rotateY = 0,
    rotateZ = 0,
    openEnded = false,
  ): THREE.Mesh => {
    const geometry = ownGeometry(new THREE.CylinderGeometry(
      radius,
      radius,
      height,
      radialSegments,
      1,
      openEnded,
    ));
    const item = mesh(geometry, material);
    item.position.copy(position);
    item.rotation.set(rotateX, rotateY, rotateZ);
    parent.add(item);
    return item;
  };

  const torus = (
    parent: THREE.Object3D,
    majorRadius: number,
    tubeRadius: number,
    position: THREE.Vector3,
    material: THREE.Material,
    axis: 'x' | 'y' | 'z' = 'y',
    radialSegments = 16,
    tubularSegments = 48,
  ): THREE.Mesh => {
    const geometry = ownGeometry(new THREE.TorusGeometry(
      majorRadius,
      tubeRadius,
      radialSegments,
      tubularSegments,
    ));
    const item = mesh(geometry, material);
    item.position.copy(position);
    if (axis === 'x') item.rotation.y = Math.PI / 2;
    if (axis === 'y') item.rotation.x = Math.PI / 2;
    parent.add(item);
    return item;
  };

  const ring = (
    parent: THREE.Object3D,
    innerRadius: number,
    outerRadius: number,
    position: THREE.Vector3,
    material: THREE.Material,
    axis: 'x' | 'y' | 'z' = 'y',
  ): THREE.Mesh => {
    const geometry = ownGeometry(new THREE.RingGeometry(innerRadius, outerRadius, 48));
    const item = mesh(geometry, material);
    item.position.copy(position);
    if (axis === 'x') item.rotation.y = Math.PI / 2;
    if (axis === 'y') item.rotation.x = Math.PI / 2;
    parent.add(item);
    return item;
  };

  const cylinderBetween = (
    parent: THREE.Object3D,
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    material: THREE.Material,
    radialSegments = 16,
  ): THREE.Mesh => {
    const delta = end.clone().sub(start);
    const item = cylinder(
      parent,
      radius,
      delta.length(),
      start.clone().add(end).multiplyScalar(0.5),
      material,
      radialSegments,
      0,
      0,
      0,
      true,
    );
    item.quaternion.setFromUnitVectors(UP, delta.normalize());
    return item;
  };

  class HelixCurve extends THREE.Curve<THREE.Vector3> {
    constructor(
      private readonly centerX: number,
      private readonly radius: number,
      private readonly y0: number,
      private readonly height: number,
      private readonly turns: number,
      private readonly phase: number,
    ) {
      super();
    }

    override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
      const angle = this.phase + t * this.turns * PI2;
      return target.set(
        this.centerX + this.radius * Math.cos(angle),
        this.y0 + this.height * t,
        this.radius * Math.sin(angle),
      );
    }
  }

  const createHelix = (
    parent: THREE.Object3D,
    centerX: number,
    radius: number,
    phase: number,
  ): void => {
    const curve = new HelixCurve(centerX, radius, 0.36, 0.78, 24, phase);
    const geometry = ownGeometry(new THREE.TubeGeometry(curve, 768, 0.015, 8, false));
    const windingMaterial = ownMaterial(copperHot.clone());
    windingMaterial.userData.coilIndex = centerX < 0 ? 0 : 1;
    parent.add(mesh(geometry, windingMaterial));
  };

  const addLead = (parent: THREE.Object3D, cx: number, zSign: number): void => {
    const start = new THREE.Vector3(cx + 0.34, 0.37 + (zSign > 0 ? 0.02 : 0), zSign * 0.11);
    const end = new THREE.Vector3(cx + 0.49, 0.28, zSign * 0.42);
    const points = [
      start,
      new THREE.Vector3(cx + 0.43, 0.34, zSign * 0.2),
      new THREE.Vector3(cx + 0.47, 0.28, zSign * 0.31),
      end,
    ];
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = ownGeometry(new THREE.TubeGeometry(curve, 28, 0.018, 6, false));
    parent.add(mesh(geometry, copper));
    cylinder(parent, 0.028, 0.018, end, brass, 12, 0, 0, Math.PI / 2, true);
  };

  // A closed lower-only crankcase with a longitudinal inspection opening.
  const housing = createCrankcase(groups.casing);
  groups.casing.rotation.y = Math.PI;

  // Static aluminium/silver frame remains independent of the inspection case.
  const frame = groups.frame;
  const stator = groups.stator;
  const mountingDeckProfile = new THREE.Shape();
  mountingDeckProfile.moveTo(-1.34, -0.45);
  mountingDeckProfile.lineTo(1.34, -0.45);
  mountingDeckProfile.lineTo(1.34, 0.45);
  mountingDeckProfile.lineTo(-1.34, 0.45);
  mountingDeckProfile.closePath();
  for (const center of C.cylinderCentersX) {
    const bore = new THREE.Path();
    bore.absarc(center, 0, 0.34, 0, PI2, true);
    mountingDeckProfile.holes.push(bore);
  }
  const mountingDeck = mesh(ownGeometry(new THREE.ExtrudeGeometry(mountingDeckProfile, { depth: 0.1, bevelEnabled: false, curveSegments: 32 })), silver);
  mountingDeck.name = 'internal-mounting-deck-with-open-bores';
  mountingDeck.rotation.x = -Math.PI / 2;
  mountingDeck.position.y = 0.22;
  frame.add(mountingDeck);
  box(frame, new THREE.Vector3(2.72, 0.1, 0.9), new THREE.Vector3(0, -1.1, 0), silver, 0.025);
  for (const x of [-1.27, 1.27]) {
    for (const z of [-0.35, 0.35]) {
      box(frame, new THREE.Vector3(0.11, 1.28, 0.1), new THREE.Vector3(x, -0.42, z), silverDark, 0.01);
    }
  }
  // Four vertical tying rods and paired diagonal braces.
  for (const x of [-1.14, 1.14]) {
    for (const z of [-0.56, 0.56]) {
      cylinderBetween(frame, new THREE.Vector3(x, -1.05, z), new THREE.Vector3(x, 0.27, z), 0.026, silverEdge, 14);
      cylinder(frame, 0.065, 0.04, new THREE.Vector3(x, 0.31, z), silverEdge, 6);
      cylinder(frame, 0.065, 0.04, new THREE.Vector3(x, -1.02, z), silverEdge, 6);
    }
  }
  cylinderBetween(frame, new THREE.Vector3(-1.27, 0.22, -0.4), new THREE.Vector3(-0.92, -0.65, -0.4), 0.034, silverEdge, 12);
  cylinderBetween(frame, new THREE.Vector3(1.27, 0.22, -0.4), new THREE.Vector3(0.92, -0.65, -0.4), 0.034, silverEdge, 12);
  cylinderBetween(frame, new THREE.Vector3(-1.27, -1.05, -0.4), new THREE.Vector3(-0.92, -0.65, -0.4), 0.034, silverEdge, 12);
  cylinderBetween(frame, new THREE.Vector3(1.27, -1.05, -0.4), new THREE.Vector3(0.92, -0.65, -0.4), 0.034, silverEdge, 12);

  // Twin sleeves, caps, and inspection-friendly missing front sectors.
  const cylindersGroup = groups.cylinders;
  for (const cx of C.cylinderCentersX) {
    const liner = ownMaterial(new THREE.MeshPhysicalMaterial({
      color: 0x68777a,
      metalness: 0.74,
      roughness: 0.27,
      transparent: true,
      opacity: 0.64,
      side: THREE.DoubleSide,
      depthWrite: false,
    }));
    linerMaterials.push(liner);
    const sleeveGeometry = ownGeometry(new THREE.CylinderGeometry(
      0.33,
      0.33,
      0.82,
      48,
      1,
      true,
      Math.PI * 0.14,
      Math.PI * 1.58,
    ));
    const sleeve = mesh(sleeveGeometry, liner);
    sleeve.position.set(cx, 0.75, 0);
    cylindersGroup.add(sleeve);
    torus(cylindersGroup, 0.32, 0.024, new THREE.Vector3(cx, 0.37, 0), silverEdge, 'y', 12, 48);
    torus(cylindersGroup, 0.32, 0.024, new THREE.Vector3(cx, 1.13, 0), silverEdge, 'y', 12, 48);
    ring(cylindersGroup, 0.105, 0.33, new THREE.Vector3(cx, 0.35, 0), brass, 'y');
    ring(cylindersGroup, 0.105, 0.33, new THREE.Vector3(cx, 1.15, 0), brass, 'y');
    torus(cylindersGroup, 0.27, 0.035, new THREE.Vector3(cx, 0.35, 0), brassDark, 'y', 12, 48);
    torus(cylindersGroup, 0.27, 0.035, new THREE.Vector3(cx, 1.15, 0), brassDark, 'y', 12, 48);
    // Inner bore lip gives the cap centre hole a machined edge.
    torus(cylindersGroup, 0.108, 0.018, new THREE.Vector3(cx, 1.151, 0), silverDark, 'y', 10, 32);
  }

  // Static continuous two-layer copper windings and lead endpoints attached to flanges.
  const windingParts = groups.stator;
  for (const cx of C.cylinderCentersX) {
    cylinder(windingParts, 0.22, 0.76, new THREE.Vector3(cx, 0.75, 0), black, 32, 0, 0, 0, true);
    cylinder(windingParts, 0.205, 0.74, new THREE.Vector3(cx, 0.75, 0), brassDark, 24, 0, 0, 0, true);
    createHelix(windingParts, cx, 0.345, 0.12);
    createHelix(windingParts, cx, 0.378, -0.08);
    addLead(windingParts, cx, 1);
    addLead(windingParts, cx, -1);
    const capMetal = ownMaterial(brass.clone());
    capMetal.side = THREE.DoubleSide;
    for (const capY of [0.335, 1.175]) {
      cylinder(windingParts, 0.425, 0.055, new THREE.Vector3(cx, capY, 0), capMetal, 64, 0, 0, 0, true);
      ring(windingParts, 0.12, 0.425, new THREE.Vector3(cx, capY + 0.0275, 0), capMetal, 'y');
      ring(windingParts, 0.12, 0.425, new THREE.Vector3(cx, capY - 0.0275, 0), capMetal, 'y');
      cylinder(windingParts, 0.12, 0.055, new THREE.Vector3(cx, capY, 0), brassDark, 40, 0, 0, 0, true);
    }
    cylinderBetween(windingParts, new THREE.Vector3(cx + 0.46, 0.28, 0), new THREE.Vector3(cx + 0.46, 1.19, 0), 0.027, brassDark, 16);
    box(windingParts, new THREE.Vector3(0.12, 0.055, 0.12), new THREE.Vector3(cx + 0.425, 1.175, 0), capMetal);
    const indicatorMaterial = ownMaterial(new THREE.MeshStandardMaterial({
      color: 0x064e47, metalness: 0.15, roughness: 0.3,
      emissive: 0x00d8bd, emissiveIntensity: 0,
    }));
    indicatorMaterial.userData.coilIndex = cx < 0 ? 0 : 1;
    indicatorMaterial.userData.isCoilIndicator = true;
    const indicator = torus(windingParts, 0.435, 0.012, new THREE.Vector3(cx, 0.318, 0), indicatorMaterial, 'y', 8, 64);
    indicator.name = `coil-upstroke-indicator-${cx < 0 ? 'front' : 'rear'}`;
    coilIndicators.push(indicator);
    const light = new THREE.PointLight(0x00dac0, 0, 2, 2);
    light.name = `coil-upstroke-light-${cx < 0 ? 'front' : 'rear'}`;
    light.position.set(cx, 0.68, 0.33);
    windingParts.add(light);
    windingLights.push(light);
  }

  // Pistons: skirt, pin, rings, and a small YSZ-like ceramic crown.
  const pistons = groups.pistons;
  const pistonRings: THREE.Mesh[] = [];
  for (const cx of C.cylinderCentersX) {
    const piston = new THREE.Group();
    piston.name = `piston-${cx < 0 ? 'front' : 'rear'}`;
    piston.position.x = cx;
    pistons.add(piston);
    cylinder(piston, 0.255, 0.32, new THREE.Vector3(0, -0.25, 0), silverEdge, 40, 0, 0, 0, false);
    cylinder(piston, 0.268, 0.08, new THREE.Vector3(0, 0.045, 0), ceramic, 40, 0, 0, 0, false);
    cylinder(piston, 0.12, 0.09, new THREE.Vector3(0, 0, 0), brassDark, 24, 0, 0, Math.PI / 2, true);
    for (const y of [-0.08, -0.145, -0.21]) {
      const ringMesh = torus(piston, 0.265, 0.012, new THREE.Vector3(0, y, 0), black, 'y', 8, 40);
      pistonRings.push(ringMesh);
    }
    // A restrained ceramic crown edge, offset so the top is pin + 0.14.
    torus(piston, 0.228, 0.018, new THREE.Vector3(0, 0.105, 0), ceramic, 'y', 10, 40);
  }

  // Proposed piston-associated magnetic teeth are separate, moving elements.
  // Their placement is illustrative and must not be read as solved alignment.
  const magneticCarriers: THREE.Group[] = [];
  for (const cx of C.cylinderCentersX) {
    const carrier = new THREE.Group();
    carrier.name = `proposed-piston-magnetic-teeth-${cx < 0 ? 'front' : 'rear'}`;
    carrier.position.x = cx;
    groups.magnets.add(carrier);
    magneticCarriers.push(carrier);
    for (let row = 0; row < 2; row += 1) {
      for (let tooth = 0; tooth < 12; tooth += 1) {
        const angle = (tooth / 12) * PI2;
        const element = box(
          carrier,
          new THREE.Vector3(0.036, 0.075, 0.055),
          new THREE.Vector3(Math.cos(angle) * 0.285, -0.15 - row * 0.115, Math.sin(angle) * 0.285),
          row === 0 ? brassDark : silverDark,
          0.003,
        );
        element.rotation.y = angle;
      }
    }
  }

  // Fixed-length I-section rods. Local small end is (0,0,0), big end is (0,-L,0).
  const rods = groups.rods;
  const rodMotionGroups: THREE.Group[] = [];
  const rodLength = C.rodLength;
  for (const cx of C.cylinderCentersX) {
    const rod = new THREE.Group();
    rod.name = `rod-${cx < 0 ? 'front' : 'rear'}`;
    rod.position.x = cx;
    rods.add(rod);
    rodMotionGroups.push(rod);
    box(rod, new THREE.Vector3(0.075, rodLength - 0.25, 0.055), new THREE.Vector3(0, -rodLength / 2, 0), silverEdge, 0.01);
    box(rod, new THREE.Vector3(0.135, rodLength - 0.36, 0.032), new THREE.Vector3(0, -rodLength / 2, 0.038), silver, 0.005);
    cylinder(rod, 0.135, 0.17, new THREE.Vector3(0, -rodLength, 0), silverDark, 28, 0, 0, Math.PI / 2);
    cylinder(rod, 0.103, 0.183, new THREE.Vector3(0, -rodLength, 0), black, 28, 0, 0, Math.PI / 2);
    cylinder(rod, 0.09, 0.12, new THREE.Vector3(0, 0, 0), silverDark, 24, 0, 0, Math.PI / 2);
    for (const z of [-0.072, 0.072]) {
      cylinder(rod, 0.022, 0.19, new THREE.Vector3(0, -rodLength, z), brass, 12, 0, 0, Math.PI / 2);
    }
    cylinder(rod, 0.018, 0.15, new THREE.Vector3(0, 0, 0.055), brass, 12, 0, 0, Math.PI / 2);
  }

  // Historical shutter samples clarify high-speed motion without slowing time.
  const rodTrails: { group: THREE.Group; cylinder: number; shutterFraction: number }[] = [];
  const trailMaterial = ownMaterial(new THREE.MeshStandardMaterial({
    color: 0xb4cbc7, metalness: 0.55, roughness: 0.5,
    transparent: true, opacity: 0.13, depthWrite: false,
  }));
  rodMotionGroups.forEach((rod, cylinderIndex) => {
    for (const shutterFraction of [0.5, 1]) {
      const ghost = rod.clone(true);
      ghost.name = `historical-rod-pose-${cylinderIndex}-${shutterFraction}`;
      ghost.visible = false;
      ghost.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = trailMaterial;
        object.castShadow = false;
        object.receiveShadow = false;
      });
      rods.add(ghost);
      rodTrails.push({ group: ghost, cylinder: cylinderIndex, shutterFraction });
    }
  });

  // Crankshaft, bearing races, and machined flywheel rotate together.
  const crank = groups.crank;
  const rotatingAssembly = new THREE.Group();
  rotatingAssembly.name = 'shaft-and-crank-rotation';
  rotatingAssembly.position.y = C.crankCenterY;
  crank.add(rotatingAssembly);

  cylinder(rotatingAssembly, 0.11, 3.15, new THREE.Vector3(0, 0, 0), steelDark, 32, 0, 0, Math.PI / 2);
  for (const x of [-0.94, -0.33, 0.33, 0.94]) {
    torus(rotatingAssembly, 0.13, 0.027, new THREE.Vector3(x, 0, 0), brassDark, 'x', 12, 40);
  }
  // Fixed outer bearing races stay in stator; these inner races/cages rotate with the shaft.
  for (const x of [-0.34, 0.34]) {
    torus(frame, 0.19, 0.055, new THREE.Vector3(x, C.crankCenterY, 0), silverDark, 'x', 16, 48);
    torus(rotatingAssembly, 0.125, 0.028, new THREE.Vector3(x, 0, 0), brass, 'x', 12, 40);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * PI2;
      cylinder(
        rotatingAssembly,
        0.021,
        0.04,
        new THREE.Vector3(x, 0.125 * Math.cos(a), 0.125 * Math.sin(a)),
        brass,
        10,
        0,
        0,
        Math.PI / 2,
      );
    }
  }

  for (const cx of C.cylinderCentersX) {
    const throwGroup = new THREE.Group();
    throwGroup.name = `crank-throw-${cx < 0 ? 'front' : 'rear'}`;
    throwGroup.position.x = cx;
    throwGroup.rotation.x = cx < 0 ? 0 : C.phaseOffset;
    rotatingAssembly.add(throwGroup);
    for (const x of [-0.105, 0.105]) {
      cylinder(throwGroup, 0.31, 0.075, new THREE.Vector3(x, 0, 0), silverDark, 32, 0, 0, Math.PI / 2);
      ring(throwGroup, 0.105, 0.28, new THREE.Vector3(x + (x > 0 ? 0.039 : -0.039), 0, 0), silverEdge, 'x');
    }
    cylinder(throwGroup, 0.105, 0.34, new THREE.Vector3(0, C.crankRadius, 0), brassDark, 28, 0, 0, Math.PI / 2);
    torus(throwGroup, 0.105, 0.018, new THREE.Vector3(-0.17, C.crankRadius, 0), brass, 'x', 10, 32);
    torus(throwGroup, 0.105, 0.018, new THREE.Vector3(0.17, C.crankRadius, 0), brass, 'x', 10, 32);
  }

  // Broad end flywheel: lip, hub, dark spline centre, concentric grooves and off-axis bolts.
  const flywheelX = 1.52;
  cylinder(rotatingAssembly, 0.79, 0.16, new THREE.Vector3(flywheelX, 0, 0), silver, 64, 0, 0, Math.PI / 2);
  cylinder(rotatingAssembly, 0.72, 0.205, new THREE.Vector3(flywheelX + 0.02, 0, 0), silverDark, 64, 0, 0, Math.PI / 2);
  cylinder(rotatingAssembly, 0.665, 0.03, new THREE.Vector3(flywheelX + 0.13, 0, 0), silverEdge, 64, 0, 0, Math.PI / 2);
  torus(rotatingAssembly, 0.72, 0.045, new THREE.Vector3(flywheelX + 0.11, 0, 0), silverEdge, 'x', 16, 64);
  torus(rotatingAssembly, 0.57, 0.018, new THREE.Vector3(flywheelX + 0.115, 0, 0), silverDark, 'x', 12, 64);
  torus(rotatingAssembly, 0.42, 0.013, new THREE.Vector3(flywheelX + 0.118, 0, 0), silverDark, 'x', 10, 56);
  cylinder(rotatingAssembly, 0.2, 0.06, new THREE.Vector3(flywheelX + 0.15, 0, 0), silverDark, 40, 0, 0, Math.PI / 2);
  cylinder(rotatingAssembly, 0.12, 0.035, new THREE.Vector3(flywheelX + 0.18, 0, 0), black, 32, 0, 0, Math.PI / 2);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * PI2 + Math.PI / 8;
    cylinder(
      rotatingAssembly,
      0.022,
      0.025,
      new THREE.Vector3(flywheelX + 0.16, 0.54 * Math.cos(a), 0.54 * Math.sin(a)),
      silverDark,
      6,
      0,
      0,
      Math.PI / 2,
    );
  }
  torus(rotatingAssembly, 0.2, 0.018, new THREE.Vector3(flywheelX + 0.18, 0, 0), silverEdge, 'x', 12, 48);

  const componentDefaults: Record<ComponentKey, THREE.Vector3> = {
    casing: new THREE.Vector3(0, 0, 0),
    frame: new THREE.Vector3(0, 0, 0),
    cylinders: new THREE.Vector3(0, 0, 0),
    pistons: new THREE.Vector3(0, 0, 0),
    rods: new THREE.Vector3(0, 0, 0),
    crank: new THREE.Vector3(0, 0, 0),
    stator: new THREE.Vector3(0, 0, 0),
    magnets: new THREE.Vector3(0, 0, 0),
  };
  const explodeOffsets: Record<ComponentKey, THREE.Vector3> = {
    casing: new THREE.Vector3(0, 0.02, 0.22),
    frame: new THREE.Vector3(0, 0, 0),
    cylinders: new THREE.Vector3(0, 0.03, 0.12),
    pistons: new THREE.Vector3(0, -0.04, -0.18),
    rods: new THREE.Vector3(0, -0.02, -0.29),
    crank: new THREE.Vector3(0, 0, -0.1),
    stator: new THREE.Vector3(0, 0, 0),
    magnets: new THREE.Vector3(0, 0.04, 0.19),
  };
  const frozenPhase = { value: 0 };
  let lastSelected: ComponentKey | undefined;
  let lastElectromagnetic: boolean | undefined;
  let lastSection: boolean | undefined;
  let disposed = false;

  const setEmissive = (material: THREE.Material, selected: boolean, electromagnetic = false): void => {
    if (!(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial)) return;
    if (material.userData.isWinding) {
      material.emissive.setHex(0x6b2a0d);
      material.emissiveIntensity = electromagnetic ? 0.08 : selected ? 0.04 : 0;
    } else {
      material.emissive.setHex(selected ? 0x6b2f14 : 0x000000);
      material.emissiveIntensity = selected ? 0.28 : 0;
    }
  };

  const applyHighlight = (selectedComponent: ComponentKey | undefined, electromagnetic: boolean): void => {
    for (const group of Object.values(groups)) {
      const selected = group.name === `dualforce-${selectedComponent}`;
      group.traverse((object) => {
        const material = (object as THREE.Mesh).material;
        if (Array.isArray(material)) material.forEach((item) => setEmissive(item, selected, electromagnetic));
        else if (material) setEmissive(material, selected, electromagnetic);
      });
    }
  };

  const updateKinematics = (phase: number, explodeAmount: number): void => {
    // At a meaningful exploded distance, hold the last assembled pose rather than
    // presenting a disconnected animated rod as if it were mechanically valid.
    const isExploded = explodeAmount > 0.28;
    if (!isExploded) frozenPhase.value = phase;
    const activePhase = isExploded ? frozenPhase.value : phase;
    const solutions: SliderCrankSolution[] = C.cylinderCentersX.map((_, index) => (
      solveSliderCrank(activePhase + (index === 0 ? 0 : C.phaseOffset))
    ));

    solutions.forEach((solution, index) => {
      const piston = pistons.children[index] as THREE.Group;
      piston.position.y = solution.pistonY;
      piston.position.z = 0;
      magneticCarriers[index].position.y = solution.pistonY;
      magneticCarriers[index].position.z = 0;

      const rod = rodMotionGroups[index];
      rod.position.y = solution.pistonY;
      rod.position.z = 0;
      const endpoint = new THREE.Vector3(0, solution.pinY, solution.pinZ);
      const rodDirection = endpoint.clone().sub(new THREE.Vector3(0, solution.pistonY, 0)).normalize();
      rod.quaternion.setFromUnitVectors(NEGATIVE_Y, rodDirection);

    });
    rotatingAssembly.rotation.x = activePhase;
  };

  const update = (state: MechanicalEngineState): void => {
    if (disposed) return;
    const explodeAmount = THREE.MathUtils.clamp(state.explodeAmount, 0, 1);
    (Object.keys(groups) as ComponentKey[]).forEach((key) => {
      const group = groups[key];
      group.visible = state.visible[key] ?? true;
      const offset = explodeOffsets[key];
      group.position.copy(componentDefaults[key]).addScaledVector(offset, explodeAmount);
    });
    groups.magnets.visible = state.visible.magnets && state.electromagnetic;
    electromagneticMaterials.forEach((material) => {
      material.emissiveIntensity = state.electromagnetic ? 0.08 : 0;
    });
    updateKinematics(state.phase, explodeAmount);
    rodTrails.forEach(({ group, cylinder, shutterFraction }) => {
      const speed = state.visualAngularVelocity ?? 0;
      group.visible = speed > 8 && explodeAmount < 0.01;
      if (!group.visible) return;
      const shutterSeconds = Math.min(0.03, 0.25 / speed) * shutterFraction;
      const solution = solveSliderCrank(frozenPhase.value + cylinder * C.phaseOffset - speed * shutterSeconds);
      group.position.set(C.cylinderCentersX[cylinder], solution.pistonY, 0);
      const direction = new THREE.Vector3(0, solution.pinY - solution.pistonY, solution.pinZ).normalize();
      group.quaternion.setFromUnitVectors(NEGATIVE_Y, direction);
    });
    if (state.selectedComponent !== lastSelected || state.electromagnetic !== lastElectromagnetic) {
      applyHighlight(state.selectedComponent, state.electromagnetic);
      lastSelected = state.selectedComponent;
      lastElectromagnetic = state.electromagnetic;
    }
    // Transparency is an explicit casing presentation choice. Keep it scoped
    // to the crankcase; longitudinal clipping remains an independent mechanic.
    housing.setInspection(state.caseOpenAmount ?? 0, state.casingMode === 'transparent');
    const moving = (state.visualAngularVelocity ?? 0) > 0;
    const activities = C.cylinderCentersX.map((_, index) => state.electromagnetic && moving ? coilUpstrokeActivity(frozenPhase.value + index * C.phaseOffset) : 0);
    groups.stator.userData.coilActivity = activities;
    windingLights.forEach((light, index) => { light.intensity = activities[index] * 5; });
    groups.stator.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material as THREE.MeshStandardMaterial;
      const index = material.userData.coilIndex as number | undefined;
      if (index === undefined) return;
      if (material.userData.isWinding) {
        material.emissive.setHex(0x00bfa6);
        material.emissiveIntensity = activities[index] * 1.8;
      } else if (material.userData.isCoilIndicator) {
        material.emissive.setHex(0x00f2cf);
        material.emissiveIntensity = activities[index] * 5;
      }
    });
    const section = Boolean(state.longitudinalSection);
    if (section !== lastSection) {
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
        const applySection = (material: THREE.Material) => {
          material.clippingPlanes = section ? [sectionPlane] : null;
          material.clipShadows = true;
          material.needsUpdate = true;
        };
        if (Array.isArray(object.material)) object.material.forEach(applySection);
        else applySection(object.material);
      });
      lastSection = section;
    }
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    housing.dispose();
    root.remove(...Object.values(groups));
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    geometries.clear();
    materials.clear();
    textures.clear();
  };

  Object.entries(groups).forEach(([key, group]) => {
    const componentMaterials = new Map<THREE.Material, THREE.Material>();
    group.traverse((object) => {
      object.userData.component = key as ComponentKey;
      if (!(object instanceof THREE.Mesh) || key === 'casing') return;
      const cloneForComponent = (material: THREE.Material): THREE.Material => {
        if (linerMaterials.includes(material as THREE.MeshPhysicalMaterial)) return material;
        let clone = componentMaterials.get(material);
        if (!clone) {
          clone = ownMaterial(material.clone());
          componentMaterials.set(material, clone);
        }
        return clone;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneForComponent)
        : cloneForComponent(object.material);
    });
  });

  return { groups, update, dispose };
}

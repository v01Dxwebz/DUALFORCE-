import * as THREE from 'three';

export interface CrankcaseInspection {
  setInspection(openAmount: number, transparent: boolean): void;
  dispose(): void;
}

const CASE_X = 1.43;
const CASE_Y_MIN = -1.27;
const CASE_Y_MAX = 0.29;
const CASE_Z = 0.73;
const SHAFT_Y = -0.45;
const SHAFT_BORE = 0.15;
const HINGE_Y = -1.205;
const OPEN_ANGLE = Math.PI * 0.43;
const PI2 = Math.PI * 2;

/**
 * Aluminium lower crankcase for the reference-inspired inline twin.
 *
 * The casing deliberately ends at y=0.29, below the upright copper coils
 * (which begin above y=0.335). Its service split is longitudinal: the fixed
 * rear shell occupies z >= 0 and the front shell door occupies z <= 0.
 * This is illustrative mechanical geometry rather than production CAD.
 */
export function createCrankcase(parent: THREE.Group): CrankcaseInspection {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  let disposed = false;

  const ownGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometries.add(geometry);
    return geometry;
  };

  const ownMaterial = <T extends THREE.Material>(material: T): T => {
    materials.add(material);
    return material;
  };

  const shellMaterial = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x879398,
    metalness: 0.93,
    roughness: 0.27,
    clearcoat: 0.2,
    clearcoatRoughness: 0.18,
    side: THREE.DoubleSide,
    transparent: false,
    opacity: 1,
  }));
  shellMaterial.userData.isCrankcase = true;

  const shellEdgeMaterial = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xb8c2c0,
    metalness: 0.95,
    roughness: 0.2,
    clearcoat: 0.3,
    clearcoatRoughness: 0.16,
    side: THREE.DoubleSide,
    transparent: false,
    opacity: 1,
  }));
  shellEdgeMaterial.userData.isCrankcase = true;

  const seamMaterial = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x3e4b4f,
    metalness: 0.82,
    roughness: 0.34,
    side: THREE.DoubleSide,
    transparent: false,
    opacity: 1,
  }));
  seamMaterial.userData.isCrankcase = true;

  const fastenerMaterial = ownMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x697477,
    metalness: 0.96,
    roughness: 0.22,
    side: THREE.DoubleSide,
    transparent: false,
    opacity: 1,
  }));
  fastenerMaterial.userData.isCrankcase = true;

  const root = new THREE.Group();
  root.name = 'crankcase';
  root.userData.component = 'casing';

  const fixedRear = new THREE.Group();
  fixedRear.name = 'fixed-rear-crankcase';
  fixedRear.userData.component = 'casing';
  root.add(fixedRear);

  const door = new THREE.Group();
  door.name = 'lengthwise-case-door';
  door.userData.component = 'casing';
  door.position.set(0, HINGE_Y, 0);
  root.add(door);

  parent.add(root);

  const mark = <T extends THREE.Object3D>(object: T): T => {
    object.userData.component = 'casing';
    return object;
  };

  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh => {
    const item = mark(new THREE.Mesh(geometry, material));
    item.castShadow = true;
    item.receiveShadow = true;
    return item;
  };

  const addBox = (
    group: THREE.Group,
    size: THREE.Vector3,
    position: THREE.Vector3,
    material: THREE.Material,
    bevel = 0,
  ): THREE.Mesh => {
    const geometry = ownGeometry(new THREE.BoxGeometry(size.x, size.y, size.z));
    const item = mesh(geometry, material);
    item.position.copy(position);
    group.add(item);

    if (bevel > 0) {
      const edgeGeometry = ownGeometry(new THREE.EdgesGeometry(geometry, 18));
      const edgeMaterial = ownMaterial(new THREE.LineBasicMaterial({
        color: 0xdbe1dd,
        transparent: false,
        opacity: 0.28,
      }));
      edgeMaterial.userData.isCrankcase = true;
      const edges = mark(new THREE.LineSegments(edgeGeometry, edgeMaterial));
      edges.position.copy(position);
      // EdgesGeometry already follows the box; do not scale it past the case
      // envelope merely to make the bevel guide more visible.
      edges.scale.setScalar(1);
      group.add(edges);
    }

    return item;
  };

  const addCylinder = (
    group: THREE.Group,
    radius: number,
    height: number,
    position: THREE.Vector3,
    material: THREE.Material,
    radialSegments = 16,
    rotation = new THREE.Euler(),
  ): THREE.Mesh => {
    const geometry = ownGeometry(new THREE.CylinderGeometry(
      radius,
      radius,
      height,
      radialSegments,
      1,
      false,
    ));
    const item = mesh(geometry, material);
    item.position.copy(position);
    item.rotation.copy(rotation);
    group.add(item);
    return item;
  };

  const addTorus = (
    group: THREE.Group,
    majorRadius: number,
    tubeRadius: number,
    position: THREE.Vector3,
    material: THREE.Material,
    radialSegments = 12,
    tubularSegments = 32,
  ): THREE.Mesh => {
    const geometry = ownGeometry(new THREE.TorusGeometry(
      majorRadius,
      tubeRadius,
      radialSegments,
      tubularSegments,
    ));
    const item = mesh(geometry, material);
    item.position.copy(position);
    item.rotation.y = Math.PI / 2;
    group.add(item);
    return item;
  };

  const extruded = (shape: THREE.Shape, depth: number): THREE.ExtrudeGeometry => {
    const geometry = ownGeometry(new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.012,
      bevelThickness: 0.01,
      curveSegments: 4,
      steps: 1,
    }));
    geometry.translate(0, 0, -depth / 2);
    return geometry;
  };

  const addTopLidHalf = (rear: boolean): void => {
    const shape = new THREE.Shape();
    const radius = 0.47;
    if (rear) {
      shape.moveTo(-CASE_X, -CASE_Z);
      shape.lineTo(CASE_X, -CASE_Z);
      shape.lineTo(CASE_X, 0);
      for (const centerX of [0.64, -0.64]) {
        shape.lineTo(centerX + radius, 0);
        shape.absarc(centerX, 0, radius, 0, Math.PI, true);
      }
      shape.lineTo(-CASE_X, 0);
    } else {
      shape.moveTo(-CASE_X, 0);
      for (const centerX of [-0.64, 0.64]) {
        shape.lineTo(centerX - radius, 0);
        shape.absarc(centerX, 0, radius, Math.PI, 0, true);
      }
      shape.lineTo(CASE_X, 0);
      shape.lineTo(CASE_X, CASE_Z);
      shape.lineTo(-CASE_X, CASE_Z);
    }
    shape.closePath();

    const lid = mesh(extruded(shape, 0.06), shellMaterial);
    lid.name = rear ? 'fixed-rear-crankcase-lid-half' : 'hinged-front-crankcase-lid-half';
    lid.position.set(0, CASE_Y_MAX - 0.03 - (rear ? 0 : HINGE_Y), 0);
    lid.rotation.x = -Math.PI / 2;
    (rear ? fixedRear : door).add(lid);
  };

  const makeEndProfile = (rear: boolean): THREE.ExtrudeGeometry => {
    const zEdge = rear ? CASE_Z : -CASE_Z;
    const zOuter = rear ? 0 : -CASE_Z;
    const y0 = CASE_Y_MIN;
    const y1 = CASE_Y_MAX;
    const r = SHAFT_BORE;

    const shape = new THREE.Shape();
    if (!rear) {
      // A boundary notch, rather than a plate crossing the shaft centreline.
      shape.moveTo(zOuter, y0);
      shape.lineTo(0, y0);
      shape.lineTo(0, SHAFT_Y - r);
      shape.absarc(0, SHAFT_Y, r, -Math.PI / 2, Math.PI / 2, true);
      shape.lineTo(0, y1);
      shape.lineTo(zOuter, y1);
    } else {
      shape.moveTo(0, y0);
      shape.lineTo(zEdge, y0);
      shape.lineTo(zEdge, y1);
      shape.lineTo(0, y1);
      shape.lineTo(0, SHAFT_Y + r);
      shape.absarc(0, SHAFT_Y, r, Math.PI / 2, -Math.PI / 2, true);
    }
    shape.closePath();
    return extruded(shape, 0.08);
  };

  const addEndPlate = (group: THREE.Group, x: number, rear: boolean): void => {
    const plate = mesh(makeEndProfile(rear), shellMaterial);
    plate.name = `${rear ? 'rear' : 'front'}-end-half-plate`;
    plate.position.x = x;
    if (!rear) plate.position.y = -HINGE_Y;
    plate.rotation.y = -Math.PI / 2;
    group.add(plate);
  };

  const doorPoint = (y: number, z: number): THREE.Vector3 => (
    new THREE.Vector3(0, y - HINGE_Y, z)
  );

  // Fixed rear half: rear wall, lower rear tray, split-side end profiles, and lid.
  addBox(fixedRear, new THREE.Vector3(2.86, 1.56, 0.06), new THREE.Vector3(0, -0.49, 0.70), shellMaterial, 0.008);
  addBox(fixedRear, new THREE.Vector3(2.86, 0.06, 0.70), new THREE.Vector3(0, -1.24, 0.35), shellMaterial, 0.008);
  addEndPlate(fixedRear, -CASE_X + 0.04, true);
  addEndPlate(fixedRear, CASE_X - 0.04, true);
  addTopLidHalf(true);

  // Hinged front half: it carries the front wall, lower front tray, and end halves.
  addBox(door, new THREE.Vector3(2.86, 1.56, 0.06), doorPoint(-0.49, -0.70), shellMaterial, 0.008);
  addBox(door, new THREE.Vector3(2.86, 0.06, 0.70), doorPoint(-1.24, -0.35), shellMaterial, 0.008);
  addEndPlate(door, -CASE_X + 0.04, false);
  addEndPlate(door, CASE_X - 0.04, false);
  addTopLidHalf(false);

  // Longitudinal ribs are kept below the lid and follow their respective shell.
  for (const y of [-1.08, -0.68, -0.28, 0.12]) {
    addBox(fixedRear, new THREE.Vector3(2.56, 0.052, 0.028), new THREE.Vector3(0, y, 0.715), shellEdgeMaterial, 0.004);
    addBox(door, new THREE.Vector3(2.56, 0.052, 0.028), doorPoint(y, -0.715), shellEdgeMaterial, 0.004);
  }
  for (const z of [0.18, 0.53]) {
    addBox(fixedRear, new THREE.Vector3(2.58, 0.032, 0.06), new THREE.Vector3(0, -1.205, z), shellEdgeMaterial, 0.004);
    addBox(door, new THREE.Vector3(2.58, 0.032, 0.06), doorPoint(-1.205, -z), shellEdgeMaterial, 0.004);
  }

  // Split gasket / seam runs in the x direction, not transversely between cylinders.
  addBox(fixedRear, new THREE.Vector3(2.72, 0.032, 0.022), new THREE.Vector3(0, -1.205, 0.012), seamMaterial);
  addBox(door, new THREE.Vector3(2.72, 0.032, 0.022), doorPoint(-1.205, -0.012), seamMaterial);

  // Small end-profile stiffeners and perimeter fasteners remain within the case bounds.
  for (const x of [-1.385, 1.385]) {
    for (const y of [-1.06, -0.63, -0.20]) {
      addBox(fixedRear, new THREE.Vector3(0.018, 0.16, 0.035), new THREE.Vector3(x, y, 0.36), shellEdgeMaterial, 0.003);
      addBox(door, new THREE.Vector3(0.018, 0.16, 0.035), doorPoint(y, -0.36).setX(x), shellEdgeMaterial, 0.003);
    }
  }

  for (const x of [-1.16, 1.16]) {
    for (const y of [-1.08, -0.70, -0.30, 0.08]) {
      addCylinder(
        fixedRear,
        0.034,
        0.024,
        new THREE.Vector3(x, y, 0.718),
        fastenerMaterial,
        10,
        new THREE.Euler(Math.PI / 2, 0, 0),
      );
      addCylinder(
        door,
        0.034,
        0.024,
        doorPoint(y, -0.718).setX(x),
        fastenerMaterial,
        10,
        new THREE.Euler(Math.PI / 2, 0, 0),
      );
    }
  }

  // Lid bolts follow their respective lid half and clear the coil openings.
  for (const x of [-1.19, 1.19]) {
    for (const z of [-0.57, 0.57]) {
      const rear = z > 0;
      addCylinder(
        rear ? fixedRear : door,
        0.036,
        0.022,
        rear ? new THREE.Vector3(x, 0.279, z) : doorPoint(0.279, z).setX(x),
        fastenerMaterial,
        10,
      );
    }
  }

  // Shaft aperture collars emphasize the r=0.15 end bores without bridging the split.
  for (const x of [-1.395, 1.395]) {
    addTorus(fixedRear, 0.17, 0.02, new THREE.Vector3(x, SHAFT_Y, 0), shellEdgeMaterial, 12, 32);
  }

  // Three illustrative hinge knuckles on the fixed rear shell, with door lugs around them.
  addCylinder(
    fixedRear,
    0.052,
    2.58,
    new THREE.Vector3(0, HINGE_Y, -0.045),
    seamMaterial,
    14,
    new THREE.Euler(0, 0, Math.PI / 2),
  );
  for (const x of [-1.03, 0, 1.03]) {
    addCylinder(
      fixedRear,
      0.082,
      0.42,
      new THREE.Vector3(x, HINGE_Y, -0.045),
      shellEdgeMaterial,
      16,
      new THREE.Euler(0, 0, Math.PI / 2),
    );
    addBox(door, new THREE.Vector3(0.28, 0.09, 0.10), doorPoint(HINGE_Y, -0.055), shellEdgeMaterial, 0.006).position.x = x;
  }

  const setInspection = (openAmount: number, transparent: boolean): void => {
    if (disposed) return;
    const amount = THREE.MathUtils.clamp(openAmount, 0, 1);
    door.rotation.x = -amount * OPEN_ANGLE;

    const opacity = transparent ? 0.22 : 1;
    materials.forEach((material) => {
      if ('opacity' in material) material.opacity = opacity;
      if ('transparent' in material && material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      if ('depthWrite' in material) material.depthWrite = !transparent;
    });
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    parent.remove(root);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    geometries.clear();
    materials.clear();
  };

  return { setInspection, dispose };
}

import * as THREE from 'three';

/**
 * Visual/provisional assumptions for this reference-inspired inline twin.
 * These values are not a verified production-engine design or a claim about
 * the real DUALFORCE mechanism. The two throws are shown pi radians apart.
 */
export const SLIDER_CRANK_CONFIGURATION = Object.freeze({
  crankRadius: 0.25,
  rodLength: 1.15,
  crankCenterY: -0.45,
  cylinderCentersX: Object.freeze([-0.64, 0.64]),
  phaseOffset: Math.PI,
  cylinderBoreRadius: 0.29,
  boreBottomY: 0.35,
  boreTopY: 1.15,
  pistonCrownOffset: 0.14,
});

export type SliderCrankConfiguration = typeof SLIDER_CRANK_CONFIGURATION;

type Point2 = { y: number; z: number };

export interface SliderCrankSolution {
  theta: number;
  pinY: number;
  pinZ: number;
  pistonY: number;
  pistonZ: 0;
  crankPin: Point2;
  pistonPin: Point2;
  rodLength: number;
  isValid: boolean;
}

/**
 * Solve one fixed-length slider crank in the y-z plane.
 *
 * Shaft axis is x. The crank pin is
 *   y = cy + r cos(theta), z = r sin(theta)
 * and the piston pin is constrained to z = 0, with the positive-y branch of
 * the circle intersection. This is the same solution used by the meshes in
 * model.ts; there is no cosmetic rod stretch or independently animated crank.
 */
export function solveSliderCrank(
  theta: number,
  configuration: SliderCrankConfiguration = SLIDER_CRANK_CONFIGURATION,
): SliderCrankSolution {
  const { crankRadius: r, rodLength: rod, crankCenterY: cy } = configuration;
  const pinY = cy + r * Math.cos(theta);
  const pinZ = r * Math.sin(theta);
  const discriminant = rod * rod - pinZ * pinZ;
  const isValid = discriminant >= -1e-12;
  const pistonY = pinY + Math.sqrt(Math.max(0, discriminant));
  const rodDY = pinY - pistonY;
  const actualRodLength = Math.hypot(rodDY, pinZ);

  return {
    theta,
    pinY,
    pinZ,
    pistonY,
    pistonZ: 0,
    crankPin: { y: pinY, z: pinZ },
    pistonPin: { y: pistonY, z: 0 },
    rodLength: actualRodLength,
    isValid,
  };
}

/** Return the exact 3D endpoint distance used to place a connecting rod. */
export function sliderCrankRodVector(
  solution: SliderCrankSolution,
  x = 0,
): THREE.Vector3 {
  return new THREE.Vector3(
    x,
    solution.pinY - solution.pistonY,
    solution.pinZ - solution.pistonZ,
  );
}

/** Convert a solution into a small-end-to-big-end unit direction. */
export function sliderCrankRodDirection(
  solution: SliderCrankSolution,
): THREE.Vector3 {
  return sliderCrankRodVector(solution).normalize();
}

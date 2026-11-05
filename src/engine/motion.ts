import { SLIDER_CRANK_CONFIGURATION as C } from './kinematics.js';

/** Visual playback ratio: a 2,800 RPM slider setting gives 0.56 visible rev/s. */
export const NORMAL_PLAYBACK_RATIO = 0.012;
export const INSPECTION_RATE = 0.1;

/** Map the RPM reference to a balanced presentation cadence, not physical time. */
export function rpmToVisualAngularVelocity(rpm: number, rate = 1): number {
  return Math.max(0, rpm) * Math.PI * 2 / 60 * NORMAL_PLAYBACK_RATIO * rate;
}

/** Backwards-compatible name for browser tabs holding the previous HMR module.
 * It uses the same balanced visual cadence, not physical shaft speed.
 */
export const rpmToAngularVelocity = rpmToVisualAngularVelocity;

export function advanceShaftPhase(phase: number, rpm: number, seconds: number, rate = 1): number {
  return phase + rpmToVisualAngularVelocity(rpm, rate) * Math.max(0, seconds);
}

/** Positive slider velocity during the upstroke, derived from the exact solver.
 * This is only a visual activity indicator, not a force or validated coil timing.
 */
export function coilUpstrokeActivity(theta: number): number {
  const sine = Math.sin(theta);
  const cosine = Math.cos(theta);
  const denominator = Math.sqrt(C.rodLength ** 2 - (C.crankRadius * sine) ** 2);
  const derivative = -C.crankRadius * sine - C.crankRadius ** 2 * sine * cosine / denominator;
  return Math.max(0, Math.min(1, derivative / C.crankRadius));
}

export interface TimelineState {
  shineY: number;
  shineActive: number;
  glintX: number;
  glintActive: number;
}

export interface IdleTargets {
  lightX: number;
  lightY: number;
}

export const SHINE_START_SEC = 1.43;
export const SHINE_DURATION_SEC = 0.92;
export const GLINT_PERIOD_SEC = 4.6;
export const GLINT_START_SEC = 2.35;
export const GLINT_DURATION_SEC = 1.35;
export const TOUCH_IDLE_DELAY_SEC = 1.5;

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function easeOutCubic(t: number): number {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

/**
 * Exponential frame-rate independent damping factor: 1 - exp(-dt * rate).
 */
export function dampScalar(current: number, target: number, dt: number, rate: number): number {
  if (dt <= 0) return current;
  const alpha = 1 - Math.exp(-dt * rate);
  return current + (target - current) * alpha;
}

/**
 * Computes per-dot normalized assembly progress for unit testing and parity checks.
 */
export function computeAssembleProgress(
  elapsedSinceReady: number,
  randX: number,
  randY: number,
  reducedMotion = false,
): number {
  if (reducedMotion) return 1;
  if (elapsedSinceReady <= 0) return 0;
  const delay = randX * 0.45;
  const duration = 1.05 + randY * 0.2;
  return easeOutCubic((elapsedSinceReady - delay) / duration);
}

/**
 * Computes the single intro shine sweep down the bust starting at 1.43s,
 * plus the repeating every-4.6s sage glint sweeping across the visor and leaves.
 */
export function computeTimelineUniforms(
  elapsedSinceReady: number,
  minNonBustX: number,
  maxNonBustX: number,
  reducedMotion = false,
): TimelineState {
  if (reducedMotion) {
    return {
      shineY: -4,
      shineActive: 0,
      glintX: minNonBustX - 1,
      glintActive: 0,
    };
  }

  let shineY = 3.0;
  let shineActive = 0;
  if (elapsedSinceReady >= SHINE_START_SEC) {
    const p = (elapsedSinceReady - SHINE_START_SEC) / SHINE_DURATION_SEC;
    if (p <= 1) {
      // Smoothly sweep from +2.35 down to -2.55
      shineY = 2.35 - p * 4.9;
      shineActive = Math.sin(p * Math.PI);
    }
  }

  let glintX = minNonBustX - 0.5;
  let glintActive = 0;
  if (elapsedSinceReady >= GLINT_START_SEC) {
    const cycle = (elapsedSinceReady - GLINT_START_SEC) % GLINT_PERIOD_SEC;
    if (cycle <= GLINT_DURATION_SEC) {
      const p = cycle / GLINT_DURATION_SEC;
      const startX = minNonBustX - 0.16;
      const endX = maxNonBustX + 0.16;
      glintX = startX + (endX - startX) * p;
      glintActive = Math.sin(p * Math.PI);
    }
  }

  return { shineY, shineActive, glintX, glintActive };
}

/**
 * Computes calm, drifting idle light coordinates when the cursor is away or
 * after touch input has rested for 1.5s.
 */
export function computeIdleLightTarget(elapsedSec: number): IdleTargets {
  return {
    lightX: 0.62 * Math.sin(elapsedSec * 0.42) + 0.18 * Math.sin(elapsedSec * 0.87),
    lightY: -0.08 + 0.36 * Math.cos(elapsedSec * 0.31),
  };
}

/**
 * Converts pointer light coordinates into gentle bust head pitch/yaw rotations.
 */
export function computeHeadRotationTargets(
  lightX: number,
  lightY: number,
  reducedMotion = false,
): { rotX: number; rotY: number } {
  if (reducedMotion) return { rotX: 0, rotY: 0 };
  const rotY = Math.max(-0.34, Math.min(0.34, lightX * 0.17));
  const rotX = Math.max(-0.18, Math.min(0.18, -(lightY + 0.15) * 0.1));
  return { rotX, rotY };
}

/** Format byte progress 0..1 into zero-padded 000..100 integer display. */
export function formatProgressCounter(progress: number): { value: number; text: string } {
  const clamped = Math.max(0, Math.min(1, progress));
  const value = Math.round(clamped * 100);
  return {
    value,
    text: String(value).padStart(3, '0'),
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLINT_PERIOD_SEC,
  GLINT_START_SEC,
  SHINE_START_SEC,
  computeAssembleProgress,
  computeHeadRotationTargets,
  computeIdleLightTarget,
  computeTimelineUniforms,
  dampScalar,
  formatProgressCounter,
} from './noaTimeline';

test('assembly progress starts at 0, completes gracefully, and snaps on reduced motion', () => {
  assert.equal(computeAssembleProgress(0, 0.5, 0.5, false), 0);
  const mid = computeAssembleProgress(0.8, 0.1, 0.5, false);
  assert.ok(mid > 0 && mid < 1);
  assert.equal(computeAssembleProgress(2.0, 0.99, 0.99, false), 1);
  assert.equal(computeAssembleProgress(0, 0.5, 0.5, true), 1);
});

test('intro shine sweeps once after 1.43s and periodic sage glint repeats every 4.6s', () => {
  const before = computeTimelineUniforms(1.0, -0.6, 0.9, false);
  assert.equal(before.shineActive, 0);
  assert.equal(before.glintActive, 0);

  const duringShine = computeTimelineUniforms(SHINE_START_SEC + 0.4, -0.6, 0.9, false);
  assert.ok(duringShine.shineActive > 0.5);
  assert.ok(duringShine.shineY < 2.35 && duringShine.shineY > -2.55);

  const afterShine = computeTimelineUniforms(5.0, -0.6, 0.9, false);
  assert.equal(afterShine.shineActive, 0);

  const firstGlint = computeTimelineUniforms(GLINT_START_SEC + 0.65, -0.6, 0.9, false);
  const secondGlint = computeTimelineUniforms(
    GLINT_START_SEC + GLINT_PERIOD_SEC + 0.65,
    -0.6,
    0.9,
    false,
  );
  assert.ok(firstGlint.glintActive > 0.5);
  assert.ok(Math.abs(firstGlint.glintX - secondGlint.glintX) < 1e-6);
});

test('dampScalar converges smoothly toward target independent of frame size', () => {
  const oneStep = dampScalar(0, 10, 0.1, 4);
  const twoHalfSteps = dampScalar(dampScalar(0, 10, 0.05, 4), 10, 0.05, 4);
  assert.ok(Math.abs(oneStep - twoHalfSteps) < 1e-9);
});

test('head rotation tracks light gently within safe bounds and zeros under reduced motion', () => {
  const right = computeHeadRotationTargets(4, 1, false);
  const left = computeHeadRotationTargets(-4, -1, false);
  assert.ok(right.rotY > 0 && right.rotY <= 0.34);
  assert.ok(left.rotY < 0 && left.rotY >= -0.34);
  assert.deepEqual(computeHeadRotationTargets(2, 1, true), { rotX: 0, rotY: 0 });
});

test('idle light wanders smoothly and progress counter pads to three digits', () => {
  const t0 = computeIdleLightTarget(0);
  const t1 = computeIdleLightTarget(2.5);
  assert.notEqual(t0.lightX, t1.lightX);

  assert.deepEqual(formatProgressCounter(0), { value: 0, text: '000' });
  assert.deepEqual(formatProgressCounter(0.074), { value: 7, text: '007' });
  assert.deepEqual(formatProgressCounter(1.4), { value: 100, text: '100' });
});

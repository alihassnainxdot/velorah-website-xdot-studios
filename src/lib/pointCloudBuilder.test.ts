import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_DOTS,
  PART_BUST,
  PART_LEAVES,
  PART_VISOR_FRAME,
  PART_VISOR_LENS,
  buildPointCloudFromSamples,
  computeCameraMetrics,
  createSeededRng,
  findVoxelCap,
  isLeafCandidate,
  visorLowerEdge,
  visorTopEdge,
} from './pointCloudBuilder';

test('leaf predicate isolates the right-side bun sprig', () => {
  assert.equal(isLeafCandidate(0.28, 0.72, 0.05), true);
  assert.equal(isLeafCandidate(0.05, 0.72, 0.05), false); // x <= 0.13
  assert.equal(isLeafCandidate(0.28, 0.52, 0.05), false); // y <= 0.6
  assert.equal(isLeafCandidate(0.14, 0.72, -0.06), false); // inside head sphere
});

test('visor profile edges maintain positive lens opening across width', () => {
  for (let x = -0.215; x <= 0.215; x += 0.02) {
    assert.ok(visorTopEdge(x) > visorLowerEdge(x), `expected top > lower at x=${x}`);
  }
  // Center bridge dips upward at x=0 compared to lens troughs
  assert.ok(visorLowerEdge(0) > visorLowerEdge(0.1));
});

test('findVoxelCap finds minimal cap yielding target sum', () => {
  const counts = [1, 3, 10, 10, 2]; // caps: 1->5, 2->8, 3->10, 4->12
  assert.equal(findVoxelCap(counts, 10), 3);
  assert.equal(findVoxelCap(counts, 5), 1);
  assert.equal(findVoxelCap(counts, 100), 10);
});

test('computeCameraMetrics aligns camera distance and 92px SVG ring radius', () => {
  const desktop = computeCameraMetrics(1440, 900);
  const mobile = computeCameraMetrics(390, 844);

  assert.equal(desktop.fovDeg, 30);
  assert.equal(desktop.targetY, -0.15);
  assert.ok(desktop.cameraZ > 8.5);
  assert.ok(mobile.cameraZ > desktop.cameraZ); // narrow aspect pulls camera back so width fits
  assert.ok(desktop.ringRadiusWorld > 0.4 && desktop.ringRadiusWorld < 2.0);
});

test('buildPointCloudFromSamples emits exact 66,000 dots with bounded shades and non-bust bounds', () => {
  const rng = createSeededRng(42);
  const sampleCount = 120_000;
  const pos = new Float32Array(sampleCount * 3);
  const norm = new Float32Array(sampleCount * 3);

  for (let i = 0; i < sampleCount; i++) {
    const i3 = i * 3;
    if (i % 25 === 0) {
      // Sprig of leaves region
      pos[i3] = 0.22 + (rng() - 0.5) * 0.1;
      pos[i3 + 1] = 0.68 + rng() * 0.16;
      pos[i3 + 2] = 0.06 + (rng() - 0.5) * 0.08;
    } else {
      // Rough face/bust surface
      pos[i3] = (rng() * 2 - 1) * 0.45;
      pos[i3 + 1] = -0.6 + rng() * 1.4;
      pos[i3 + 2] = 0.22 * Math.cos(pos[i3] * 2.5);
    }
    norm[i3] = 0;
    norm[i3 + 1] = 0.1;
    norm[i3 + 2] = 0.99;
  }

  const cloud = buildPointCloudFromSamples(pos, norm, createSeededRng(99));
  assert.equal(cloud.counts.total, TOTAL_DOTS);
  assert.equal(cloud.positions.length, TOTAL_DOTS * 3);
  assert.equal(cloud.normals.length, TOTAL_DOTS * 3);
  assert.equal(cloud.shades.length, TOTAL_DOTS * 2);
  assert.equal(cloud.counts.visorFrame, 950 + 380 + 140 + 140);
  assert.equal(cloud.counts.visorLens, 1500);
  assert.ok(cloud.counts.leaves > 0);
  assert.ok(cloud.counts.bust > 0);
  assert.equal(
    cloud.counts.bust + cloud.counts.leaves + cloud.counts.visorFrame + cloud.counts.visorLens,
    TOTAL_DOTS,
  );
  assert.ok(cloud.minNonBustX < 0);
  assert.ok(cloud.maxNonBustX > 0.4);

  for (let i = 0; i < TOTAL_DOTS; i++) {
    const ridge = cloud.shades[i * 2];
    const thin = cloud.shades[i * 2 + 1];
    assert.ok(ridge >= -1 && ridge <= 1, `ridge out of bounds: ${ridge}`);
    assert.ok(thin >= 0 && thin <= 1, `thin out of bounds: ${thin}`);
    const part = cloud.parts[i];
    assert.ok(
      part === PART_BUST ||
        part === PART_LEAVES ||
        part === PART_VISOR_FRAME ||
        part === PART_VISOR_LENS,
    );
  }
});

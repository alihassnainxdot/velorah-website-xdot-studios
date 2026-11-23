export const TOTAL_DOTS = 66_000;
export const CANDIDATE_SAMPLES = TOTAL_DOTS * 5; // 330,000
export const NEIGHBOR_POOL = Math.floor(CANDIDATE_SAMPLES / 2); // 165,000
export const VOXEL_SIZE = 0.022;
export const SHADE_RADIUS = 0.03;
export const MODEL_SCALE = 2.8;
export const MODEL_Y_OFFSET = -0.68;

export const VISOR_W = 0.215;
export const VISOR_CLEARANCE = 0.028;

export const PART_BUST = 1;
export const PART_LEAVES = 2;
export const PART_VISOR_FRAME = 3;
export const PART_VISOR_LENS = 4;

export interface PointCloudData {
  positions: Float32Array; // vec3 * 66000 (world space)
  normals: Float32Array;   // vec3 * 66000 (unit normal)
  rands: Float32Array;     // vec3 * 66000
  parts: Float32Array;     // float * 66000 (1..4)
  shades: Float32Array;    // vec2 * 66000 (ridge -1..1, thin 0..1)
  minNonBustX: number;
  maxNonBustX: number;
  counts: {
    total: number;
    bust: number;
    leaves: number;
    visorFrame: number;
    visorLens: number;
  };
}

export interface CameraMetrics {
  fovDeg: number;
  aspect: number;
  cameraZ: number;
  targetY: number;
  worldHeightAtZero: number;
  ringRadiusWorld: number;
}

/** Deterministic PRNG for reproducible sampling, visor jitter, and dust. */
export function createSeededRng(seed = 0x5f3759df): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function isLeafCandidate(x: number, y: number, z: number): boolean {
  if (x <= 0.13 || y <= 0.6) return false;
  const dx = x - 0.02;
  const dz = z + 0.06;
  return dx * dx + dz * dz > 0.035;
}

export function visorTopEdge(x: number, w = VISOR_W): number {
  const u = x / w;
  return 0.378 - 0.022 * u * u;
}

export function visorLowerEdge(x: number, w = VISOR_W): number {
  const u1 = x / 0.034;
  const u2 = x / w;
  return 0.282 + 0.032 * Math.exp(-(u1 * u1)) + 0.026 * u2 * u2 * u2 * u2;
}

export function findVoxelCap(counts: Iterable<number>, targetMinSum: number): number {
  const list: number[] = [];
  let maxCount = 0;
  let totalSum = 0;
  for (const c of counts) {
    if (c > 0) {
      list.push(c);
      if (c > maxCount) maxCount = c;
      totalSum += c;
    }
  }
  if (list.length === 0 || maxCount === 0) return 1;
  if (totalSum <= targetMinSum) return maxCount;

  let lo = 1;
  let hi = maxCount;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    let sum = 0;
    for (let i = 0; i < list.length; i++) {
      sum += list[i] < mid ? list[i] : mid;
    }
    if (sum >= targetMinSum) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}

export function computeCameraMetrics(width: number, height: number): CameraMetrics {
  const safeW = Math.max(width, 1);
  const safeH = Math.max(height, 1);
  const fovDeg = 30;
  const halfFovRad = ((fovDeg * 0.5) * Math.PI) / 180;
  const tanHalf = Math.tan(halfFovRad);
  const aspect = safeW / safeH;
  const cameraZ = Math.max(2.35 / tanHalf, 1.7 / (tanHalf * aspect));
  const targetY = -0.15;
  const worldHeightAtZero = 2 * cameraZ * tanHalf;
  const ringRadiusWorld = 92 * (worldHeightAtZero / safeH);
  return {
    fovDeg,
    aspect,
    cameraZ,
    targetY,
    worldHeightAtZero,
    ringRadiusWorld,
  };
}

/**
 * Generates the exact 66,000-dot point cloud from raw sampled model-space
 * candidate positions and normals (length = CANDIDATE_SAMPLES * 3).
 */
export function buildPointCloudFromSamples(
  samplePositions: Float32Array,
  sampleNormals: Float32Array,
  rng: () => number = createSeededRng(20261115),
): PointCloudData {
  const sampleCount = Math.floor(samplePositions.length / 3);
  if (sampleCount < TOTAL_DOTS) {
    throw new Error(`Expected at least ${TOTAL_DOTS} sample candidates, got ${sampleCount}`);
  }

  // 1. Classify leaf candidates vs bust candidates, and build face height map for visor fit
  const gridMinX = -0.32;
  const gridMaxX = 0.32;
  const gridMinY = 0.2;
  const gridMaxY = 0.45;
  const cell = 0.01;
  const nxGrid = Math.ceil((gridMaxX - gridMinX) / cell);
  const nyGrid = Math.ceil((gridMaxY - gridMinY) / cell);
  const heightMap = new Float32Array(nxGrid * nyGrid);
  heightMap.fill(-Infinity);

  const leafIndices: number[] = [];
  const nonLeafIndices: number[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const i3 = i * 3;
    const x = samplePositions[i3];
    const y = samplePositions[i3 + 1];
    const z = samplePositions[i3 + 2];
    const nrz = sampleNormals[i3 + 2];

    if (nrz >= 0.2 && x >= gridMinX && x < gridMaxX && y >= gridMinY && y < gridMaxY) {
      const gx = clamp(Math.floor((x - gridMinX) / cell), 0, nxGrid - 1);
      const gy = clamp(Math.floor((y - gridMinY) / cell), 0, nyGrid - 1);
      const idx = gy * nxGrid + gx;
      if (z > heightMap[idx]) heightMap[idx] = z;
    }

    if (isLeafCandidate(x, y, z)) {
      leafIndices.push(i);
    } else {
      nonLeafIndices.push(i);
    }
  }

  const faceHeight = (x: number, y: number): number => {
    const cx = clamp(Math.floor((x - gridMinX) / cell), 0, nxGrid - 1);
    const cy = clamp(Math.floor((y - gridMinY) / cell), 0, nyGrid - 1);
    let best = -Infinity;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = cy + dy;
      if (yy < 0 || yy >= nyGrid) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const xx = cx + dx;
        if (xx < 0 || xx >= nxGrid) continue;
        const val = heightMap[yy * nxGrid + xx];
        if (val > best) best = val;
      }
    }
    return best;
  };

  let bridgeMax = -Infinity;
  for (let x = -0.06; x <= 0.0601; x += 0.01) {
    for (let y = 0.30; y <= 0.3601; y += 0.01) {
      const h = faceHeight(x, y);
      if (h > bridgeMax) bridgeMax = h;
    }
  }
  const front = (Number.isFinite(bridgeMax) ? bridgeMax : 0.36) + VISOR_CLEARANCE;

  let wrap = Infinity;
  for (let x = -VISOR_W; x <= VISOR_W + 1e-6; x += 0.01) {
    if (Math.abs(x) < 0.05) continue;
    const topY = visorTopEdge(x);
    const lowY = visorLowerEdge(x);
    let need = -Infinity;
    for (let y = lowY; y <= topY + 1e-6; y += 0.01) {
      const h = faceHeight(x, y);
      if (h > need) need = h;
    }
    if (Number.isFinite(need)) {
      const candidateWrap = (front - need - 0.7 * VISOR_CLEARANCE) / (x * x);
      if (candidateWrap < wrap) wrap = candidateWrap;
    }
  }
  if (!Number.isFinite(wrap) || wrap <= 0) {
    wrap = 2.4;
  }

  // 2. Build visor dots (model space)
  const visorPosX: number[] = [];
  const visorPosY: number[] = [];
  const visorPosZ: number[] = [];
  const visorNormX: number[] = [];
  const visorNormY: number[] = [];
  const visorNormZ: number[] = [];
  const visorPart: number[] = [];

  const pushVisorDot = (
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    part: number,
  ) => {
    const len = Math.hypot(nx, ny, nz) || 1;
    visorPosX.push(x);
    visorPosY.push(y);
    visorPosZ.push(z);
    visorNormX.push(nx / len);
    visorNormY.push(ny / len);
    visorNormZ.push(nz / len);
    visorPart.push(part);
  };

  const zVisor = (x: number) => front - wrap * x * x;

  // Top bar: 950 dots
  for (let i = 0; i < 950; i++) {
    const x = (rng() * 2 - 1) * VISOR_W;
    const t = rng();
    const y = visorTopEdge(x) - t * t * 0.016;
    const z = zVisor(x) + 0.004 + (rng() - 0.5) * 0.002;
    pushVisorDot(x, y, z, 2 * wrap * x, 0, 1, PART_VISOR_FRAME);
  }

  // Lower edge: 380 dots
  for (let i = 0; i < 380; i++) {
    const x = (rng() * 2 - 1) * VISOR_W;
    const y = visorLowerEdge(x) + (rng() - 0.5) * 0.003;
    const z = zVisor(x) + 0.002 + (rng() - 0.5) * 0.002;
    pushVisorDot(x, y, z, 2 * wrap * x, 0, 1, PART_VISOR_FRAME);
  }

  // Left and right end caps: 70 + 70 = 140 dots
  for (const side of [-1, 1]) {
    const ex = side * VISOR_W;
    const topY = visorTopEdge(ex);
    const lowY = visorLowerEdge(ex);
    for (let i = 0; i < 70; i++) {
      const x = ex + (rng() - 0.5) * 0.003;
      const y = lowY + rng() * Math.max(0.004, topY - lowY);
      const z = zVisor(x) + (rng() - 0.5) * 0.003;
      pushVisorDot(x, y, z, 2 * wrap * x, 0, 1, PART_VISOR_FRAME);
    }
  }

  // Lens: 1,500 dots
  for (let i = 0; i < 1500; i++) {
    const x = (rng() * 2 - 1) * VISOR_W;
    const topY = visorTopEdge(x);
    const lowY = visorLowerEdge(x);
    const y = lowY + rng() * Math.max(0.002, topY - lowY);
    const z = zVisor(x) + (rng() - 0.5) * 0.0015;
    pushVisorDot(x, y, z, 2 * wrap * x, 0, 1, PART_VISOR_LENS);
  }

  // Temple arms: 70 + 70 = 140 dots
  for (const side of [-1, 1]) {
    const startX = side * VISOR_W;
    const startY = visorTopEdge(startX) - 0.008;
    const startZ = zVisor(startX);
    for (let i = 0; i < 70; i++) {
      const s = rng();
      const x = startX + side * (0.03 * s) + (rng() - 0.5) * 0.002;
      const y = startY - 0.006 * s + (rng() - 0.5) * 0.002;
      const z = startZ - 0.15 * s + (rng() - 0.5) * 0.002;
      pushVisorDot(x, y, z, side, 0, 0.15, PART_VISOR_FRAME);
    }
  }

  const visorCount = visorPart.length; // 3110
  const maxLeavesAllowed = Math.max(0, TOTAL_DOTS - visorCount);
  const keptLeafCount = Math.min(Math.floor(leafIndices.length * 0.6), maxLeavesAllowed);
  const bustNeeded = Math.max(0, TOTAL_DOTS - visorCount - keptLeafCount);

  // 3. Voxel equalization for bust candidates
  const voxelMap = new Map<string, number[]>();
  for (let i = 0; i < nonLeafIndices.length; i++) {
    const idx = nonLeafIndices[i];
    const i3 = idx * 3;
    const vx = Math.floor(samplePositions[i3] / VOXEL_SIZE);
    const vy = Math.floor(samplePositions[i3 + 1] / VOXEL_SIZE);
    const vz = Math.floor(samplePositions[i3 + 2] / VOXEL_SIZE);
    const key = `${vx},${vy},${vz}`;
    let bucket = voxelMap.get(key);
    if (!bucket) {
      bucket = [];
      voxelMap.set(key, bucket);
    }
    bucket.push(idx);
  }

  const voxelCounts: number[] = [];
  for (const bucket of voxelMap.values()) {
    voxelCounts.push(bucket.length);
  }

  const cap = findVoxelCap(voxelCounts, Math.ceil(1.8 * bustNeeded));
  const equalizedPool: number[] = [];
  for (const bucket of voxelMap.values()) {
    const limit = Math.min(bucket.length, cap);
    for (let i = 0; i < limit; i++) {
      equalizedPool.push(bucket[i]);
    }
  }

  // Deterministic Fisher-Yates shuffle on equalizedPool
  for (let i = equalizedPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = equalizedPool[i];
    equalizedPool[i] = equalizedPool[j];
    equalizedPool[j] = tmp;
  }

  // If equalizedPool is smaller than bustNeeded (edge case on tiny test meshes), top up from nonLeafIndices
  const chosenBust: number[] = equalizedPool.slice(0, bustNeeded);
  if (chosenBust.length < bustNeeded) {
    let cursor = 0;
    while (chosenBust.length < bustNeeded && nonLeafIndices.length > 0) {
      chosenBust.push(nonLeafIndices[cursor % nonLeafIndices.length]);
      cursor++;
    }
  }

  // 4. Assemble combined 66,000 model-space array first for spatial-hash aShade calculation
  const modelPos = new Float32Array(TOTAL_DOTS * 3);
  const modelNorm = new Float32Array(TOTAL_DOTS * 3);
  const parts = new Float32Array(TOTAL_DOTS);

  let writeIdx = 0;
  let visorFrameCount = 0;
  let visorLensCount = 0;

  // Bust
  for (let i = 0; i < chosenBust.length && writeIdx < TOTAL_DOTS; i++) {
    const src = chosenBust[i] * 3;
    const dst = writeIdx * 3;
    modelPos[dst] = samplePositions[src];
    modelPos[dst + 1] = samplePositions[src + 1];
    modelPos[dst + 2] = samplePositions[src + 2];
    const nx = sampleNormals[src];
    const ny = sampleNormals[src + 1];
    const nz = sampleNormals[src + 2];
    const nLen = Math.hypot(nx, ny, nz) || 1;
    modelNorm[dst] = nx / nLen;
    modelNorm[dst + 1] = ny / nLen;
    modelNorm[dst + 2] = nz / nLen;
    parts[writeIdx] = PART_BUST;
    writeIdx++;
  }

  // Leaves (first 60% in sampling order)
  for (let i = 0; i < keptLeafCount && writeIdx < TOTAL_DOTS; i++) {
    const src = leafIndices[i] * 3;
    const dst = writeIdx * 3;
    modelPos[dst] = samplePositions[src];
    modelPos[dst + 1] = samplePositions[src + 1];
    modelPos[dst + 2] = samplePositions[src + 2];
    const nx = sampleNormals[src];
    const ny = sampleNormals[src + 1];
    const nz = sampleNormals[src + 2];
    const nLen = Math.hypot(nx, ny, nz) || 1;
    modelNorm[dst] = nx / nLen;
    modelNorm[dst + 1] = ny / nLen;
    modelNorm[dst + 2] = nz / nLen;
    parts[writeIdx] = PART_LEAVES;
    writeIdx++;
  }

  // Visor
  for (let i = 0; i < visorCount && writeIdx < TOTAL_DOTS; i++) {
    const dst = writeIdx * 3;
    modelPos[dst] = visorPosX[i];
    modelPos[dst + 1] = visorPosY[i];
    modelPos[dst + 2] = visorPosZ[i];
    modelNorm[dst] = visorNormX[i];
    modelNorm[dst + 1] = visorNormY[i];
    modelNorm[dst + 2] = visorNormZ[i];
    const p = visorPart[i];
    parts[writeIdx] = p;
    if (p === PART_VISOR_FRAME) visorFrameCount++;
    else visorLensCount++;
    writeIdx++;
  }

  // 5. Spatial-hash neighborhood shade computation using first half (165,000) of candidates
  const poolSize = Math.min(NEIGHBOR_POOL, sampleCount);
  const BUCKET_COUNT = 524288; // 2^19
  const BUCKET_MASK = BUCKET_COUNT - 1;
  const heads = new Int32Array(BUCKET_COUNT);
  heads.fill(-1);
  const next = new Int32Array(poolSize);

  const hashCell = (cx: number, cy: number, cz: number): number =>
    (((cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791)) >>> 0) & BUCKET_MASK;

  for (let i = 0; i < poolSize; i++) {
    const i3 = i * 3;
    const cx = Math.floor(samplePositions[i3] / SHADE_RADIUS);
    const cy = Math.floor(samplePositions[i3 + 1] / SHADE_RADIUS);
    const cz = Math.floor(samplePositions[i3 + 2] / SHADE_RADIUS);
    const h = hashCell(cx, cy, cz);
    next[i] = heads[h];
    heads[h] = i;
  }

  const ridgeRaw = new Float32Array(writeIdx);
  const absRidge = new Float32Array(writeIdx);
  const neighborCounts = new Float32Array(writeIdx);
  const rSq = SHADE_RADIUS * SHADE_RADIUS;

  for (let i = 0; i < writeIdx; i++) {
    const i3 = i * 3;
    const px = modelPos[i3];
    const py = modelPos[i3 + 1];
    const pz = modelPos[i3 + 2];
    const nx = modelNorm[i3];
    const ny = modelNorm[i3 + 1];
    const nz = modelNorm[i3 + 2];

    const cx = Math.floor(px / SHADE_RADIUS);
    const cy = Math.floor(py / SHADE_RADIUS);
    const cz = Math.floor(pz / SHADE_RADIUS);

    let sumDx = 0;
    let sumDy = 0;
    let sumDz = 0;
    let count = 0;

    for (let dzCell = -1; dzCell <= 1; dzCell++) {
      for (let dyCell = -1; dyCell <= 1; dyCell++) {
        for (let dxCell = -1; dxCell <= 1; dxCell++) {
          let cur = heads[hashCell(cx + dxCell, cy + dyCell, cz + dzCell)];
          while (cur !== -1) {
            const c3 = cur * 3;
            const ddx = samplePositions[c3] - px;
            const ddy = samplePositions[c3 + 1] - py;
            const ddz = samplePositions[c3 + 2] - pz;
            const distSq = ddx * ddx + ddy * ddy + ddz * ddz;
            if (distSq <= rSq) {
              sumDx += ddx;
              sumDy += ddy;
              sumDz += ddz;
              count++;
            }
            cur = next[cur];
          }
        }
      }
    }

    neighborCounts[i] = count;
    if (count > 0) {
      const invCount = 1 / count;
      const dot = (sumDx * invCount) * nx + (sumDy * invCount) * ny + (sumDz * invCount) * nz;
      const val = -dot / SHADE_RADIUS;
      ridgeRaw[i] = val;
      absRidge[i] = Math.abs(val);
    }
  }

  const sortedAbsRidge = Float32Array.from(absRidge).sort();
  const sortedCounts = Float32Array.from(neighborCounts).sort();
  const p90 = Math.max(sortedAbsRidge[Math.min(writeIdx - 1, Math.floor(writeIdx * 0.9))], 1e-4);
  const medianCount = Math.max(sortedCounts[Math.floor(writeIdx * 0.5)], 1);

  const shades = new Float32Array(writeIdx * 2);
  const positions = new Float32Array(writeIdx * 3);
  const rands = new Float32Array(writeIdx * 3);

  let minNonBustX = Infinity;
  let maxNonBustX = -Infinity;

  for (let i = 0; i < writeIdx; i++) {
    const i2 = i * 2;
    const i3 = i * 3;

    shades[i2] = clamp(ridgeRaw[i] / p90, -1, 1);
    shades[i2 + 1] = clamp(1 - neighborCounts[i] / (0.55 * medianCount), 0, 1);

    const wx = modelPos[i3] * MODEL_SCALE;
    const wy = modelPos[i3 + 1] * MODEL_SCALE + MODEL_Y_OFFSET;
    const wz = modelPos[i3 + 2] * MODEL_SCALE;

    positions[i3] = wx;
    positions[i3 + 1] = wy;
    positions[i3 + 2] = wz;

    if (parts[i] >= PART_LEAVES) {
      if (wx < minNonBustX) minNonBustX = wx;
      if (wx > maxNonBustX) maxNonBustX = wx;
    }

    rands[i3] = rng();
    rands[i3 + 1] = rng();
    rands[i3 + 2] = rng();
  }

  if (!Number.isFinite(minNonBustX)) minNonBustX = -0.7;
  if (!Number.isFinite(maxNonBustX)) maxNonBustX = 0.7;

  return {
    positions,
    normals: modelNorm.subarray(0, writeIdx * 3),
    rands,
    parts: parts.subarray(0, writeIdx),
    shades,
    minNonBustX,
    maxNonBustX,
    counts: {
      total: writeIdx,
      bust: chosenBust.length,
      leaves: keptLeafCount,
      visorFrame: visorFrameCount,
      visorLens: visorLensCount,
    },
  };
}

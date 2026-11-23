import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import {
  CANDIDATE_SAMPLES,
  buildPointCloudFromSamples,
  computeCameraMetrics,
  createSeededRng,
} from '@/src/lib/pointCloudBuilder';
import {
  TOUCH_IDLE_DELAY_SEC,
  computeHeadRotationTargets,
  computeIdleLightTarget,
  computeTimelineUniforms,
  dampScalar,
} from '@/src/lib/noaTimeline';
import {
  BUST_FRAGMENT_SHADER,
  BUST_VERTEX_SHADER,
  DUST_FRAGMENT_SHADER,
  DUST_VERTEX_SHADER,
  LIGHT_FRAGMENT_SHADER,
  LIGHT_VERTEX_SHADER,
} from '@/src/lib/noaShaders';

export const NOA_MODEL_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261115_071021_742152ba-5554-4270-9dc5-286bcff36a1a.glb';

export type NoaPhase = 'loading' | 'ready';

interface NoaSceneCanvasProps {
  onProgress: (progress: number) => void;
  onPhaseChange: (phase: NoaPhase) => void;
  onError: () => void;
}

const DUST_COUNT = 900;

// Module-scope reusable math temporaries to keep per-frame allocations at zero
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _lightPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.6);
const _hitPoint = new THREE.Vector3();
const _sampledPos = new THREE.Vector3();
const _sampledNorm = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const rendererString = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererString);
  } catch {
    return true;
  }
}

function srgbColor(hex: string): THREE.Color {
  // ShaderMaterial writes raw output without automatic colorspace transform;
  // pass direct sRGB floats so CSS tokens match pixel-for-pixel.
  const c = new THREE.Color();
  c.setStyle(hex, THREE.LinearSRGBColorSpace);
  return c;
}

export function NoaSceneCanvas({
  onProgress,
  onPhaseChange,
  onError,
}: NoaSceneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onProgress, onPhaseChange, onError });
  callbacksRef.current = { onProgress, onPhaseChange, onError };

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    let disposed = false;
    let frameId = 0;
    let syncTimerId = 0;
    const abortController = new AbortController();

    const isSoftwareGl = detectSoftwareWebGL();
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = reducedMotionQuery.matches;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setClearColor(0x0f110d, 1);
    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);

    const canvas = renderer.domElement;
    canvas.setAttribute('data-testid', 'noa-webgl-canvas');
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    const initW = mount.clientWidth || window.innerWidth || 1440;
    const initH = mount.clientHeight || window.innerHeight || 900;
    const initMetrics = computeCameraMetrics(initW, initH);

    const camera = new THREE.PerspectiveCamera(
      initMetrics.fovDeg,
      initMetrics.aspect,
      0.1,
      100,
    );
    camera.position.set(0, initMetrics.targetY, initMetrics.cameraZ);
    camera.lookAt(0, initMetrics.targetY, 0);
    renderer.setSize(initW, initH, false);

    const colorPaper = srgbColor('#f0e5c8');
    const colorDots = srgbColor('#c9d4b8');
    const colorTech = srgbColor('#7fa8a3');

    const computePixelScale = (heightPx: number): number => {
      const halfFovRad = ((initMetrics.fovDeg * 0.5) * Math.PI) / 180;
      return (heightPx * pixelRatio) / (2 * Math.tan(halfFovRad));
    };

    const initialPixelScale = computePixelScale(initH);

    // 1. Dust particle field (900 drifting particles across room)
    const dustRng = createSeededRng(1777);
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    const dustSeeds = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      const i3 = i * 3;
      dustPositions[i3] = (dustRng() * 2 - 1) * 4.4;
      dustPositions[i3 + 1] = (dustRng() * 2 - 1) * 2.7;
      dustPositions[i3 + 2] = -2.2 + dustRng() * 4.2;
      dustSeeds[i3] = dustRng();
      dustSeeds[i3 + 1] = dustRng();
      dustSeeds[i3 + 2] = dustRng();
    }

    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('aSeed', new THREE.BufferAttribute(dustSeeds, 3));

    const dustUniforms = {
      uMotionTime: { value: 0 },
      uReducedMotion: { value: reducedMotion ? 1 : 0 },
      uPixelScale: { value: initialPixelScale },
      uLightPos: { value: new THREE.Vector3(0, -0.15, 2.6) },
      uLightStrength: { value: 0 },
      uColorDots: { value: colorDots },
      uColorPaper: { value: colorPaper },
    };

    const dustMaterial = new THREE.ShaderMaterial({
      uniforms: dustUniforms,
      vertexShader: DUST_VERTEX_SHADER,
      fragmentShader: DUST_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
    dustPoints.frustumCulled = false;
    scene.add(dustPoints);

    // 2. Cursor light sprite (1 vertex at uLightPos)
    const lightGeometry = new THREE.BufferGeometry();
    lightGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

    const lightUniforms = {
      uLightPos: { value: new THREE.Vector3(0, -0.15, 2.6) },
      uLightStrength: { value: 0 },
      uPixelScale: { value: initialPixelScale },
      uColorPaper: { value: colorPaper },
    };

    const lightMaterial = new THREE.ShaderMaterial({
      uniforms: lightUniforms,
      vertexShader: LIGHT_VERTEX_SHADER,
      fragmentShader: LIGHT_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const lightPoints = new THREE.Points(lightGeometry, lightMaterial);
    lightPoints.frustumCulled = false;
    lightPoints.renderOrder = 2;
    scene.add(lightPoints);

    // 3. Bust point cloud state (populated once GLB finishes streaming + sampling)
    let bustGeometry: THREE.BufferGeometry | null = null;
    let bustMaterial: THREE.ShaderMaterial | null = null;
    let bustPoints: THREE.Points | null = null;
    let minNonBustX = -0.65;
    let maxNonBustX = 0.72;
    let readyAtPerf: number | null = null;

    const bustUniforms = {
      uTime: { value: -1 },
      uMotionTime: { value: 0 },
      uReducedMotion: { value: reducedMotion ? 1 : 0 },
      uRingCenter: { value: new THREE.Vector3(0, initMetrics.targetY, 0) },
      uRingRadius: { value: initMetrics.ringRadiusWorld },
      uHeadRot: { value: new THREE.Vector2(0, 0) },
      uLightPos: { value: new THREE.Vector3(0, -0.15, 2.6) },
      uLightStrength: { value: 0 },
      uShineY: { value: 3.0 },
      uShineActive: { value: 0 },
      uGlintX: { value: -2.0 },
      uGlintActive: { value: 0 },
      uPixelScale: { value: initialPixelScale },
      uColorPaper: { value: colorPaper },
      uColorDots: { value: colorDots },
      uColorTech: { value: colorTech },
    };

    // Pointer tracking state
    let hasActivePointer = false;
    let pointerClientX = initW * 0.5;
    let pointerClientY = initH * 0.5;
    let isTouchInput = false;
    let lastTouchPerf = 0;

    let currentLightX = 0;
    let currentLightY = -0.15;
    let currentRotX = 0;
    let currentRotY = 0;
    let lightStrength = 0;

    const updateSize = () => {
      if (!mount || disposed) return;
      const w = mount.clientWidth || window.innerWidth || 1;
      const h = mount.clientHeight || window.innerHeight || 1;
      const m = computeCameraMetrics(w, h);
      camera.aspect = m.aspect;
      camera.position.set(0, m.targetY, m.cameraZ);
      camera.lookAt(0, m.targetY, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);

      const scale = computePixelScale(h);
      bustUniforms.uPixelScale.value = scale;
      bustUniforms.uRingRadius.value = m.ringRadiusWorld;
      bustUniforms.uRingCenter.value.set(0, m.targetY, 0);
      dustUniforms.uPixelScale.value = scale;
      lightUniforms.uPixelScale.value = scale;
    };

    const onPointerMove = (e: PointerEvent) => {
      hasActivePointer = true;
      pointerClientX = e.clientX;
      pointerClientY = e.clientY;
      if (e.pointerType === 'touch') {
        isTouchInput = true;
        lastTouchPerf = performance.now();
      } else {
        isTouchInput = false;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      hasActivePointer = true;
      pointerClientX = e.clientX;
      pointerClientY = e.clientY;
      if (e.pointerType === 'touch') {
        isTouchInput = true;
        lastTouchPerf = performance.now();
      } else {
        isTouchInput = false;
      }
    };

    const onPointerLeave = () => {
      hasActivePointer = false;
    };

    const onReducedMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      bustUniforms.uReducedMotion.value = reducedMotion ? 1 : 0;
      dustUniforms.uReducedMotion.value = reducedMotion ? 1 : 0;
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('resize', updateSize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('blur', onPointerLeave);
    reducedMotionQuery.addEventListener('change', onReducedMotionChange);
    canvas.addEventListener('webglcontextlost', onContextLost);

    // Paced loop for software WebGL vs smooth rAF on GPU
    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        syncTimerId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          syncTimerId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          syncTimerId = window.setTimeout(cb, 80);
        }
      };
      syncTimerId = window.setTimeout(poll, 5);
    };

    const startPerf = performance.now();
    let prevPerf = startPerf;

    const tick = () => {
      if (disposed) return;

      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - prevPerf) / 1000));
      prevPerf = now;

      const totalElapsed = (now - startPerf) / 1000;
      const elapsedReady = readyAtPerf === null ? -1 : (now - readyAtPerf) / 1000;

      // Determine cursor target on z = 2.6 plane
      let targetLightX = 0;
      let targetLightY = -0.15;

      const touchTimedOut =
        isTouchInput && (now - lastTouchPerf) / 1000 > TOUCH_IDLE_DELAY_SEC;

      if (hasActivePointer && !touchTimedOut && !reducedMotion) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          _ndc.x = ((pointerClientX - rect.left) / rect.width) * 2 - 1;
          _ndc.y = -((pointerClientY - rect.top) / rect.height) * 2 + 1;
          _raycaster.setFromCamera(_ndc, camera);
          if (_raycaster.ray.intersectPlane(_lightPlane, _hitPoint)) {
            targetLightX = THREE.MathUtils.clamp(_hitPoint.x, -3.5, 3.5);
            targetLightY = THREE.MathUtils.clamp(_hitPoint.y, -2.5, 2.5);
          }
        }
      } else if (reducedMotion) {
        targetLightX = 0.28;
        targetLightY = 0.05;
      } else {
        const idle = computeIdleLightTarget(totalElapsed);
        targetLightX = idle.lightX;
        targetLightY = idle.lightY;
      }

      if (reducedMotion) {
        currentLightX = targetLightX;
        currentLightY = targetLightY;
        currentRotX = 0;
        currentRotY = 0;
        lightStrength = elapsedReady >= 0 ? 1 : 0;
      } else {
        currentLightX = dampScalar(currentLightX, targetLightX, dt, 6.2);
        currentLightY = dampScalar(currentLightY, targetLightY, dt, 6.2);

        const headTargets = computeHeadRotationTargets(currentLightX, currentLightY, false);
        currentRotX = dampScalar(currentRotX, headTargets.rotX, dt, 3.4);
        currentRotY = dampScalar(currentRotY, headTargets.rotY, dt, 3.4);

        const targetStrength = elapsedReady >= 0 ? 1 : 0;
        lightStrength = dampScalar(lightStrength, targetStrength, dt, 2.5);
      }

      const timeline = computeTimelineUniforms(
        Math.max(0, elapsedReady),
        minNonBustX,
        maxNonBustX,
        reducedMotion,
      );

      dustUniforms.uMotionTime.value = totalElapsed;
      dustUniforms.uLightPos.value.set(currentLightX, currentLightY, 2.6);
      dustUniforms.uLightStrength.value = lightStrength;

      lightUniforms.uLightPos.value.set(currentLightX, currentLightY, 2.6);
      lightUniforms.uLightStrength.value = lightStrength;

      if (readyAtPerf !== null) {
        bustUniforms.uTime.value = elapsedReady;
        bustUniforms.uMotionTime.value = totalElapsed;
        bustUniforms.uHeadRot.value.set(currentRotX, currentRotY);
        bustUniforms.uLightPos.value.set(currentLightX, currentLightY, 2.6);
        bustUniforms.uLightStrength.value = lightStrength;
        bustUniforms.uShineY.value = timeline.shineY;
        bustUniforms.uShineActive.value = timeline.shineActive;
        bustUniforms.uGlintX.value = timeline.glintX;
        bustUniforms.uGlintActive.value = timeline.glintActive;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = requestAnimationFrame(tick);
    }

    // Stream and sample the 3D bust GLB
    const loadAndSampleModel = async () => {
      try {
        const response = await fetch(NOA_MODEL_URL, {
          signal: abortController.signal,
          mode: 'cors',
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentLengthHeader = response.headers.get('content-length');
        const totalBytes = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : 0;

        let arrayBuffer: ArrayBuffer;
        if (response.body) {
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let receivedBytes = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (disposed) return;
            if (done) break;
            if (value) {
              chunks.push(value);
              receivedBytes += value.byteLength;
              const pct =
                totalBytes > 0
                  ? Math.min(0.99, receivedBytes / totalBytes)
                  : Math.min(0.95, receivedBytes / 1_500_000);
              callbacksRef.current.onProgress(pct);
            }
          }

          const merged = new Uint8Array(receivedBytes);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
          }
          arrayBuffer = merged.buffer;
        } else {
          arrayBuffer = await response.arrayBuffer();
        }

        if (disposed) return;

        const loader = new GLTFLoader();
        const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
          loader.parse(arrayBuffer, '', resolve, reject);
        });
        if (disposed) return;

        gltf.scene.updateMatrixWorld(true);
        let sourceMesh: THREE.Mesh | null = null;
        gltf.scene.traverse((obj) => {
          if (!sourceMesh && (obj as THREE.Mesh).isMesh) {
            sourceMesh = obj as THREE.Mesh;
          }
        });

        if (!sourceMesh) {
          throw new Error('GLB contained no mesh');
        }

        const mesh = sourceMesh as THREE.Mesh;
        const clonedGeometry = mesh.geometry.clone();
        clonedGeometry.applyMatrix4(mesh.matrixWorld);
        if (!clonedGeometry.attributes.normal) {
          clonedGeometry.computeVertexNormals();
        }

        const samplerMesh = new THREE.Mesh(clonedGeometry);
        const sampler = new MeshSurfaceSampler(samplerMesh).build();

        const samplePositions = new Float32Array(CANDIDATE_SAMPLES * 3);
        const sampleNormals = new Float32Array(CANDIDATE_SAMPLES * 3);

        for (let i = 0; i < CANDIDATE_SAMPLES; i++) {
          sampler.sample(_sampledPos, _sampledNorm);
          const i3 = i * 3;
          samplePositions[i3] = _sampledPos.x;
          samplePositions[i3 + 1] = _sampledPos.y;
          samplePositions[i3 + 2] = _sampledPos.z;
          sampleNormals[i3] = _sampledNorm.x;
          sampleNormals[i3 + 1] = _sampledNorm.y;
          sampleNormals[i3 + 2] = _sampledNorm.z;
        }

        clonedGeometry.dispose();

        if (disposed) return;

        const cloud = buildPointCloudFromSamples(samplePositions, sampleNormals);
        minNonBustX = cloud.minNonBustX;
        maxNonBustX = cloud.maxNonBustX;

        bustGeometry = new THREE.BufferGeometry();
        bustGeometry.setAttribute('position', new THREE.BufferAttribute(cloud.positions, 3));
        bustGeometry.setAttribute('aNormal', new THREE.BufferAttribute(cloud.normals, 3));
        bustGeometry.setAttribute('aRand', new THREE.BufferAttribute(cloud.rands, 3));
        bustGeometry.setAttribute('aPart', new THREE.BufferAttribute(cloud.parts, 1));
        bustGeometry.setAttribute('aShade', new THREE.BufferAttribute(cloud.shades, 2));

        bustMaterial = new THREE.ShaderMaterial({
          uniforms: bustUniforms,
          vertexShader: BUST_VERTEX_SHADER,
          fragmentShader: BUST_FRAGMENT_SHADER,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        bustPoints = new THREE.Points(bustGeometry, bustMaterial);
        bustPoints.frustumCulled = false;
        bustPoints.renderOrder = 1;
        scene.add(bustPoints);

        if (!isSoftwareGl) {
          renderer.compile(scene, camera);
        }

        callbacksRef.current.onProgress(1);
        readyAtPerf = performance.now();
        callbacksRef.current.onPhaseChange('ready');
      } catch (err) {
        if (disposed) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        callbacksRef.current.onError();
      }
    };

    void loadAndSampleModel();

    return () => {
      disposed = true;
      abortController.abort();
      cancelAnimationFrame(frameId);
      clearTimeout(syncTimerId);

      window.removeEventListener('resize', updateSize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
      reducedMotionQuery.removeEventListener('change', onReducedMotionChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);

      dustGeometry.dispose();
      dustMaterial.dispose();
      lightGeometry.dispose();
      lightMaterial.dispose();
      bustGeometry?.dispose();
      bustMaterial?.dispose();
      renderer.dispose();

      if (canvas.parentElement === mount) {
        mount.removeChild(canvas);
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

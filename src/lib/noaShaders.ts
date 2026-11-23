export const BUST_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aNormal;
  attribute vec3 aRand;
  attribute float aPart;
  attribute vec2 aShade;

  uniform float uTime;
  uniform float uMotionTime;
  uniform float uReducedMotion;
  uniform vec3 uRingCenter;
  uniform float uRingRadius;
  uniform vec2 uHeadRot;
  uniform vec3 uLightPos;
  uniform float uLightStrength;
  uniform float uShineY;
  uniform float uShineActive;
  uniform float uGlintX;
  uniform float uGlintActive;
  uniform float uPixelScale;

  uniform vec3 uColorPaper;
  uniform vec3 uColorDots;
  uniform vec3 uColorTech;

  varying vec3 vColor;
  varying float vAlpha;

  vec3 rotateHead(vec3 p, vec2 rot, vec3 pivot) {
    vec3 q = p - pivot;
    float cy = cos(rot.y);
    float sy = sin(rot.y);
    float cx = cos(rot.x);
    float sx = sin(rot.x);
    // Pitch (x) then Yaw (y)
    float y1 = q.y * cx - q.z * sx;
    float z1 = q.y * sx + q.z * cx;
    float x2 = q.x * cy + z1 * sy;
    float z2 = -q.x * sy + z1 * cy;
    return vec3(x2, y1, z2) + pivot;
  }

  vec3 rotateDir(vec3 d, vec2 rot) {
    float cy = cos(rot.y);
    float sy = sin(rot.y);
    float cx = cos(rot.x);
    float sx = sin(rot.x);
    float y1 = d.y * cx - d.z * sx;
    float z1 = d.y * sx + d.z * cx;
    float x2 = d.x * cy + z1 * sy;
    float z2 = -d.x * sy + z1 * cy;
    return normalize(vec3(x2, y1, z2));
  }

  void main() {
    vec3 pivot = vec3(0.0, -0.15, 0.0);

    // 1. Ring position matching 12-o'clock clockwise 92px loader ring
    float ringAngle = 1.57079632679 - aRand.x * 6.28318530718;
    vec3 ringPos = uRingCenter + vec3(cos(ringAngle), sin(ringAngle), 0.0) * uRingRadius;

    // 2. Head-rotated bust target position & normal
    vec3 targetPos = rotateHead(position, uHeadRot, pivot);
    vec3 rotNorm = rotateDir(aNormal, uHeadRot);

    // 3. Per-dot assemble wave + graceful +Z arc into place
    float readyMask = step(0.0, uTime);
    float delay = aRand.x * 0.45;
    float dur = 1.05 + aRand.y * 0.20;
    float rawP = uReducedMotion > 0.5
      ? readyMask
      : clamp((uTime - delay) / dur, 0.0, 1.0) * readyMask;
    float invP = 1.0 - rawP;
    float easeP = 1.0 - invP * invP * invP;

    float arcBell = sin(easeP * 3.14159265);
    vec3 arcOffset = vec3(
      cos(ringAngle) * 0.10,
      sin(ringAngle) * 0.06 + 0.04,
      0.46 + 0.56 * aRand.z
    ) * arcBell;

    vec3 worldPos = mix(ringPos, targetPos, easeP) + arcOffset;

    // Subtle organic breathing motion after landing
    float breathe = sin(uMotionTime * 0.9 + aRand.y * 6.28318) * 0.004 * easeP * (1.0 - uReducedMotion);
    worldPos.y += breathe;

    // 4. Camera & ambient form lighting
    vec3 viewDir = normalize(cameraPosition - worldPos);
    float facing = max(dot(rotNorm, viewDir), 0.0);
    float rim = pow(1.0 - facing, 2.2);

    vec3 keyDir = normalize(vec3(0.32, 0.52, 0.80));
    float keyLight = max(dot(rotNorm, keyDir) * 0.65 + 0.35, 0.05);

    float ridge = aShade.x;
    float thin = aShade.y;

    float baseIntensity = 0.20 + 0.44 * keyLight + 0.16 * facing + 0.18 * rim;
    baseIntensity += ridge * 0.22 + thin * 0.18;

    // 5. Cursor light proximity & wrap diffuse
    vec3 toLight = uLightPos - worldPos;
    float lightDist = length(toLight);
    vec3 lightDir = toLight / max(lightDist, 0.0001);
    float lightFalloff = exp(-lightDist * lightDist * 0.26);
    float lightWrap = max(dot(rotNorm, lightDir) * 0.72 + 0.28, 0.08);
    float cursorGlow = lightFalloff * lightWrap * uLightStrength;

    // 6. Subtle dot twinkle
    float twinkle = 0.95 + 0.05 * sin(uMotionTime * 1.45 + aRand.z * 6.28318) * (1.0 - uReducedMotion);

    // 7. Diagonal intro shine band (plays once as assembly settles)
    float shineDist = worldPos.y - worldPos.x * 0.42 - uShineY;
    float shineBand = exp(-shineDist * shineDist * 13.0) * uShineActive;

    // 8. Periodic sage glint across visor (3, 4) and leaves (2)
    float isAccent = step(1.5, aPart);
    float isVisorFrame = step(2.5, aPart) * (1.0 - step(3.5, aPart));
    float isVisorLens = step(3.5, aPart);
    float isLeaves = step(1.5, aPart) * (1.0 - step(2.5, aPart));

    float glintCoord = worldPos.x + (worldPos.y - 0.15) * 0.16 - uGlintX;
    float glintBand = exp(-glintCoord * glintCoord * 75.0) * uGlintActive * isAccent;

    // 9. Color mixing
    vec3 ink = uColorDots;
    // Slight botanical richness on leaves & crisp frame highlight
    ink = mix(ink, mix(uColorDots, uColorTech, 0.28), isLeaves * 0.55);
    ink = mix(ink, uColorTech, isVisorLens * 0.72);
    ink = mix(ink, mix(uColorDots, uColorPaper, 0.35), isVisorFrame * 0.4);

    // Cursor light & intro shine pull dots toward cream paper
    float warmMix = clamp(cursorGlow * 0.85 + shineBand * 0.95, 0.0, 1.0);
    ink = mix(ink, uColorPaper, warmMix);

    // Sage glint flashes visor and leaves toward #7fa8a3
    ink = mix(ink, uColorTech, clamp(glintBand * 1.15, 0.0, 1.0));

    float brightness = (baseIntensity + cursorGlow * 1.05 + shineBand * 0.85 + glintBand * 1.15) * twinkle;

    // 10. Alpha & lens subtlety
    float lensAlpha = mix(1.0, 0.36 + 0.34 * cursorGlow + 0.55 * glintBand, isVisorLens);
    float flightFade = smoothstep(0.0, 0.05, rawP) * readyMask;
    float alpha = clamp(brightness * 0.78 * lensAlpha * flightFade, 0.0, 0.95);

    vColor = ink;
    vAlpha = alpha;

    // 11. World -> clip transform & crisp point sizing
    vec4 mvPos = modelViewMatrix * vec4(worldPos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float depth = max(-mvPos.z, 0.1);
    float baseDotRadius = 0.0082 + 0.0030 * aRand.z;
    baseDotRadius *= mix(1.0, 0.78, isVisorLens);
    baseDotRadius *= 1.0 + 0.38 * cursorGlow + 0.34 * shineBand + 0.45 * glintBand;

    float ptSize = (baseDotRadius * uPixelScale) / depth;
    gl_PointSize = clamp(ptSize, 1.25, 9.5) * step(0.001, flightFade);
  }
`;

export const BUST_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (vAlpha <= 0.002) discard;
    vec2 centered = gl_PointCoord - vec2(0.5);
    float r = length(centered);
    if (r > 0.5) discard;
    float falloff = smoothstep(0.5, 0.06, r);
    float core = falloff * falloff * 0.35 + falloff * 0.65;
    gl_FragColor = vec4(vColor, vAlpha * core);
  }
`;

export const LIGHT_VERTEX_SHADER = /* glsl */ `
  uniform vec3 uLightPos;
  uniform float uLightStrength;
  uniform float uPixelScale;

  void main() {
    vec4 mvPos = modelViewMatrix * vec4(uLightPos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    float depth = max(-mvPos.z, 0.2);
    gl_PointSize = clamp((0.26 * uPixelScale / depth) * uLightStrength, 0.0, 92.0);
  }
`;

export const LIGHT_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorPaper;
  uniform float uLightStrength;

  void main() {
    if (uLightStrength <= 0.01) discard;
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float core = exp(-d * d * 42.0) * 0.72;
    float halo = exp(-d * d * 9.0) * 0.16;
    float alpha = (core + halo) * uLightStrength;
    gl_FragColor = vec4(uColorPaper, alpha);
  }
`;

export const DUST_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aSeed;

  uniform float uMotionTime;
  uniform float uReducedMotion;
  uniform float uPixelScale;
  uniform vec3 uLightPos;
  uniform float uLightStrength;

  varying float vAlpha;
  varying float vWarm;

  void main() {
    float spanY = 5.4;
    float speed = 0.045 + aSeed.x * 0.065;
    float travel = uReducedMotion > 0.5 ? 0.0 : uMotionTime * speed;
    float y = mod(position.y + travel + spanY * 0.5, spanY) - spanY * 0.5;
    float sway = uReducedMotion > 0.5 ? 0.0 : sin(uMotionTime * 0.35 + aSeed.y * 6.28318) * 0.09;
    vec3 worldPos = vec3(position.x + sway, y, position.z);

    float dist = length(uLightPos - worldPos);
    float nearLight = exp(-dist * dist * 0.45) * uLightStrength;
    vWarm = nearLight * 0.65;

    float edgeFade = smoothstep(2.7, 1.8, abs(y));
    float flicker = 0.75 + 0.25 * sin(uMotionTime * 0.8 + aSeed.z * 6.28318);
    vAlpha = (0.10 + 0.12 * aSeed.z + 0.22 * nearLight) * edgeFade * flicker;

    vec4 mvPos = modelViewMatrix * vec4(worldPos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    float depth = max(-mvPos.z, 0.2);
    gl_PointSize = clamp(((0.008 + 0.010 * aSeed.z) * uPixelScale) / depth, 1.2, 5.5);
  }
`;

export const DUST_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorDots;
  uniform vec3 uColorPaper;

  varying float vAlpha;
  varying float vWarm;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.04, d);
    vec3 col = mix(uColorDots, uColorPaper, vWarm);
    gl_FragColor = vec4(col, vAlpha * soft);
  }
`;

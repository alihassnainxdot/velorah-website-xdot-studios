export interface CursorPoint {
  x: number;
  y: number;
}

export interface CursorScaleState {
  isHoveringInteractive: boolean;
  isPressed: boolean;
}

export function lerpValue(start: number, end: number, factor: number): number {
  const clampedFactor = Math.min(1, Math.max(0, factor));
  return start + (end - start) * clampedFactor;
}

export function lerpCursor(
  current: CursorPoint,
  target: CursorPoint,
  factor: number
): CursorPoint {
  return {
    x: lerpValue(current.x, target.x, factor),
    y: lerpValue(current.y, target.y, factor),
  };
}

export function hasCursorConverged(
  current: CursorPoint,
  target: CursorPoint,
  epsilon = 0.15
): boolean {
  return (
    Math.abs(target.x - current.x) <= epsilon &&
    Math.abs(target.y - current.y) <= epsilon
  );
}

export function getCursorScale({
  isHoveringInteractive,
  isPressed,
}: CursorScaleState): number {
  if (isPressed) {
    return 0.75;
  }
  if (isHoveringInteractive) {
    return 1.65;
  }
  return 1;
}

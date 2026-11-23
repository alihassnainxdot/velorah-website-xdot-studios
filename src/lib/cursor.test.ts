import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCursorScale,
  hasCursorConverged,
  lerpCursor,
  lerpValue,
} from './cursor';

test('lerpValue interpolates and clamps factor between 0 and 1', () => {
  assert.equal(lerpValue(0, 100, 0.25), 25);
  assert.equal(lerpValue(0, 100, -1), 0);
  assert.equal(lerpValue(0, 100, 2), 100);
});

test('lerpCursor moves smoothly toward target coordinates', () => {
  const next = lerpCursor({ x: 10, y: 20 }, { x: 110, y: 220 }, 0.2);
  assert.equal(next.x, 30);
  assert.equal(next.y, 60);
});

test('hasCursorConverged detects when delta falls within epsilon', () => {
  assert.equal(hasCursorConverged({ x: 100, y: 200 }, { x: 100.1, y: 199.95 }), true);
  assert.equal(hasCursorConverged({ x: 100, y: 200 }, { x: 102, y: 200 }), false);
});

test('getCursorScale prioritizes pressed state, then interactive hover, then default', () => {
  assert.equal(
    getCursorScale({ isHoveringInteractive: false, isPressed: false }),
    1
  );
  assert.equal(
    getCursorScale({ isHoveringInteractive: true, isPressed: false }),
    1.65
  );
  assert.equal(
    getCursorScale({ isHoveringInteractive: true, isPressed: true }),
    0.75
  );
});

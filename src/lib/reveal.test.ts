import test from 'node:test';
import assert from 'node:assert/strict';
import { getRevealClassName, shouldRevealFromEntries } from './reveal';

test('shouldRevealFromEntries returns true when any entry is intersecting', () => {
  assert.equal(shouldRevealFromEntries([{ isIntersecting: false }]), false);
  assert.equal(
    shouldRevealFromEntries([
      { isIntersecting: false, intersectionRatio: 0 },
      { isIntersecting: true, intersectionRatio: 0.2 },
    ]),
    true
  );
  assert.equal(
    shouldRevealFromEntries([{ isIntersecting: false, intersectionRatio: 0.05 }]),
    true
  );
});

test('getRevealClassName switches cleanly between hidden and revealed classes', () => {
  assert.equal(
    getRevealClassName(false, 'animate-fade-rise'),
    'opacity-0 translate-y-6'
  );
  assert.equal(
    getRevealClassName(true, 'animate-fade-rise'),
    'animate-fade-rise'
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NAV_ITEMS,
  resolveNavSelection,
  SECTION_DETAILS,
  validateJourneyRequest,
} from './velorah';

test('NAV_ITEMS contains the 5 required navigation links in order', () => {
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.label),
    ['Home', 'Studio', 'About', 'Journal', 'Reach Us']
  );
});

test('resolveNavSelection sets home with no open modal and opens detail for other sections', () => {
  assert.deepEqual(resolveNavSelection('home'), {
    activeNav: 'home',
    openSection: null,
  });

  for (const id of ['studio', 'about', 'journal', 'reach-us'] as const) {
    assert.deepEqual(resolveNavSelection(id), {
      activeNav: id,
      openSection: id,
    });
    assert.ok(SECTION_DETAILS[id].title.length > 0);
  }

  assert.equal(SECTION_DETAILS.about.title, 'About XDOT');
  assert.deepEqual(SECTION_DETAILS['reach-us'].highlights, [
    { label: 'Direct Correspondence', detail: 'xdotstudios@proton.me' },
    { label: 'Hours', detail: '24 / 7' },
  ]);
});

test('validateJourneyRequest rejects empty or malformed inputs', () => {
  const empty = validateJourneyRequest({ name: '', email: '', intention: '' });
  assert.equal(empty.valid, false);
  assert.ok(empty.errors.name);
  assert.ok(empty.errors.email);

  const badEmail = validateJourneyRequest({
    name: 'Elena',
    email: 'not-an-email',
    intention: 'Writing',
  });
  assert.equal(badEmail.valid, false);
  assert.equal(badEmail.errors.name, undefined);
  assert.ok(badEmail.errors.email);
});

test('validateJourneyRequest accepts valid trimmed inputs', () => {
  const valid = validateJourneyRequest({
    name: '  Elena Vance  ',
    email: 'elena@example.com',
    intention: 'Deep research workspace',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

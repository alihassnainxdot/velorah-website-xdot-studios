export type NavSectionId = 'home' | 'studio' | 'about' | 'journal' | 'reach-us';

export interface NavItem {
  id: NavSectionId;
  label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'studio', label: 'Studio' },
  { id: 'about', label: 'About' },
  { id: 'journal', label: 'Journal' },
  { id: 'reach-us', label: 'Reach Us' },
] as const;

export const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4';

export interface SectionDetail {
  id: Exclude<NavSectionId, 'home'>;
  title: string;
  lead: string;
  body: string;
  highlights: readonly { label: string; detail: string }[];
}

export const SECTION_DETAILS: Record<Exclude<NavSectionId, 'home'>, SectionDetail> = {
  studio: {
    id: 'studio',
    title: 'The Studio',
    lead: 'Quiet instruments crafted for unhurried clarity.',
    body: 'XDOT Studio shapes focused software environments free from notification noise, algorithmic feeds, and visual clutter. Every surface is built to preserve flow state.',
    highlights: [
      { label: 'Focus Canvas', detail: 'Distraction-free spatial writing and synthesis.' },
      { label: 'Ambient Audio', detail: 'Subtle acoustic rooms tailored for deep sessions.' },
      { label: 'Private Archives', detail: 'Local-first storage with zero tracking telemetry.' },
    ],
  },
  about: {
    id: 'about',
    title: 'About XDOT',
    lead: 'Built for deep thinkers, bold creators, and quiet rebels.',
    body: 'Founded on the conviction that meaningful work happens away from the clamor, XDOT brings together typographic craft, calm motion, and deliberate tooling.',
    highlights: [
      { label: 'Philosophy', detail: 'Silence is not empty; it is room for signal.' },
      { label: 'Craft', detail: 'Measured pacing, tactile glass, and legible prose.' },
      { label: 'Independent', detail: 'Designed directly with working writers and makers.' },
    ],
  },
  journal: {
    id: 'journal',
    title: 'Journal',
    lead: 'Essays on attention, creative solitude, and digital craft.',
    body: 'Notes from our ongoing research into slow computing, nocturnal creative rituals, and interfaces that step out of the way.',
    highlights: [
      { label: 'Issue 04 · November 2026', detail: 'Designing Software That Knows When to Stay Quiet' },
      { label: 'Issue 03 · October 2026', detail: 'The Architecture of Uninterrupted Mornings' },
      { label: 'Issue 02 · September 2026', detail: 'Why Typography Sets the Tempo of Thought' },
    ],
  },
  'reach-us': {
    id: 'reach-us',
    title: 'Reach Us',
    lead: 'Start a conversation with the XDOT team.',
    body: 'Whether you are exploring early studio membership, creative partnerships, or press inquiries, we read every note personally.',
    highlights: [
      { label: 'Direct Correspondence', detail: 'xdotstudios@proton.me' },
      { label: 'Hours', detail: '24 / 7' },
    ],
  },
};

export interface JourneyFormInput {
  name: string;
  email: string;
  intention: string;
}

export interface JourneyValidationResult {
  valid: boolean;
  errors: {
    name?: string;
    email?: string;
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateJourneyRequest(input: JourneyFormInput): JourneyValidationResult {
  const errors: JourneyValidationResult['errors'] = {};
  const trimmedName = input.name.trim();
  const trimmedEmail = input.email.trim();

  if (trimmedName.length < 2) {
    errors.name = 'Please enter your name (at least 2 characters).';
  }

  if (!trimmedEmail) {
    errors.email = 'Please enter your email address.';
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function resolveNavSelection(id: NavSectionId): {
  activeNav: NavSectionId;
  openSection: Exclude<NavSectionId, 'home'> | null;
} {
  if (id === 'home') {
    return { activeNav: 'home', openSection: null };
  }
  return { activeNav: id, openSection: id };
}

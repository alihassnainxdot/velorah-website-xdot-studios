export interface RevealEntryLike {
  isIntersecting: boolean;
  intersectionRatio?: number;
}

export function shouldRevealFromEntries(entries: readonly RevealEntryLike[]): boolean {
  return entries.some(
    (entry) => entry.isIntersecting || (entry.intersectionRatio ?? 0) > 0
  );
}

export function getRevealClassName(
  isRevealed: boolean,
  revealedClass: string,
  hiddenClass = 'opacity-0 translate-y-6'
): string {
  return isRevealed ? revealedClass : hiddenClass;
}

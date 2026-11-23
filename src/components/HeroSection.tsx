import { Button } from '@/components/ui/button';
import { useScrollReveal } from '@/src/hooks/useScrollReveal';
import { getRevealClassName } from '@/src/lib/reveal';

interface HeroSectionProps {
  onBeginJourney: () => void;
}

export function HeroSection({ onBeginJourney }: HeroSectionProps) {
  const headingReveal = useScrollReveal<HTMLHeadingElement>({ threshold: 0.1 });
  const subtextReveal = useScrollReveal<HTMLParagraphElement>({ threshold: 0.1 });
  const ctaReveal = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-40 py-[90px]">
      <h1
        ref={headingReveal.ref}
        data-revealed={String(headingReveal.isRevealed)}
        className={`text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-7xl font-normal text-foreground text-balance ${getRevealClassName(
          headingReveal.isRevealed,
          'animate-fade-rise'
        )}`}
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        Where <em className="not-italic text-muted-foreground">dreams</em> rise{' '}
        <em className="not-italic text-muted-foreground">through the silence.</em>
      </h1>

      <p
        ref={subtextReveal.ref}
        data-revealed={String(subtextReveal.isRevealed)}
        className={`text-muted-foreground text-base sm:text-lg max-w-2xl mt-8 leading-relaxed ${getRevealClassName(
          subtextReveal.isRevealed,
          'animate-fade-rise-delay'
        )}`}
      >
        We&apos;re designing tools for deep thinkers, bold creators, and quiet rebels. Amid the
        chaos, we build digital spaces for sharp focus and inspired work.
      </p>

      <div
        ref={ctaReveal.ref}
        data-revealed={String(ctaReveal.isRevealed)}
        className={`mt-12 ${getRevealClassName(
          ctaReveal.isRevealed,
          'animate-fade-rise-delay-2'
        )}`}
      >
        <Button
          type="button"
          variant="liquid"
          size="none"
          onClick={onBeginJourney}
          className="rounded-full px-14 py-5 text-base text-foreground hover:scale-[1.03] cursor-pointer"
        >
          Begin Journey
        </Button>
      </div>
    </main>
  );
}

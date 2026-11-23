import { DiaText } from '@/components/ui/dia-text';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { useScrollReveal } from '@/src/hooks/useScrollReveal';
import { getRevealClassName } from '@/src/lib/reveal';

interface HeroSectionProps {
  onBeginJourney: () => void;
}

const TAGLINE_WORDS = ['anywhere.', 'anytime.', 'in focus.', 'beyond noise.'];

export function HeroSection({ onBeginJourney }: HeroSectionProps) {
  const headingReveal = useScrollReveal<HTMLHeadingElement>({ threshold: 0.1 });
  const subtextReveal = useScrollReveal<HTMLParagraphElement>({ threshold: 0.1 });
  const ctaReveal = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-40 py-[90px]">
      <h1
        ref={headingReveal.ref}
        data-revealed={String(headingReveal.isRevealed)}
        className="text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-7xl font-normal text-foreground text-balance"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        <DiaText
          duration={1.35}
          textColor="#ffffff"
          text="Meet XDOT, he got you"
        />{' '}
        <DiaText
          repeat
          repeatDelay={0.9}
          duration={1.35}
          delay={0.2}
          textColor="#ffffff"
          text={TAGLINE_WORDS}
        />
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
        <LiquidMetalButton
          label="Begin Journey"
          onClick={onBeginJourney}
          size="lg"
        />
      </div>
    </main>
  );
}

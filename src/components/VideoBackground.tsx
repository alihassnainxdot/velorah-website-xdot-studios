import { HERO_VIDEO_URL } from '@/src/lib/velorah';

export function VideoBackground() {
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      data-testid="hero-background-video"
      className="absolute inset-0 w-full h-full object-cover z-0"
      src={HERO_VIDEO_URL}
    />
  );
}

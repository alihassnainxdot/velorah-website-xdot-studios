import { useState } from 'react';
import { CustomCursor } from '@/src/components/CustomCursor';
import { HeroSection } from '@/src/components/HeroSection';
import { JourneyDialog } from '@/src/components/JourneyDialog';
import { Navbar } from '@/src/components/Navbar';
import { SectionDialog } from '@/src/components/SectionDialog';
import { VideoBackground } from '@/src/components/VideoBackground';
import { resolveNavSelection, type NavSectionId } from '@/src/lib/velorah';

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSectionId>('home');
  const [openSection, setOpenSection] = useState<Exclude<NavSectionId, 'home'> | null>(null);
  const [journeyOpen, setJourneyOpen] = useState(false);

  const handleSelectNav = (id: NavSectionId) => {
    const next = resolveNavSelection(id);
    setActiveNav(next.activeNav);
    setOpenSection(next.openSection);
  };

  const handleCloseSection = () => {
    setActiveNav('home');
    setOpenSection(null);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background flex flex-col">
      <CustomCursor />
      <VideoBackground />

      <Navbar
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        onBeginJourney={() => setJourneyOpen(true)}
      />

      <HeroSection onBeginJourney={() => setJourneyOpen(true)} />

      <SectionDialog
        sectionId={openSection}
        onClose={handleCloseSection}
        onBeginJourney={() => setJourneyOpen(true)}
      />

      <JourneyDialog open={journeyOpen} onOpenChange={setJourneyOpen} />
    </div>
  );
}

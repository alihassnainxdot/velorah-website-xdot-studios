import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { NAV_ITEMS, type NavSectionId } from '@/src/lib/velorah';

interface NavbarProps {
  activeNav: NavSectionId;
  onSelectNav: (id: NavSectionId) => void;
  onBeginJourney: () => void;
}

export function Navbar({ activeNav, onSelectNav, onBeginJourney }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileNavClick = (id: NavSectionId) => {
    setMobileMenuOpen(false);
    onSelectNav(id);
  };

  const handleMobileBeginJourney = () => {
    setMobileMenuOpen(false);
    onBeginJourney();
  };

  return (
    <header className="relative z-10 w-full">
      <div className="flex items-center justify-between px-6 sm:px-8 py-6 max-w-7xl mx-auto">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onSelectNav('home');
          }}
          className="text-3xl tracking-tight text-foreground whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          XDOT<sup className="text-xs">®</sup>
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-8"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm ${
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="liquid"
            size="none"
            onClick={onBeginJourney}
            className="rounded-full px-5 py-2 sm:px-6 sm:py-2.5 text-sm text-foreground hover:scale-[1.03]"
          >
            Begin Journey
          </Button>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  type="button"
                  variant="liquid"
                  size="icon"
                  aria-label="Open navigation menu"
                  className="md:hidden size-10 rounded-full text-foreground"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-background/95 border-border text-foreground"
            >
              <SheetHeader className="pt-8">
                <SheetTitle
                  className="text-2xl font-normal tracking-tight text-foreground"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  XDOT<sup className="text-xs">®</sup>
                </SheetTitle>
                <SheetDescription className="text-muted-foreground">
                  Navigate the studio.
                </SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile navigation" className="flex flex-col gap-3 px-4 py-4">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleMobileNavClick(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`text-left py-2.5 text-base transition-colors cursor-pointer ${
                        isActive
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
              <div className="px-4 pt-2">
                <Button
                  type="button"
                  variant="liquid"
                  size="none"
                  onClick={handleMobileBeginJourney}
                  className="w-full rounded-full px-6 py-3 text-sm text-foreground"
                >
                  Begin Journey
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

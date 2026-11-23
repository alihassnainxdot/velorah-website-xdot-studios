import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SECTION_DETAILS, type NavSectionId } from '@/src/lib/velorah';

interface SectionDialogProps {
  sectionId: Exclude<NavSectionId, 'home'> | null;
  onClose: () => void;
  onBeginJourney: () => void;
}

export function SectionDialog({ sectionId, onClose, onBeginJourney }: SectionDialogProps) {
  const detail = sectionId ? SECTION_DETAILS[sectionId] : null;

  return (
    <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-background/95 border border-border text-foreground p-6 rounded-2xl">
        {detail && (
          <>
            <DialogHeader className="gap-2">
              <DialogTitle
                className="text-3xl font-normal tracking-tight text-foreground"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {detail.title}
              </DialogTitle>
              <DialogDescription className="text-foreground/85 text-sm">
                {detail.lead}
              </DialogDescription>
            </DialogHeader>

            <p className="text-sm text-muted-foreground leading-relaxed">{detail.body}</p>

            <div className="divide-y divide-border border-y border-border my-1">
              {detail.highlights.map((item) => (
                <div key={item.label} className="py-3 flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-sm text-foreground">{item.detail}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Back to Home
              </button>
              <Button
                type="button"
                variant="liquid"
                size="none"
                onClick={() => {
                  onClose();
                  onBeginJourney();
                }}
                className="rounded-full px-6 py-2.5 text-sm text-foreground"
              >
                Begin Journey
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  validateJourneyRequest,
  type JourneyValidationResult,
} from '@/src/lib/velorah';

interface JourneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JourneyDialog({ open, onOpenChange }: JourneyDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [intention, setIntention] = useState('');
  const [errors, setErrors] = useState<JourneyValidationResult['errors']>({});
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setErrors({});
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validateJourneyRequest({ name, email, intention });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmittedEmail(email.trim());
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setIntention('');
    setErrors({});
    setSubmittedEmail(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 border border-border text-foreground p-6 rounded-2xl">
        <DialogHeader className="gap-2">
          <DialogTitle
            className="text-3xl font-normal tracking-tight text-foreground"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Begin your journey
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            Request private studio access. Invitations are extended weekly to keep our spaces
            calm and deliberate.
          </DialogDescription>
        </DialogHeader>

        {submittedEmail ? (
          <div className="py-4 flex flex-col items-start gap-4">
            <div className="flex items-center gap-2.5 text-foreground">
              <CheckCircle2 className="size-5 shrink-0" />
              <span className="text-sm font-medium">Invitation request recorded</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Thank you, {name.trim()}. We will send your private access key to{' '}
              <span className="text-foreground">{submittedEmail}</span> when the next cohort
              opens.
            </p>
            <div className="flex items-center gap-3 pt-2 w-full">
              <Button
                type="button"
                variant="liquid"
                size="none"
                onClick={() => handleOpenChange(false)}
                className="rounded-full px-6 py-2.5 text-sm text-foreground"
              >
                Return to Hero
              </Button>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Submit another request
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="journey-name" className="text-xs text-muted-foreground">
                Name
              </label>
              <input
                id="journey-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                aria-invalid={Boolean(errors.name)}
                className="w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {errors.name && (
                <p role="alert" className="text-xs text-red-400">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="journey-email" className="text-xs text-muted-foreground">
                Email
              </label>
              <input
                id="journey-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                aria-invalid={Boolean(errors.email)}
                className="w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {errors.email && (
                <p role="alert" className="text-xs text-red-400">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="journey-intention" className="text-xs text-muted-foreground">
                What are you creating? (Optional)
              </label>
              <textarea
                id="journey-intention"
                rows={2}
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="Writing, research, sound design..."
                className="w-full resize-none rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="submit"
                variant="liquid"
                size="none"
                className="rounded-full px-7 py-2.5 text-sm text-foreground"
              >
                Request Access
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

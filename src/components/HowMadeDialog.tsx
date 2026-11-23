import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface HowMadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowMadeDialog({ open, onOpenChange }: HowMadeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#0f110d] border border-[#f0e5c8]/15 text-[#f0e5c8] p-6 rounded-xl shadow-2xl">
        <DialogHeader className="gap-2">
          <DialogTitle
            className="text-2xl font-normal tracking-tight text-[#f0e5c8]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            How this page was made
          </DialogTitle>
          <DialogDescription className="text-sm text-[#c9d4b8]/85 leading-relaxed">
            A single WebGL room rendered from 66,000 additive points in real time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs leading-relaxed text-[#c9d4b8]/80 font-mono">
          <p>
            1. Streaming loader — The untextured 1.48 MB GLB bust streams via fetch so the
            96-dot ring reflects true download bytes from 000 to 100.
          </p>
          <p>
            2. Surface sampling &amp; equalization — Three.js MeshSurfaceSampler draws 330,000
            candidates, isolates the right-side botanical sprig, voxel-caps flat regions at
            0.022 units, and fits a wraparound visor curve directly over the brow geometry.
          </p>
          <p>
            3. Local relief &amp; shaders — A 0.03-unit neighborhood pass computes ridge curvature
            and wisps before dots arc forward out of the ring, track your light on z = 2.6, and
            catch a sage glint across the visor and leaves.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

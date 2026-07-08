import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CloseIcon } from './icons';

// Desktop modal width. The base caps at `narrow`; these widen the centered
// desktop dialog at sm+ (mobile bottom-sheet sizing is unchanged). Default narrow.
const SIZE: Record<'narrow' | 'calm' | 'wide' | 'reader', string> = {
  narrow: '',
  calm: 'sm:max-w-calm',
  wide: 'sm:max-w-4xl',
  reader: 'sm:max-w-5xl',
};

// Mobile = bottom sheet (rounded top, slides up). Desktop = centered modal.
// Scrim dismiss unless `requireConfirm` (e.g. refund confirm sheet).
//
// `bare` hands the whole panel to the caller: no default header/title, padding,
// or footer chrome — used by full-bleed layouts like the two-pane build reader,
// which supply their own header, scrolling regions, and footer. `panelClassName`
// tunes the panel box (height, flex) in that mode.
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  requireConfirm = false,
  size = 'narrow',
  bare = false,
  panelClassName,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  requireConfirm?: boolean;
  size?: 'narrow' | 'calm' | 'wide' | 'reader';
  bare?: boolean;
  panelClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !requireConfirm) onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, requireConfirm]);

  if (!open) return null;

  // Full-bleed panel: the caller owns everything inside. Keep the scrim,
  // animation, and mobile bottom-sheet framing; drop the header/padding chrome.
  if (bare) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
        <div className="absolute inset-0 bg-ink/30 animate-fade-in" onClick={() => !requireConfirm && onClose()} />
        <div
          className={cn(
            'relative w-full max-w-narrow bg-bg shadow-lg overflow-hidden',
            SIZE[size],
            'rounded-t-xl sm:rounded-lg animate-sheet-up sm:animate-fade-in',
            panelClassName,
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0 bg-ink/30 animate-fade-in"
        onClick={() => !requireConfirm && onClose()}
      />
      <div
        className={cn(
          'relative w-full max-w-narrow bg-bg shadow-lg',
          SIZE[size],
          'rounded-t-xl sm:rounded-lg animate-sheet-up sm:animate-fade-in',
          'max-h-[90vh] overflow-y-auto pb-safe',
        )}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="mx-auto h-1 w-10 rounded-pill bg-line-strong sm:hidden" aria-hidden />
          {title && <h2 className="text-h2 font-semibold text-ink sm:mx-0">{title}</h2>}
          {!requireConfirm && (
            <button onClick={onClose} aria-label="Close" className="text-ink-secondary hover:text-ink sm:ml-auto">
              <CloseIcon width={22} height={22} />
            </button>
          )}
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex flex-col gap-2 px-5 pb-5">{footer}</div>}
      </div>
    </div>
  );
}

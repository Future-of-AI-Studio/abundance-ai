import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CloseIcon } from './icons';

// Mobile = bottom sheet (rounded top, slides up). Desktop = centered modal.
// Scrim dismiss unless `requireConfirm` (e.g. refund confirm sheet).
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  requireConfirm = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  requireConfirm?: boolean;
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0 bg-ink/30 animate-fade-in"
        onClick={() => !requireConfirm && onClose()}
      />
      <div
        className={cn(
          'relative w-full max-w-narrow bg-bg shadow-lg',
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

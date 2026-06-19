import { cn } from '@/lib/cn';
import { useToast } from '@/store/toast';
import { CheckIcon, CloseIcon } from './icons';

// Global toast host — bottom-anchored above the tab bar, auto-dismiss (§6).
export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-frame items-center gap-3 rounded-md border px-4 py-3 shadow-md animate-fade-in',
            t.variant === 'success' && 'bg-success-bg border-success-border text-success',
            t.variant === 'error' && 'bg-error-bg border-error-border text-error',
            t.variant === 'info' && 'bg-surface-plain border-line text-ink',
          )}
          role="status"
        >
          {t.variant === 'success' && <CheckIcon width={18} height={18} />}
          <span className="flex-1 text-body-sm">{t.message}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

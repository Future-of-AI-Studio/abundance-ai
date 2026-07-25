import { Button, Spinner } from '@/components/ui';
import { ArrowRight, CheckIcon, CloseIcon } from '@/components/ui/icons';

// Post-payment feedback shown over a checkout/enrollment flow: a brief
// "confirming" state while the charge is verified server-side, then an explicit
// success (with an optional auto-advance) or a soft error. Purely presentational
// — the caller owns the state machine, the copy, and the button actions.
export type PayResult = 'confirming' | 'success' | 'error';

type ButtonSpec = { label: string; onClick: () => void };

export function PaymentResultOverlay({
  state, confirming, success, error,
}: {
  state: PayResult;
  confirming?: { title?: string; body?: string };
  success: { title?: string; body: string; continueLabel?: string; onContinue: () => void; autoNote?: string };
  error: { title?: string; body: string; primary: ButtonSpec; secondary?: ButtonSpec };
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-deep/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-surface-plain p-8 text-center shadow-xl">
        {state === 'confirming' && (
          <>
            <Spinner size={30} className="mx-auto text-primary" />
            <h2 className="mt-5 text-h2 font-bold text-ink">{confirming?.title ?? 'Confirming your payment…'}</h2>
            <p className="mt-2 text-body-sm text-ink-secondary">{confirming?.body ?? 'One moment while we finalize your purchase.'}</p>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-pill bg-success text-white">
              <CheckIcon width={30} height={30} />
            </div>
            <h2 className="mt-5 text-h2 font-bold text-ink">{success.title ?? 'Payment successful'}</h2>
            <p className="mt-2 text-body-sm text-ink-secondary">{success.body}</p>
            <Button variant="orange" size="lg" className="mt-6" iconRight={<ArrowRight width={18} height={18} />} onClick={success.onContinue}>
              {success.continueLabel ?? 'Continue'}
            </Button>
            {success.autoNote && <p className="mt-3 text-caption text-ink-secondary">{success.autoNote}</p>}
          </>
        )}
        {state === 'error' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-pill bg-error text-white">
              <CloseIcon width={28} height={28} />
            </div>
            <h2 className="mt-5 text-h2 font-bold text-ink">{error.title ?? "We couldn't confirm your payment"}</h2>
            <p className="mt-2 text-body-sm text-ink-secondary">{error.body}</p>
            <div className="mt-6 space-y-2">
              <Button size="lg" onClick={error.primary.onClick}>{error.primary.label}</Button>
              {error.secondary && (
                <Button variant="ghost" size="lg" onClick={error.secondary.onClick}>{error.secondary.label}</Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Button, TextInput } from '@/components/ui';
import { CheckIcon } from '@/components/ui/icons';
import { FREE_OFFER_DISCOUNT_PCT } from '@/lib/freeOffer';

// Creator control for the free-enrollment offer, shown beside the price. When
// ticked, buyers can join this (paid) program for free until the chosen date —
// leave the date blank for no end. Saves to the program record (programUpdate).

// A stored ISO timestamp → the YYYY-MM-DD a <input type="date"> expects, in the
// creator's local time (so "free until the 28th" reads as the 28th they picked).
function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// A picked date → an ISO timestamp at the end of that local day, so the offer
// stays open through the whole day the creator chose.
function toIso(date: string): string {
  return new Date(`${date}T23:59:59`).toISOString();
}

function todayInput(): string {
  return toDateInput(new Date().toISOString());
}

// A week from today — the default end date when the offer is first switched on.
function defaultUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toDateInput(d.toISOString());
}

export function FreeOfferEditor({
  enabled, until, onSave,
}: {
  enabled: boolean;
  until: string | null;
  onSave: (enabled: boolean, until: string | null) => Promise<void>;
}) {
  const [on, setOn] = useState(enabled);
  const [date, setDate] = useState(toDateInput(until));
  const [saving, setSaving] = useState(false);

  // Re-sync from the saved program whenever it changes (e.g. after a save).
  useEffect(() => { setOn(enabled); setDate(toDateInput(until)); }, [enabled, until]);

  const toggle = (next: boolean) => {
    setOn(next);
    // Suggest a week-long window the first time it's turned on.
    if (next && !date) setDate(defaultUntil());
  };

  // What we'd persist right now, normalized (offer off → no date).
  const nextUntil = on && date ? toIso(date) : null;
  const dirty = on !== enabled || nextUntil !== (until ?? null);

  const commit = async () => {
    setSaving(true);
    await onSave(on, nextUntil);
    setSaving(false);
  };

  return (
    <div className="mt-4 border-t border-line pt-4">
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          className="mt-0.5 h-[17px] w-[17px] shrink-0 accent-primary"
          checked={on}
          onChange={(e) => toggle(e.target.checked)}
        />
        <span>
          <span className="text-body-sm font-medium text-ink">Let participants try the first session for free</span>
          <span className="mt-0.5 block text-caption text-ink-secondary">
            Until the date you pick, visitors choose "Try first session for free" or enroll now for {FREE_OFFER_DISCOUNT_PCT}% off the fee.
          </span>
        </span>
      </label>

      {on && (
        <div className="mt-3 pl-[27px]">
          <TextInput
            label="First session Free until"
            type="date"
            min={todayInput()}
            helperText="Leave blank for no end date."
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      )}

      {dirty && (
        <div className="mt-3 flex justify-end">
          <Button size="md" fullWidth={false} loading={saving} iconLeft={<CheckIcon width={15} height={15} />} onClick={commit}>
            Save offer
          </Button>
        </div>
      )}
    </div>
  );
}

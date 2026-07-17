import { useState } from 'react';
import { Button, TextInput } from '@/components/ui';
import { CheckIcon, PencilIcon } from '@/components/ui/icons';
import { toast } from '@/store/toast';
import { priceLabel } from '@/lib/money';

// Shared price control for a program. Shown wherever the creator sets or confirms
// what buyers pay — the Get Paid step (beside the share link) and the Students tab.
// Displays the current price with an inline edit-to-USD field.
export function PriceEditor({ priceCents, onSave }: { priceCents: number; onSave: (cents: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(priceCents / 100));
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const dollars = Number(value);
    if (!Number.isFinite(dollars) || dollars < 0) { toast.error('Enter a price of $0 or more.'); return; }
    setSaving(true);
    await onSave(Math.round(dollars * 100));
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-caption text-ink-secondary">Program price</p>
          <p className="text-h3 font-semibold text-ink">{priceLabel(priceCents)}</p>
        </div>
        <button
          onClick={() => { setValue(String(priceCents / 100)); setEditing(true); }}
          className="inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:underline"
        >
          <PencilIcon width={14} height={14} /> Edit price
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <TextInput
          label="Program price (USD)"
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
          onChange={(e) => setValue(e.target.value.replace(/-/g, ''))}
        />
      </div>
      <Button size="md" fullWidth={false} loading={saving} iconLeft={<CheckIcon width={15} height={15} />} onClick={commit}>Save</Button>
    </div>
  );
}

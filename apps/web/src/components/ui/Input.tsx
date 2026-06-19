import { forwardRef, useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const fieldBase =
  'w-full rounded-md border bg-surface-plain px-4 text-body text-ink placeholder:text-ink-secondary/60 ' +
  'transition-colors focus:border-primary disabled:opacity-50';

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-body-sm font-medium text-ink">
      {children}
      {required && <span className="text-error"> *</span>}
    </label>
  );
}

function Helper({ error, helper }: { error?: string; helper?: string }) {
  if (error) return <p className="mt-1.5 text-caption text-error">{error}</p>;
  if (helper) return <p className="mt-1.5 text-caption text-ink-secondary">{helper}</p>;
  return null;
}

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, helperText, required, className, id, type = 'text', ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const isPassword = type === 'password';
  const [show, setShow] = useState(false);

  return (
    <div className={className}>
      {label && <Label htmlFor={fieldId} required={required}>{label}</Label>}
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          type={isPassword && show ? 'text' : type}
          aria-invalid={!!error}
          className={cn(fieldBase, 'h-11', error ? 'border-error' : 'border-line', isPassword && 'pr-16')}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-caption font-medium text-ink-secondary hover:text-ink"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      <Helper error={error} helper={helperText} />
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helperText, required, className, id, rows = 4, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={className}>
      {label && <Label htmlFor={fieldId} required={required}>{label}</Label>}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={!!error}
        className={cn(fieldBase, 'py-3 leading-relaxed resize-none', error ? 'border-error' : 'border-line')}
        {...rest}
      />
      <Helper error={error} helper={helperText} />
    </div>
  );
});

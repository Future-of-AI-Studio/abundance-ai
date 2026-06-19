import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent' | 'accent-secondary';
type Size = 'lg' | 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary disabled:hover:bg-primary',
  secondary: 'bg-surface-plain text-primary border border-primary/60 hover:border-primary hover:bg-primary/5',
  ghost: 'bg-transparent text-primary hover:bg-primary/5',
  destructive: 'bg-transparent text-error border border-error/50 hover:bg-error/5',
  accent: 'bg-accent text-white hover:bg-accent/90 active:bg-accent disabled:hover:bg-accent',
  'accent-secondary': 'bg-surface-plain text-accent border border-accent/50 hover:border-accent hover:bg-accent/5',
};
const SIZE: Record<Size, string> = {
  lg: 'h-[52px] px-6 text-body',
  md: 'h-11 px-5 text-body-sm',
  sm: 'h-9 px-4 text-body-sm',
};

/**
 * Button — variants/sizes/states per §6. Loading LOCKS the button (disabled +
 * spinner) so payment/generation actions can't double-fire. Type defaults to
 * "button" so it never triggers a native form submit (spec §7.7).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'lg', loading = false, fullWidth = true, iconLeft, iconRight, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed select-none',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' ? 20 : 16} /> : iconLeft}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
});

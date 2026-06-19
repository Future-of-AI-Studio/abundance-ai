import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardVariant = 'surface' | 'plain' | 'hero';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  as?: 'div' | 'section' | 'article';
}

const VARIANT: Record<CardVariant, string> = {
  surface: 'bg-surface border border-line',
  plain: 'bg-surface-plain border border-line',
  hero: 'bg-surface-plain border border-line shadow-md',
};

export function Card({ variant = 'surface', className, children, ...rest }: CardProps) {
  return (
    <div className={cn('rounded-lg p-5 shadow-sm', VARIANT[variant], className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-h3 font-semibold text-ink', className)}>{children}</h3>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('font-mono text-eyebrow uppercase tracking-[0.12em] text-ink-secondary', className)}>
      {children}
    </p>
  );
}

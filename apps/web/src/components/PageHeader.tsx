import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowLeft } from '@/components/ui/icons';
import { Eyebrow } from '@/components/ui';

// Screen header with optional back affordance + eyebrow + title.
export function PageHeader({
  title,
  eyebrow,
  back,
  backTo,
  children,
}: {
  title?: string;
  eyebrow?: string;
  back?: boolean;
  backTo?: string;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="mb-6">
      {back && (
        <button
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="mb-3 inline-flex items-center gap-1 text-body-sm text-ink-secondary hover:text-ink"
        >
          <ArrowLeft width={18} height={18} /> Back
        </button>
      )}
      {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
      {title && <h1 className="text-h1 font-bold text-ink">{title}</h1>}
      {children && <div className="mt-1 text-body text-ink-secondary">{children}</div>}
    </div>
  );
}

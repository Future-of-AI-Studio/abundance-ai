import type { ReactNode } from 'react';
import { LEGAL_LINKS, type LegalDocKey } from '@/lib/legal';

export function LegalLink({ doc, children }: { doc: LegalDocKey; children: ReactNode }) {
  return (
    <a
      href={LEGAL_LINKS[doc]}
      target="_blank"
      rel="noreferrer"
      className="font-medium underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  );
}

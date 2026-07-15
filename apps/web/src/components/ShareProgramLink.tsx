import { useState } from 'react';
import { CopyIcon, CheckIcon, EyeIcon } from '@/components/ui/icons';
import { toast } from '@/store/toast';
import { cn } from '@/lib/cn';

/** The public, shareable URL for a program's landing page. */
export function programShareUrl(programId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/p/${programId}`;
}

// The link a creator posts online so people can view + enroll in their program.
// Copy-to-clipboard + a preview link that opens the buyer-facing page.
export function ShareProgramLink({ programId, className }: { programId: string; className?: string }) {
  const url = programShareUrl(programId);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Copy didn\'t work - select the link and copy it.');
    }
  };

  return (
    <div className={cn('', className)}>
      <div className="flex items-center gap-2 rounded-md border border-line bg-surface-plain px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-caption text-ink-secondary">{url}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-caption font-semibold text-primary hover:bg-primary/15"
        >
          {copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:underline"
      >
        <EyeIcon width={14} height={14} /> Preview landing page
      </a>
    </div>
  );
}

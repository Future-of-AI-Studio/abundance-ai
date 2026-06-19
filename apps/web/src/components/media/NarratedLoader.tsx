import { useEffect, useState } from 'react';

// Full-screen narrated loader (§6) — warm scene, animated dot-cluster motif,
// cycling step text. Used for "Building Your Program". Calm, never a bare spinner.
export function NarratedLoader({ steps, subline }: { steps: string[]; subline?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % steps.length), 2200);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-8 text-center">
      <div className="mb-10 grid grid-cols-3 gap-3" aria-hidden>
        {Array.from({ length: 9 }).map((_, n) => (
          <span
            key={n}
            className="h-3 w-3 rounded-pill bg-primary animate-dot-pulse"
            style={{ animationDelay: `${(n % 5) * 0.15}s` }}
          />
        ))}
      </div>
      <p className="min-h-[2em] text-h2 font-semibold text-ink transition-opacity" key={i}>
        {steps[i]}
      </p>
      {subline && <p className="mt-3 max-w-xs text-body text-ink-secondary">{subline}</p>}
    </div>
  );
}

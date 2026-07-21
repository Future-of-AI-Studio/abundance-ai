import { create } from 'zustand';

// Global unsaved-edits guard. A page with in-progress edits marks itself dirty;
// anything that would navigate away calls `guard(action)` first. While dirty,
// the action is stashed and AppShell shows a "Leave without saving?" sheet —
// confirming clears the dirty flag and runs the stashed action.
interface UnsavedStore {
  dirty: boolean;
  pending: (() => void) | null;
  setDirty: (dirty: boolean) => void;
  /** Returns true when the action was blocked (a confirm sheet will open). */
  guard: (action: () => void) => boolean;
  confirmPending: () => void;
  cancelPending: () => void;
}

export const useUnsaved = create<UnsavedStore>((set, get) => ({
  dirty: false,
  pending: null,
  setDirty: (dirty) => set(dirty ? { dirty } : { dirty, pending: null }),
  guard: (action) => {
    if (!get().dirty) return false;
    set({ pending: action });
    return true;
  },
  confirmPending: () => {
    const action = get().pending;
    set({ dirty: false, pending: null });
    action?.();
  },
  cancelPending: () => set({ pending: null }),
}));

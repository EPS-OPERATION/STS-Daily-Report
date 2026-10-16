import { useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

// Unsent report drafts live on this device only (localStorage), one per shift × project × contractor × date.
// Typing is saved ~1 s after the last change; a successful submit clears it. Signature images are
// never kept (large, and the contractor should sign the final version anyway).
const PREFIX = "sts_report_draft_v1";
const SAVE_DELAY = 1000;
const OMIT = ["signatureData"];

export interface StoredDraft<T> { savedAt: string; values: T }

export function draftKey(shift: "morning" | "evening", projectId: string, contractorId: string, date: string) {
  return `${PREFIX}:${shift}:${projectId}:${contractorId}:${date}`;
}

function read<T>(key: string): StoredDraft<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    return parsed && typeof parsed.savedAt === "string" && parsed.values ? parsed : null;
  } catch {
    return null;
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

// Saves what the user types and offers it back next time the same report is opened.
// `pending` is a draft found on open that has not been restored or discarded yet.
export function useFormDraft<T extends FieldValues>(form: UseFormReturn<T>, key: string) {
  const [pending, setPending] = useState<StoredDraft<T> | null>(() => read<T>(key));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  // Read during render so react-hook-form keeps isDirty current for the watch callback below.
  void form.formState.isDirty;
  // Nothing is written while an older draft is still waiting for an answer, so it isn't overwritten.
  const paused = useRef(pending !== null);

  useEffect(() => {
    const sub = form.watch((values) => {
      if (paused.current) return;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        // Checked after the pause: by then isDirty reflects this change (untouched forms are not saved).
        if (!form.formState.isDirty) return;
        const copy = { ...(values as Record<string, unknown>) };
        for (const k of OMIT) delete copy[k];
        const at = new Date().toISOString();
        try {
          window.localStorage.setItem(key, JSON.stringify({ savedAt: at, values: copy }));
          setSavedAt(at);
        } catch {
          /* storage full or blocked: the form still works, only resume is lost */
        }
      }, SAVE_DELAY);
    });
    return () => {
      sub.unsubscribe();
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [form, key]);

  return {
    pending,
    savedAt,
    /** Put the draft back into the form (keeps the current signature). */
    restore() {
      if (!pending) return;
      const current = form.getValues() as Record<string, unknown>;
      const merged = { ...current, ...(pending.values as Record<string, unknown>) };
      for (const k of OMIT) merged[k] = current[k];
      form.reset(merged as T, { keepDefaultValues: true });
      paused.current = false;
      setPending(null);
      setSavedAt(pending.savedAt);
    },
    discard() {
      remove(key);
      paused.current = false;
      setPending(null);
      setSavedAt(null);
    },
    /** After a successful submit. */
    clear() {
      if (timer.current) window.clearTimeout(timer.current);
      remove(key);
      setSavedAt(null);
    },
  };
}

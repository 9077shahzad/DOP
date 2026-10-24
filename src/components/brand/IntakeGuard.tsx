/**
 * Spam protection for public forms.
 *
 * Three layers, none of which asks a human to prove anything:
 *  1. a honeypot field, hidden from people and read by bots,
 *  2. a time-to-submit check — a form filled in under two seconds was not typed,
 *  3. a per-browser rate limit, backed by the same limit inside the database so
 *     a client that skips the UI is still stopped.
 * A submission blocked here never clears the form: values survive every error.
 */
import { useCallback, useRef } from "react";

export type IntakeGuardValue = { hp: string; elapsedMs: number };

const RATE_KEY = "mf.intake.submits.v1";
const RATE_WINDOW_MS = 60 * 60_000;
const RATE_MAX = 5;

/** True when this browser has already submitted the allowed number of forms. */
export function isRateLimited(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(RATE_KEY);
    const stamps: number[] = raw ? (JSON.parse(raw) as number[]) : [];
    return stamps.filter((t) => Date.now() - t < RATE_WINDOW_MS).length >= RATE_MAX;
  } catch {
    return false;
  }
}

export function recordSubmission(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(RATE_KEY);
    const stamps: number[] = raw ? (JSON.parse(raw) as number[]) : [];
    const kept = stamps.filter((t) => Date.now() - t < RATE_WINDOW_MS);
    kept.push(Date.now());
    window.localStorage.setItem(RATE_KEY, JSON.stringify(kept));
  } catch {
    /* storage disabled — the database limit still applies */
  }
}

export function useIntakeGuard() {
  const mounted = useRef<number>(Date.now());
  const hp = useRef<string>("");

  const guard = useCallback(
    (): IntakeGuardValue => ({ hp: hp.current, elapsedMs: Date.now() - mounted.current }),
    [],
  );

  const HoneypotField = useCallback(
    () => (
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
            onChange={(event) => {
              hp.current = event.target.value;
            }}
          />
        </label>
      </div>
    ),
    [],
  );

  return { guard, HoneypotField, isRateLimited, recordSubmission };
}

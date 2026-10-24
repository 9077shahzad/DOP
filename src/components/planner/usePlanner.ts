import { useEffect, useMemo, useState } from "react";

import {
  EMPTY_CLEANING,
  EMPTY_DISPOSAL,
  FIXED_START_TIME,
  INITIAL_STATE,
  prunedExtras,
  type Lift,
  type Level,
  type PlannerState,
} from "@/lib/pricing";
import { plannerSteps, type StepId } from "@/lib/planner-steps";
import { newDraftId } from "@/lib/intake-uploads";

const STORAGE_KEY = "mf.planer.v1";

/**
 * Requests saved before lift and parking were recorded per address carry a
 * single answer. It is applied to both sides so nothing a customer already
 * entered is lost when they come back to a saved draft.
 */
function migrate(parsed: Partial<PlannerState> & { lift?: Lift; parking?: Level }): PlannerState {
  return {
    ...INITIAL_STATE,
    ...parsed,
    liftOut: parsed.liftOut ?? parsed.lift ?? INITIAL_STATE.liftOut,
    liftIn: parsed.liftIn ?? parsed.lift ?? INITIAL_STATE.liftIn,
    parkingOut: parsed.parkingOut ?? parsed.parking ?? INITIAL_STATE.parkingOut,
    parkingIn: parsed.parkingIn ?? parsed.parking ?? INITIAL_STATE.parkingIn,
    services: { ...INITIAL_STATE.services, ...(parsed.services ?? {}) },
    items: { ...(parsed.items ?? {}) },
    extras: parsed.extras ?? [],
    cleaning: { ...EMPTY_CLEANING, ...(parsed.cleaning ?? {}) },
    disposal: { ...EMPTY_DISPOSAL, ...(parsed.disposal ?? {}) },
    cleanDate: parsed.cleanDate ?? null,
    // The start time is fixed at 08:00; a saved draft never carries another.
    startTime: FIXED_START_TIME,
    lampCount: Math.max(0, Math.floor(parsed.lampCount ?? 0)),
    uploads: parsed.uploads ?? [],
    draftId: parsed.draftId || newDraftId(),
  };
}

function load(): PlannerState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    return migrate(JSON.parse(raw) as Partial<PlannerState>);
  } catch {
    return INITIAL_STATE;
  }
}

/**
 * Pre-fill answers from outside the wizard (the hero's quote starter).
 * Writes into the very storage the wizard restores from, so there is exactly
 * one copy of planner state and no second source of truth.
 */
export function seedPlanner(next: Partial<PlannerState>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...load(), ...next }));
  } catch {
    /* storage unavailable */
  }
}


export function usePlanner() {
  const [state, setState] = useState<PlannerState>(INITIAL_STATE);
  const [stepId, setStepId] = useState<StepId>("services");
  const [hydrated, setHydrated] = useState(false);

  // Restore after hydration so SSR and first client render match.
  useEffect(() => {
    const restored = load();
    setState(restored.draftId ? restored : { ...restored, draftId: newDraftId() });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, hydrated]);

  // The flow follows the selected services; a step that no longer applies is
  // left immediately instead of staying on screen with dead questions.
  const steps = useMemo(() => plannerSteps(state.services), [state.services]);
  useEffect(() => {
    if (!steps.includes(stepId)) setStepId(steps[0] ?? "services");
  }, [steps, stepId]);

  function patch(next: Partial<PlannerState>) {
    setState((prev) => ({ ...prev, ...next }));
  }

  function setItem(id: string, qty: number) {
    setState((prev) => ({ ...prev, items: { ...prev.items, [id]: Math.max(0, qty) } }));
  }

  /**
   * Changing the service selection recalculates which questions apply and
   * drops the extras and answers that belong to a service no longer booked.
   */
  function toggleService(key: keyof PlannerState["services"]) {
    setState((prev) => {
      const services = { ...prev.services, [key]: !prev.services[key] };
      const next: PlannerState = { ...prev, services };
      const extras = prunedExtras(next);
      return {
        ...next,
        extras,
        // A lamp count without the lamp service is not a chargeable quantity.
        lampCount: extras.includes("lamp_installation") ? next.lampCount : 0,
        cleaning: services.clean ? next.cleaning : EMPTY_CLEANING,
        disposal: services.disp ? next.disposal : EMPTY_DISPOSAL,
        cleanDate: services.clean ? next.cleanDate : null,
        // Inventory, destination and the moving hoist describe a move only.
        items: services.move ? next.items : {},
        hoist: services.move ? next.hoist : false,
        hoistIn: services.move ? next.hoistIn : false,
        permitIn: services.move ? next.permitIn : false,
        // The delivery choice only exists while packing material is selected.
        packingMaterialOption: extras.includes("packing_material") ? next.packingMaterialOption : "",
        toAddress: services.move ? next.toAddress : "",
        toZip: services.move ? next.toZip : "",
        toCity: services.move ? next.toCity : "",
        toCanton: services.move ? next.toCanton : "",
      };
    });
  }


  /** After a successful submission the next inquiry starts from scratch. */
  function reset() {
    setState({ ...INITIAL_STATE, draftId: newDraftId() });
    setStepId("services");
  }

  return { state, patch, setItem, toggleService, steps, stepId, setStepId, hydrated, reset };
}

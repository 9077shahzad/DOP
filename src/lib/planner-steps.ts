/**
 * Which questions the wizard asks, derived from the selected services.
 *
 * The step list is never a fixed array of numbers: a cleaning-only request
 * must not be asked for a destination address or a moving inventory, and a
 * disposal-only request must not be asked for cleaning details. Progress bar,
 * navigation, validation and the summary all read this one list, so a change
 * of service selection reshapes the whole flow in the same render.
 */

import type { PlannerState } from "@/lib/pricing";

export const STEP_IDS = [
  "services",
  "route",
  "size",
  "accessOut",
  "accessIn",
  "inventory",
  "cleaning",
  "disposal",
  "extras",
  "dates",
  "uploads",
  "contact",
] as const;

export type StepId = (typeof STEP_IDS)[number];

/** The main services the customer picks first. Packing is an extra service. */
export const MAIN_SERVICES = ["move", "clean", "disp"] as const;
export type MainService = (typeof MAIN_SERVICES)[number];

/** Steps that refine the request but never block sending it. */
export const OPTIONAL_STEP_IDS = new Set<StepId>(["inventory", "extras", "uploads"]);

/**
 * True when the request is a cleaning job and nothing else. Such a request is
 * asked for cleaning details straight away: route, size, access, inventory and
 * the moving extras all belong to a move that is not being booked.
 */
export function isCleaningOnly(services: PlannerState["services"]): boolean {
  return Boolean(services.clean) && !services.move && !services.disp;
}

export function plannerSteps(services: PlannerState["services"]): StepId[] {
  const move = Boolean(services.move);
  const clean = Boolean(services.clean);
  const disp = Boolean(services.disp);
  const cleaningOnly = isCleaningOnly(services);
  return STEP_IDS.filter((id) => {
    switch (id) {
      case "route":
      case "size":
      case "accessOut":
        // A cleaning-only request records its object address and size inside
        // the cleaning step itself.
        return !cleaningOnly;
      case "accessIn":
        return move;
      case "inventory":
        return move;
      case "cleaning":
        return clean;
      case "disposal":
        return disp;
      case "extras":
        return !cleaningOnly;
      default:
        return true;
    }
  });
}


/** 1-based position of a step in the current flow, 1 when it does not apply. */
export function stepIndex(steps: StepId[], id: StepId): number {
  const index = steps.indexOf(id);
  return index < 0 ? 1 : index + 1;
}

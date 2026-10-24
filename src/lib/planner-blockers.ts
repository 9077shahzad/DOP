/**
 * Planner submit blockers — derived from state on every render, never stored.
 *
 * Two kinds, deliberately separate:
 *   required — the submission cannot happen at all (name, a contact channel,
 *              accepted terms). These block the button.
 *   estimate — a price-driving input is unset. These NEVER block the button:
 *              the inquiry is still recorded, without a price.
 *
 * A blocker names the step it lives on and the field to focus, so the message
 * always points at the real problem instead of the last thing that was checked.
 */

import { isValidZip, type PlannerState } from "@/lib/pricing";
import { isCleaningOnly as cleaningOnly, type StepId } from "@/lib/planner-steps";
import { plannerMissingInputs } from "@/lib/price-resolution";

export type BlockerKind = "required" | "estimate";

export type Blocker = {
  /** i18n key suffix under `planer.blockers.fields`. */
  id: string;
  kind: BlockerKind;
  /** Wizard step the field lives on. */
  step: StepId;
  /** DOM id of the control to focus when the customer clicks the blocker. */
  fieldId: string;
};

const ESTIMATE_TARGETS: Record<string, { step: StepId; fieldId: string }> = {
  rooms: { step: "size", fieldId: "planner-rooms" },
  cleanRooms: { step: "cleaning", fieldId: "planner-clean-rooms" },
  fromZip: { step: "route", fieldId: "planner-from-zip" },
  toZip: { step: "route", fieldId: "planner-to-zip" },
  services: { step: "services", fieldId: "planner-services" },
  date: { step: "dates", fieldId: "planner-alt-date" },
  cleanDate: { step: "dates", fieldId: "planner-clean-date" },
  disposalVolume: { step: "disposal", fieldId: "planner-disposal-m3" },
  disposalHours: { step: "disposal", fieldId: "planner-disposal-hours" },
  inventoryVolume: { step: "inventory", fieldId: "planner-inventory" },
};


/**
 * What must be true before anything may be sent.
 *
 * Only the fields the selected services actually need: a cleaning-only or
 * disposal-only request is never held back by a missing moving destination.
 */
export function requiredBlockers(state: PlannerState, acceptedTerms: boolean): Blocker[] {
  const out: Blocker[] = [];
  const noService = !state.services.move && !state.services.clean && !state.services.disp;
  if (noService) {
    out.push({ id: "services", kind: "required", step: "services", fieldId: "planner-services" });
  }
  // A cleaning-only request never sees the route step: its object address is
  // asked for inside the cleaning step, so the blocker must point there.
  const addressStep: StepId = cleaningOnly(state.services) ? "cleaning" : "route";
  if (!isValidZip(state.fromZip)) {
    out.push({ id: "fromZipInvalid", kind: "required", step: addressStep, fieldId: "planner-from-zip" });
  }
  if (!state.fromAddress.trim()) {
    out.push({ id: "fromStreet", kind: "required", step: addressStep, fieldId: "planner-from-street" });
  }

  // A destination only exists for a move.
  if (state.services.move) {
    if (!isValidZip(state.toZip)) {
      out.push({ id: "toZipInvalid", kind: "required", step: "route", fieldId: "planner-to-zip" });
    }
    if (!state.toAddress.trim()) {
      out.push({ id: "toStreet", kind: "required", step: "route", fieldId: "planner-to-street" });
    }
  }
  // Packing material needs its follow-up choice (self pick-up or delivery).
  if (state.extras.includes("packing_material") && !state.packingMaterialOption) {
    out.push({ id: "packingMaterial", kind: "required", step: "extras", fieldId: "planner-packing-material" });
  }
  // Moving and cleaning are carried out on two different days.
  if (state.services.move && state.services.clean && state.cleanDate && state.cleanDate === state.date) {
    out.push({ id: "cleanDateSame", kind: "required", step: "dates", fieldId: "planner-clean-date" });
  }
  if (state.firstName !== undefined || state.lastName !== undefined) {
    // Both separate fields are required.
    if (!(state.firstName ?? "").trim() || !(state.lastName ?? "").trim()) {
      out.push({ id: "name", kind: "required", step: "contact", fieldId: (state.firstName ?? "").trim() ? "planner-last-name" : "planner-name" });
    }
  } else if (!state.name.trim()) {
    out.push({ id: "name", kind: "required", step: "contact", fieldId: "planner-name" });
  }
  if (!state.phone.trim() && !state.email.trim()) {
    out.push({ id: "contact", kind: "required", step: "contact", fieldId: "planner-phone" });
  }
  if (!acceptedTerms) {
    out.push({ id: "terms", kind: "required", step: "contact", fieldId: "consent-terms" });
  }
  return out;
}


/** What is missing for a price. Informational — it must never block a send. */
export function estimateBlockers(state: PlannerState, inventoryVolumes?: Record<string, number>): Blocker[] {
  return plannerMissingInputs(state, inventoryVolumes).map((id) => ({
    id,
    kind: "estimate" as const,
    step: ESTIMATE_TARGETS[id]?.step ?? "route",
    fieldId: ESTIMATE_TARGETS[id]?.fieldId ?? "planner-rooms",
  }));
}

export function canSubmit(state: PlannerState, acceptedTerms: boolean): boolean {
  return requiredBlockers(state, acceptedTerms).length === 0;
}

/**
 * Where "Jetzt buchen" actually goes.
 *
 * One rule, applied everywhere: the action must land in a flow that can take
 * the booking. Movable, priced services go to the planner, which produces a
 * fixed price and a real quotation reference. Services that need a survey
 * before anybody can quote go to the service request form, and the action is
 * labelled "Offerte anfragen" there — it never pretends to be a booking.
 * Organisations with a portal session book through the portal order form.
 *
 * There is deliberately no fallback to a generic contact page.
 */
import { isServiceId, type ServiceId } from "@/lib/services";

export type BookingKind = "planner" | "request" | "portal";

export type BookingTarget =
  | { kind: "planner" }
  | { kind: "request"; service: ServiceId }
  | { kind: "portal" };

/**
 * Priced online (planner) vs. survey first (request form).
 * Anything not listed is treated as survey-first — the safe direction.
 */
const ONLINE_BOOKABLE: Record<ServiceId, BookingKind> = {
  umzug: "planner",
  reinigung: "planner",
  entsorgung: "request",
  lagerung: "request",
  transport: "request",
  besichtigung: "request",
};

export function bookingKind(service?: ServiceId | null): BookingKind {
  if (!service) return "planner";
  return ONLINE_BOOKABLE[service] ?? "request";
}

export function bookingTarget(service?: ServiceId | null): BookingTarget {
  const kind = bookingKind(service);
  if (kind === "request" && service) return { kind: "request", service };
  return { kind: "planner" };
}

/** `common:cta.book` for a real booking, `common:cta.requestQuote` otherwise. */
export function bookingLabelKey(service?: ServiceId | null): "cta.book" | "cta.requestQuote" {
  return bookingKind(service) === "planner" ? "cta.book" : "cta.requestQuote";
}

/** Reads the service id out of `/de/leistungen/<service>` or `/de/anfrage/<service>`. */
export function serviceOfPath(pathname: string): ServiceId | null {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((p) => p === "leistungen" || p === "anfrage");
  const candidate = index >= 0 ? parts[index + 1] : undefined;
  return candidate && isServiceId(candidate) ? candidate : null;
}

/**
 * Service and detail pages carry the sticky bar; the home page, the planner
 * and the intake forms keep the generic mobile bar (or nothing at all).
 */
export function showsStickyBookBar(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  const section = parts[1] ?? "";
  return ["leistungen", "anfrage", "legal", "richtlinien", "offerte", "status", "geschaeftskunden"].includes(section);
}

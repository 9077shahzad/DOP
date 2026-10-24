/**
 * Public lead intake. Every entry point creates a lead through the
 * SECURITY DEFINER create_lead() function — the database row is the record of
 * truth, it is routed to a queue with an owner before any notification is
 * attempted, and no inquiry may exist only as an email or a WhatsApp message.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n/config";
import { readAttribution } from "@/lib/attribution";
import {
  isRateLimited,
  recordSubmission,
  type IntakeGuardValue,
} from "@/components/brand/IntakeGuard";

/** Thrown when the browser or the database refuses a further submission. */
export class RateLimitedError extends Error {
  constructor() {
    super("rate_limited");
    this.name = "RateLimitedError";
  }
}

/** In-flight guard: a double click must not create two rows. */
const inFlight = new Map<string, Promise<string>>();

/** Honeypot + time-to-submit, read by the database and never by a human. */
function guardPayload(guard?: IntakeGuardValue): Record<string, unknown> {
  if (!guard) return {};
  return { hp: guard.hp, elapsed_ms: String(Math.max(0, Math.round(guard.elapsedMs))) };
}

async function createLead(payload: Record<string, unknown>): Promise<string> {
  const key = JSON.stringify(payload);
  const running = inFlight.get(key);
  if (running) return running;
  if (isRateLimited()) throw new RateLimitedError();

  const attempt = (async () => {
    const { data, error } = await supabase.rpc("create_lead", {
      payload: { ...readAttribution(), ...payload } as never,
    });
    if (error) {
      if (error.code === "MF429" || /too many requests/i.test(error.message)) {
        throw new RateLimitedError();
      }
      throw new Error(error.message);
    }
    recordSubmission();
    const reference = String(data);
    // Confirmation mail is best effort: an inquiry is never lost because the
    // mailbox is not connected yet.
    void import("@/lib/operational-mail.functions")
      .then(({ notifyInquiryReceived }) => notifyInquiryReceived({ data: { reference } }))
      .catch(() => undefined);
    return reference;
  })();

  inFlight.set(key, attempt);
  try {
    return await attempt;
  } finally {
    // Keep the guard briefly so a rapid re-submit resolves to the same record.
    setTimeout(() => inFlight.delete(key), 4000);
  }
}

/**
 * A WhatsApp handoff is an inquiry: the lead is created first, then the chat
 * opens with the reference in the prefilled text so both sides are linked.
 */
export async function createWhatsappLead(input: {
  language: Lang;
  context: string;
  details?: Record<string, unknown> | undefined;
}): Promise<string> {
  return createLead({
    source_key: "whatsapp",
    preferred_contact: "whatsapp",
    language: input.language,
    description: input.context,
    service_details: { channel: "whatsapp", context: input.context, ...(input.details ?? {}) },
  });
}

export async function createContactLead(input: {
  name: string;
  phone: string;
  email: string;
  fromText: string;
  toText: string;
  preferredDate: string | null;
  message: string;
  language: Lang;
}): Promise<string> {
  return createLead({
    source_key: "website_form",
    customer_name: input.name,
    customer_phone: input.phone,
    customer_email: input.email,
    preferred_contact: input.phone ? "phone" : "email",
    service_address: input.fromText,
    preferred_date: input.preferredDate ?? "",
    description: input.message,
    language: input.language,
    service_details: {
      from: input.fromText,
      to: input.toText,
      message: input.message,
    },
  });
}

export async function createPlannerLead(input: {
  name: string;
  phone: string;
  email: string;
  company: string;
  fromAddress: string;
  fromZip: string;
  toAddress: string;
  toZip: string;
  date: string | null;
  /** null when the inputs could not be priced — the inquiry is kept regardless. */
  estimatedValue: number | null;
  quoteReference: string | null;
  language: Lang;
  details: Record<string, unknown>;
  /** Price-driving inputs the customer left unset, recorded for whoever follows up. */
  missing?: string[];
  city?: string;
  canton?: string;
  preferredTime?: string;
  /** Language the customer asked to be contacted in — may differ from the UI language. */
  contactLanguage?: string;
}): Promise<string> {
  const unpriced = input.estimatedValue == null;
  return createLead({
    source_key: "booking_form",
    customer_name: input.name,
    customer_phone: input.phone,
    customer_email: input.email,
    preferred_contact: input.phone ? "phone" : "email",
    postcode: input.fromZip,
    service_address: input.fromAddress,
    preferred_date: input.date ?? "",
    preferred_time: input.preferredTime ?? "",
    city: input.city ?? "",
    canton: input.canton ?? "",
    property_type: String(input.details["propertyType"] ?? ""),
    customer_type: input.company ? "b2b" : "private",
    estimated_value: unpriced ? "" : String(Math.round(input.estimatedValue as number)),
    quote_reference: input.quoteReference ?? "",
    language: input.contactLanguage || input.language,
    description: input.company ? input.company : "",
    // Without a price this is a request for an offer, never a confirmed quote.
    status: unpriced ? "quote_required" : "",
    service_details: {
      ...input.details,
      quote_reference: input.quoteReference ?? null,
      priced: !unpriced,
      ...(unpriced ? { missing_for_price: input.missing ?? [] } : {}),
    },
  });
}

/**
 * Public B2B inquiry (property managers, hotels, facility managers).
 * Source `b2b_inquiry` + customer type `b2b` route to the B2B queue.
 */
export async function createB2BLead(input: {
  company: string;
  contactName: string;
  phone: string;
  email: string;
  accountType: string;
  canton: string;
  city: string;
  postcode: string;
  address: string;
  unitsPerYear: string;
  services: string[];
  preferredContact: string;
  message: string;
  language: Lang;
  guard?: IntakeGuardValue;
}): Promise<string> {
  return createLead({
    ...guardPayload(input.guard),
    source_key: "b2b_inquiry",
    customer_type: "b2b",
    customer_name: input.contactName,
    customer_phone: input.phone,
    customer_email: input.email,
    preferred_contact: input.preferredContact,
    canton: input.canton,
    city: input.city,
    postcode: input.postcode,
    service_address: input.address,
    description: input.message,
    property_type: input.accountType,
    language: input.language,
    service_details: {
      channel: "b2b_form",
      company: input.company,
      account_type: input.accountType,
      units_per_year: input.unitsPerYear,
      services: input.services,
      message: input.message,
    },
  });
}

/** Callback request from the contact page — sales/dispatch queue. */
export async function createCallbackLead(input: {
  name: string;
  phone: string;
  email: string;
  timeSlot: string;
  topic: string;
  message: string;
  language: Lang;
  guard?: IntakeGuardValue;
}): Promise<string> {
  return createLead({
    ...guardPayload(input.guard),
    source_key: "website_form",
    customer_name: input.name,
    customer_phone: input.phone,
    customer_email: input.email,
    preferred_contact: "phone",
    preferred_time: input.timeSlot,
    description: input.message,
    language: input.language,
    service_details: {
      channel: "callback",
      time_slot: input.timeSlot,
      topic: input.topic,
      message: input.message,
    },
  });
}

/**
 * Portal support / other request. The `support` flag routes to the Customer
 * Support queue; an existing booking reference keeps the link to the job.
 */
export async function createSupportLead(input: {
  name: string;
  phone: string;
  email: string;
  topic: string;
  bookingReference: string;
  urgency: string;
  organization: string;
  message: string;
  language: Lang;
  guard?: IntakeGuardValue;
}): Promise<string> {
  return createLead({
    ...guardPayload(input.guard),
    source_key: "website_form",
    flag: input.bookingReference.trim() ? "existing_booking" : "support",
    customer_type: "b2b",
    customer_name: input.name,
    customer_phone: input.phone,
    customer_email: input.email,
    preferred_contact: input.email ? "email" : "phone",
    urgency: input.urgency,
    description: input.message,
    language: input.language,
    service_details: {
      channel: "portal_support",
      topic: input.topic,
      booking_reference: input.bookingReference,
      organization: input.organization,
      message: input.message,
    },
  });
}

/**
 * Service-specific request, used where a survey has to happen before anyone
 * can quote (Unterhalt, HVAC, Elektro, Sanitär, Malerarbeiten). This is a real
 * intake into the sales/dispatch queue, not a contact form.
 */
export async function createServiceRequestLead(input: {
  service: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  postcode: string;
  address: string;
  propertyType: string;
  preferredDate: string;
  urgency: string;
  message: string;
  language: Lang;
  guard?: IntakeGuardValue;
}): Promise<string> {
  return createLead({
    ...guardPayload(input.guard),
    source_key: "website_form",
    customer_name: input.name,
    customer_phone: input.phone,
    customer_email: input.email,
    customer_type: input.company ? "b2b" : "private",
    preferred_contact: input.phone ? "phone" : "email",
    postcode: input.postcode,
    service_address: input.address,
    property_type: input.propertyType,
    preferred_date: input.preferredDate,
    urgency: input.urgency,
    description: input.message,
    language: input.language,
    service_details: {
      channel: "service_request",
      service: input.service,
      company: input.company,
      message: input.message,
    },
  });
}

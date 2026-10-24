/**
 * Bookings — the bridge between an accepted quotation and the operation.
 *
 * A booking is never typed twice: create_booking_from_quote() copies customer,
 * service, both addresses, dates, inventory, extras, attachments and both
 * references from the inquiry onto the job in one server-side transaction, and
 * refuses anything that is not an accepted quotation.
 */

import { supabase } from "@/integrations/supabase/client";
import type { JobExec } from "@/lib/jobs-exec";

export type AcceptedQuote = {
  id: string;
  reference: string;
  leadId: string | null;
  total: number;
  currency: string;
  acceptedAt: string | null;
  customerName: string;
  customerCity: string;
  preferredDate: string | null;
  preferredTime: string;
  bookedJobId: string | null;
  bookedReference: string | null;
};

/** Accepted quotations with the inquiry summary and the booking, if any. */
export async function fetchAcceptedQuotes(): Promise<AcceptedQuote[]> {
  const { data, error } = await supabase
    .from("quotes_customer")
    .select(
      "id, reference, lead_id, total, currency, accepted_at, leads(customer_name, city, preferred_date, preferred_time)",
    )
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    reference: string;
    lead_id: string | null;
    total: number | string;
    currency: string;
    accepted_at: string | null;
    leads: {
      customer_name: string;
      city: string;
      preferred_date: string | null;
      preferred_time: string;
    } | null;
  }>;

  const { data: jobs } = await supabase
    .from("jobs_execution")
    .select("id, reference, quote_id")
    .in("quote_id", rows.map((r) => r.id).length ? rows.map((r) => r.id) : ["00000000-0000-0000-0000-000000000000"]);
  const booked = new Map((jobs ?? []).map((j) => [j.quote_id as string, j]));

  return rows.map((r) => {
    const job = booked.get(r.id);
    return {
      id: r.id,
      reference: r.reference,
      leadId: r.lead_id,
      total: Number(r.total ?? 0),
      currency: r.currency,
      acceptedAt: r.accepted_at,
      customerName: r.leads?.customer_name ?? "",
      customerCity: r.leads?.city ?? "",
      preferredDate: r.leads?.preferred_date ?? null,
      preferredTime: r.leads?.preferred_time ?? "",
      bookedJobId: job?.id ?? null,
      bookedReference: job?.reference ?? null,
    };
  });
}

export type BookingInput = {
  quoteId: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  teamId: string | null;
  vehicleId: string | null;
  notes: string;
};

/** Creates the job from the accepted quotation. Calling twice returns the same job. */
export async function createBookingFromQuote(input: BookingInput): Promise<JobExec> {
  const { data, error } = await supabase.rpc("create_booking_from_quote", {
    _quote_id: input.quoteId,
    ...(input.scheduledStart ? { _scheduled_start: input.scheduledStart } : {}),
    ...(input.scheduledEnd ? { _scheduled_end: input.scheduledEnd } : {}),
    ...(input.teamId ? { _team_id: input.teamId } : {}),
    ...(input.vehicleId ? { _vehicle_id: input.vehicleId } : {}),
    _notes: input.notes,
  });
  if (error) throw error;
  return data as unknown as JobExec;
}

export type BusyResource = { kind: string; id: string; jobReference: string };

/** Teams and vehicles already booked in a window — the dispatcher sees this before assigning. */
export async function fetchBusyResources(
  start: string,
  end: string | null,
  excludeJobId?: string,
): Promise<BusyResource[]> {
  const { data, error } = await supabase.rpc("resource_busy", {
    _start: start,
    _end: end ?? start,
    ...(excludeJobId ? { _exclude_job: excludeJobId } : {}),
  });
  if (error) return [];
  return (data ?? []).map((r) => ({
    kind: r.resource_kind,
    id: r.resource_id,
    jobReference: r.job_reference,
  }));
}

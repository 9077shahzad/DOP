/**
 * Wave 6.1 features: lead triage, photo inventory (pilot) and crew voice notes.
 *
 * Each one reads the records it is allowed to see, asks the model once, writes
 * a reviewable suggestion and returns it. None of them writes to a lead, a
 * quote, a job or any amount — that only happens when a person accepts.
 */
import type { AiFeature, AiRun } from "@/lib/ai/features";
import {
  AiProviderError,
  askModel,
  askModelAboutImages,
  parseJsonAnswer,
  transcribeAudio,
} from "@/lib/ai/gateway.server";
import {
  crewBriefingInstructions,
  crewVoiceInstructions,
  leadTriageInstructions,
  photoInventoryInstructions,
  PROMPT_VERSION,
} from "@/lib/ai/prompts.server";
import { guardFeature, recordSuggestion } from "@/lib/ai/runtime.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function fail<T>(reason: AiRun<T> extends never ? never : Parameters<typeof failReason>[0]): AiRun<T> {
  return { ok: false, reason };
}
function failReason(reason: "disabled" | "budget" | "no_provider" | "rate_limited" | "provider_error" | "no_input") {
  return reason;
}

/** Anything the provider throws becomes a quiet unavailable answer. */
function providerFailure<T>(error: unknown, feature: AiFeature): AiRun<T> {
  const status = error instanceof AiProviderError ? error.status : 0;
  console.error(`ai:${feature} provider failure`, status, error instanceof Error ? error.message : error);
  return { ok: false, reason: status === 429 ? "rate_limited" : "provider_error" };
}

// ---------------------------------------------------------------- lead triage

export type LeadTriage = {
  summary: string;
  requirements: string[];
  complexity_flags: string[];
  missing_information: string[];
  next_action: string;
  draft_reply: string;
  quote_description: string;
};

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 20) : [];
}
function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function runLeadTriage(leadId: string, userId: string): Promise<AiRun<LeadTriage>> {
  const gate = await guardFeature("lead_triage");
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const db = await admin();
  const { data: lead } = await db
    .from("leads")
    .select(
      "id, reference, created_at, language, customer_name, customer_type, customer_email, customer_phone, city, postcode, canton, description, preferred_date, preferred_time, property_type, service_details, status, urgency",
    )
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return fail("no_input");

  const { data: notes } = await db
    .from("lead_notes")
    .select("body, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })
    .limit(20);

  const language = str(lead.language) || "de";
  const material = [
    `Reference: ${lead.reference ?? ""}`,
    `Received: ${lead.created_at ?? ""}`,
    `Customer: ${lead.customer_name ?? ""} (${lead.customer_type ?? ""}), language ${language}`,
    `Contact: ${lead.customer_email ?? ""} ${lead.customer_phone ?? ""}`,
    `Place: ${lead.postcode ?? ""} ${lead.city ?? ""} ${lead.canton ?? ""}`,
    `Property type: ${lead.property_type ?? ""}`,
    `Service details: ${JSON.stringify(lead.service_details ?? {}).slice(0, 1200)}`,
    `Preferred date: ${lead.preferred_date ?? "not given"} ${lead.preferred_time ?? ""}`,
    `Urgency: ${lead.urgency ?? ""}`,
    `Status: ${lead.status ?? ""}`,
    `Enquiry text: ${lead.description ?? ""}`,
    ...(notes ?? []).map((n) => `Internal note: ${n.body ?? ""}`),
  ].join("\n");

  try {
    const answer = await askModel(gate.key, leadTriageInstructions(language), material);
    const parsed = parseJsonAnswer<Partial<LeadTriage>>(answer.text);
    const result: LeadTriage = {
      summary: str(parsed?.summary) || answer.text.slice(0, 800),
      requirements: list(parsed?.requirements),
      complexity_flags: list(parsed?.complexity_flags),
      missing_information: list(parsed?.missing_information),
      next_action: str(parsed?.next_action),
      draft_reply: str(parsed?.draft_reply),
      quote_description: str(parsed?.quote_description),
    };
    const suggestionId = await recordSuggestion({
      feature: "lead_triage",
      subjectType: "lead",
      subjectId: leadId,
      language,
      inputSummary: `${lead.reference ?? leadId} — ${str(lead.description).slice(0, 200)}`,
      payload: result as unknown as Record<string, unknown>,
      outputText: result.draft_reply,
      usage: answer.usage,
      createdBy: userId,
      promptVersion: PROMPT_VERSION,
    });
    return { ok: true, suggestionId, result };
  } catch (error) {
    return providerFailure(error, "lead_triage");
  }
}

// ----------------------------------------------------------- photo inventory

export type PhotoInventory = {
  rooms: string[];
  items: Array<{ name: string; quantity: number; bulky: boolean; note: string }>;
  volume_min_m3: number;
  volume_max_m3: number;
  assumptions: string[];
  missing_coverage: string[];
  needs_survey: boolean;
  questions: string[];
};

const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;
const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

/**
 * Photos come from the private attachment bucket and are sent as data URLs.
 * Only files with recorded consent are sent to the provider.
 */
async function leadPhotos(leadId: string): Promise<{ urls: string[]; skipped: number }> {
  const db = await admin();
  const { data: files } = await db
    .from("lead_attachments")
    .select("storage_path, file_name")
    .eq("lead_id", leadId)
    .limit(30);

  const urls: string[] = [];
  let skipped = 0;
  for (const file of files ?? []) {
    const path = str(file.storage_path);
    if (!path || !IMAGE_EXT.test(path)) continue;
    const { data: consent } = await db
      .from("ai_media_consent")
      .select("consent_given, deleted_at")
      .eq("storage_bucket", "lead-attachments")
      .eq("storage_path", path)
      .maybeSingle();
    if (!consent?.consent_given || consent.deleted_at) {
      skipped += 1;
      continue;
    }
    const { data: blob, error } = await db.storage.from("lead-attachments").download(path);
    if (error || !blob) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const ext = (path.split(".").pop() ?? "jpg").toLowerCase();
    urls.push(`data:${MIME[ext] ?? "image/jpeg"};base64,${btoa(binary)}`);
    if (urls.length >= 12) break;
  }
  return { urls, skipped };
}

export async function runPhotoInventory(leadId: string, userId: string): Promise<AiRun<PhotoInventory>> {
  const gate = await guardFeature("photo_inventory");
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const { urls, skipped } = await leadPhotos(leadId);
  if (urls.length === 0) return fail("no_input");

  const db = await admin();
  const { data: lead } = await db
    .from("leads")
    .select("reference, city, postcode, description")
    .eq("id", leadId)
    .maybeSingle();

  const prompt = [
    `Photographs from an enquiry (${urls.length} pictures${skipped ? `, ${skipped} further files without consent were not sent` : ""}).`,
    `Place: ${lead?.postcode ?? ""} ${lead?.city ?? ""}`,
    `Customer text: ${str(lead?.description).slice(0, 800)}`,
    "Propose the inventory, the bulky items and an indicative volume range.",
  ].join("\n");

  try {
    const answer = await askModelAboutImages(gate.key, photoInventoryInstructions(), prompt, urls);
    const parsed = parseJsonAnswer<Partial<PhotoInventory>>(answer.text);
    const items = Array.isArray(parsed?.items)
      ? (parsed.items as unknown[])
          .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          .slice(0, 120)
          .map((item) => ({
            name: str(item["name"]),
            quantity: Math.max(0, Math.round(Number(item["quantity"]) || 0)),
            bulky: item["bulky"] === true,
            note: str(item["note"]),
          }))
          .filter((item) => item.name)
      : [];
    const min = Number(parsed?.volume_min_m3);
    const max = Number(parsed?.volume_max_m3);
    const result: PhotoInventory = {
      rooms: list(parsed?.rooms),
      items,
      volume_min_m3: Number.isFinite(min) ? Math.max(0, min) : 0,
      volume_max_m3: Number.isFinite(max) ? Math.max(0, max) : 0,
      assumptions: list(parsed?.assumptions),
      missing_coverage: list(parsed?.missing_coverage),
      needs_survey: parsed?.needs_survey !== false,
      questions: list(parsed?.questions),
    };
    const suggestionId = await recordSuggestion({
      feature: "photo_inventory",
      subjectType: "lead",
      subjectId: leadId,
      language: "de",
      inputSummary: `${lead?.reference ?? leadId} — ${urls.length} photos, ${skipped} without consent`,
      payload: result as unknown as Record<string, unknown>,
      outputText: result.assumptions.join(" | "),
      usage: answer.usage,
      createdBy: userId,
      promptVersion: PROMPT_VERSION,
    });
    return { ok: true, suggestionId, result };
  } catch (error) {
    return providerFailure(error, "photo_inventory");
  }
}

// ---------------------------------------------------------- crew voice notes

export type CrewVoiceNote = {
  transcript: string;
  work_completed: string[];
  additional_work: string[];
  incidents: string[];
  follow_up: string[];
  unclear: string[];
  summary: string;
};

export async function runCrewVoiceNote(input: {
  jobId: string;
  userId: string;
  audioBase64: string;
  filename: string;
  mimeType: string;
  spokenLanguage?: string;
}): Promise<AiRun<CrewVoiceNote>> {
  const gate = await guardFeature("crew_voice_note");
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const raw = input.audioBase64.includes(",") ? input.audioBase64.split(",")[1] ?? "" : input.audioBase64;
  if (raw.length < 2000) return fail("no_input");

  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: input.mimeType || "audio/wav" });

  try {
    const transcript = await transcribeAudio(gate.key, blob, input.filename, input.spokenLanguage);
    if (!transcript) return fail("no_input");

    const answer = await askModel(gate.key, crewVoiceInstructions(), `Spoken note:\n${transcript}`);
    const parsed = parseJsonAnswer<Partial<CrewVoiceNote>>(answer.text);
    const result: CrewVoiceNote = {
      transcript,
      work_completed: list(parsed?.work_completed),
      additional_work: list(parsed?.additional_work),
      incidents: list(parsed?.incidents),
      follow_up: list(parsed?.follow_up),
      unclear: list(parsed?.unclear),
      summary: str(parsed?.summary) || transcript.slice(0, 400),
    };
    const suggestionId = await recordSuggestion({
      feature: "crew_voice_note",
      subjectType: "job",
      subjectId: input.jobId,
      language: "de",
      inputSummary: transcript.slice(0, 500),
      payload: result as unknown as Record<string, unknown>,
      outputText: result.summary,
      usage: answer.usage,
      createdBy: input.userId,
      promptVersion: PROMPT_VERSION,
    });
    return { ok: true, suggestionId, result };
  } catch (error) {
    return providerFailure(error, "crew_voice_note");
  }
}

// ------------------------------------------------------------ crew briefing

export type CrewBriefing = {
  summary: string;
  access_notes: string[];
  equipment: string[];
  risks: string[];
  sequence: string[];
  customer_notes: string[];
  open_questions: string[];
};

/**
 * A briefing is written from the recorded job only. It carries no amount and no
 * promise: the crew reads it, the office corrects it, and nothing on the job
 * changes until a person accepts the suggestion.
 */
export async function runCrewBriefing(jobId: string, userId: string): Promise<AiRun<CrewBriefing>> {
  const gate = await guardFeature("crew_briefing");
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const db = await admin();
  const { data: job } = await db
    .from("jobs_execution")
    .select(
      "id, reference, status, service_key, scheduled_start, scheduled_end, customer_name, customer_language, origin, destination, inventory, extras, booking_notes, crew_note",
    )
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return fail("no_input");

  const material = [
    `Job: ${job.reference ?? job.id}`,
    `Service: ${job.service_key ?? ""}`,
    `Status: ${job.status ?? ""}`,
    `Planned start: ${job.scheduled_start ?? "not given"}`,
    `Planned end: ${job.scheduled_end ?? "not given"}`,
    `Customer: ${job.customer_name ?? ""} (language ${str(job.customer_language) || "de"})`,
    `Origin: ${JSON.stringify(job.origin ?? {}).slice(0, 900)}`,
    `Destination: ${JSON.stringify(job.destination ?? {}).slice(0, 900)}`,
    `Inventory: ${JSON.stringify(job.inventory ?? {}).slice(0, 1400)}`,
    `Extras: ${JSON.stringify(job.extras ?? {}).slice(0, 900)}`,
    `Booking notes: ${str(job.booking_notes)}`,
    `Crew notes so far: ${str(job.crew_note)}`,
  ].join("\n");

  try {
    const answer = await askModel(gate.key, crewBriefingInstructions(), material);
    const parsed = parseJsonAnswer<Partial<CrewBriefing>>(answer.text);
    const result: CrewBriefing = {
      summary: str(parsed?.summary) || answer.text.slice(0, 800),
      access_notes: list(parsed?.access_notes),
      equipment: list(parsed?.equipment),
      risks: list(parsed?.risks),
      sequence: list(parsed?.sequence),
      customer_notes: list(parsed?.customer_notes),
      open_questions: list(parsed?.open_questions),
    };
    const suggestionId = await recordSuggestion({
      feature: "crew_briefing",
      subjectType: "job",
      subjectId: jobId,
      language: "de",
      inputSummary: `${job.reference ?? jobId} — ${job.service_key ?? ""} ${job.scheduled_start ?? ""}`,
      payload: result as unknown as Record<string, unknown>,
      outputText: result.summary,
      usage: answer.usage,
      createdBy: userId,
      promptVersion: PROMPT_VERSION,
    });
    return { ok: true, suggestionId, result };
  } catch (error) {
    return providerFailure(error, "crew_briefing");
  }
}

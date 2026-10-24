/**
 * Error monitoring — Sentry-compatible, scrubbed, inert without a DSN.
 *
 * Sends the Sentry envelope over plain fetch so the same code runs in the
 * browser and in the Cloudflare Worker that serves SSR and server functions.
 * No DSN means no transport: events are counted and reported as
 * configuration-blocked, never silently dropped.
 */
import { scrubPayload, type ErrorEnvelopePayload } from "./scrub";

export type MonitoringStatus = {
  configured: boolean;
  environment: string;
  release: string;
  captured: number;
  sent: number;
  failed: number;
  suppressed: number;
  lastError: string;
  lastEventAt: string;
};

type Dsn = { host: string; projectId: string; publicKey: string; protocol: string; path: string };

function readEnv(key: string): string {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const fromVite = viteEnv?.[`VITE_${key}`] ?? viteEnv?.[key];
  if (fromVite) return fromVite;
  if (typeof process !== "undefined" && process.env) return process.env[key] ?? "";
  return "";
}

export function parseDsn(dsn: string): Dsn | null {
  const match = /^(https?):\/\/([^@]+)@([^/]+)(\/.*)?\/(\d+)$/.exec(dsn.trim());
  if (!match) return null;
  return {
    protocol: match[1]!,
    publicKey: match[2]!,
    host: match[3]!,
    path: match[4] ?? "",
    projectId: match[5]!,
  };
}

const state = {
  captured: 0,
  sent: 0,
  failed: 0,
  suppressed: 0,
  lastError: "",
  lastEventAt: "",
  lastPayload: null as ErrorEnvelopePayload | null,
};

export function monitoringEnvironment(): string {
  return readEnv("SENTRY_ENVIRONMENT") || readEnv("APP_ENV") || "preview";
}

export function monitoringRelease(): string {
  return readEnv("SENTRY_RELEASE") || readEnv("APP_VERSION") || "0.0.0-dev";
}

export function monitoringDsn(): string {
  return readEnv("SENTRY_DSN");
}

export function isMonitoringConfigured(): boolean {
  return parseDsn(monitoringDsn()) !== null;
}

export function monitoringStatus(): MonitoringStatus {
  return {
    configured: isMonitoringConfigured(),
    environment: monitoringEnvironment(),
    release: monitoringRelease(),
    captured: state.captured,
    sent: state.sent,
    failed: state.failed,
    suppressed: state.suppressed,
    lastError: state.lastError,
    lastEventAt: state.lastEventAt,
  };
}

/** The exact object handed to the transport — used to prove what is transmitted. */
export function lastTransmittedPayload(): ErrorEnvelopePayload | null {
  return state.lastPayload;
}

export type CaptureOptions = {
  /** frontend | ssr | server_fn | database | job */
  source: string;
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
  /** Literal strings (a customer name, say) that must be redacted. */
  sensitiveTerms?: string[];
};

function describe(error: unknown): { type: string; message: string; stack?: string } {
  if (error instanceof Error) {
    const out: { type: string; message: string; stack?: string } = {
      type: error.name || "Error",
      message: error.message,
    };
    if (error.stack) out.stack = error.stack;
    return out;
  }
  if (error instanceof Response) {
    return { type: "HttpError", message: `Response ${error.status}` };
  }
  return { type: "UnknownError", message: typeof error === "string" ? error : "non-error thrown" };
}

/**
 * Builds the scrubbed payload. Exported so tests — and the proof run — can see
 * exactly what would go over the wire without needing a live DSN.
 */
export function buildEventPayload(error: unknown, options: CaptureOptions): ErrorEnvelopePayload {
  const described = describe(error);
  return scrubPayload(
    {
      type: described.type,
      message: described.message,
      ...(described.stack !== undefined && { stack: described.stack }),
      extra: options.extra ?? {},
      tags: {
        source: options.source,
        environment: monitoringEnvironment(),
        release: monitoringRelease(),
        ...(options.tags ?? {}),
      },
    },
    options.sensitiveTerms ?? [],
  );
}

export function captureError(error: unknown, options: CaptureOptions): ErrorEnvelopePayload {
  const payload = buildEventPayload(error, options);
  state.captured += 1;
  state.lastEventAt = new Date().toISOString();
  state.lastPayload = payload;

  const dsn = parseDsn(monitoringDsn());
  if (!dsn) {
    state.suppressed += 1;
    return payload;
  }
  void send(dsn, payload);
  return payload;
}

async function send(dsn: Dsn, payload: ErrorEnvelopePayload): Promise<void> {
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const sentAt = new Date().toISOString();
  const event = {
    event_id: eventId,
    timestamp: sentAt,
    platform: "javascript",
    level: "error",
    release: monitoringRelease(),
    environment: monitoringEnvironment(),
    tags: payload.tags,
    extra: payload.extra,
    exception: {
      values: [
        {
          type: payload.type,
          value: payload.message,
          stacktrace: payload.stack ? { frames: [{ filename: payload.stack.slice(0, 2000) }] } : undefined,
        },
      ],
    },
  };
  const body = [
    JSON.stringify({ event_id: eventId, sent_at: sentAt }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  const url = `${dsn.protocol}://${dsn.host}${dsn.path}/api/${dsn.projectId}/envelope/?sentry_key=${dsn.publicKey}&sentry_version=7`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body,
    });
    if (response.ok) state.sent += 1;
    else {
      state.failed += 1;
      state.lastError = `transport ${response.status}`;
    }
  } catch (cause) {
    state.failed += 1;
    state.lastError = cause instanceof Error ? cause.message : "transport failed";
  }
}

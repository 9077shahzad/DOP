/**
 * Customer chat assistant.
 *
 * It is an inquiry entry point, not a toy: intent ends in a lead with a
 * reference. It never quotes and never promises a date — those limits are
 * enforced on the server, the widget only reports what came back.
 *
 * Accessibility: the panel is a modal dialog, focus moves into it on open,
 * Escape closes it and returns focus to the launcher, and every model reply is
 * announced through a polite live region.
 */
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { escalateChat, sendChatMessage, startChat } from "@/lib/chat.functions";
import type { Lang } from "@/i18n/config";

type Bubble = { id: number; role: "user" | "assistant" | "system"; text: string };

export function ChatWidget({ lang }: { lang: Lang }) {
  const { t } = useTranslation("chat");
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [handover, setHandover] = useState(false);
  const [handoverName, setHandoverName] = useState("");
  const [handoverContact, setHandoverContact] = useState("");
  const [handoverError, setHandoverError] = useState("");

  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const push = useCallback((role: Bubble["role"], text: string) => {
    setBubbles((prev) => [...prev, { id: nextId.current++, role, text }]);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [bubbles, busy]);

  async function accept() {
    setConsented(true);
    setBusy(true);
    try {
      const result = await startChat({ data: { lang } });
      setSessionId(result.sessionId);
      setAvailable(result.available);
      push("assistant", result.available ? t("greeting") : t("unavailable"));
    } catch {
      setAvailable(false);
      push("system", t("unavailable"));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy || !sessionId) return;
    setInput("");
    push("user", text);
    setBusy(true);
    try {
      const result = await sendChatMessage({ data: { sessionId, lang, message: text } });
      if (result.state === "ok" && result.reply) push("assistant", result.reply);
      else if (result.state === "rate_limited") push("system", t("rateLimited"));
      else if (result.state === "closed") push("system", t("closed"));
      else push("system", t("unavailable"));
      if (result.reference) setReference(result.reference);
    } catch {
      push("system", t("unavailable"));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function requestHuman(event: React.FormEvent) {
    event.preventDefault();
    const name = handoverName.trim();
    const contact = handoverContact.trim();
    if (!name || !contact) {
      setHandoverError(t("handover.error"));
      return;
    }
    if (!sessionId) {
      setHandoverError(t("unavailable"));
      return;
    }
    setHandoverError("");
    setBusy(true);
    try {
      const isEmail = contact.includes("@");
      const result = await escalateChat({
        data: {
          sessionId,
          lang,
          name,
          phone: isEmail ? "" : contact,
          email: isEmail ? contact : "",
        },
      });
      if (result.reference) {
        setReference(result.reference);
        setHandover(false);
        push("system", t("handover.done", { reference: result.reference }));
      } else {
        setHandoverError(t("unavailable"));
      }
    } catch {
      setHandoverError(t("unavailable"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="fixed bottom-20 right-4 z-50 border border-line bg-ink px-4 py-3 text-sm font-medium text-canvas shadow-sm transition-colors motion-fast hover:bg-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:bottom-6"
      >
        {open ? t("close") : t("launch")}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="fixed bottom-36 right-4 z-50 flex max-h-[70vh] w-[min(24rem,calc(100vw-2rem))] flex-col rounded-2xl bg-surface shadow-lg md:bottom-20"
        >
          <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <h2 id={titleId} className="text-sm font-semibold text-ink">
                {t("title")}
              </h2>
              <p className="text-xs text-ink-2">{t("subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                launcherRef.current?.focus();
              }}
              className="border border-line px-2 py-1 text-xs text-ink-2 hover:text-ink"
            >
              {t("close")}
            </button>
          </div>

          {!consented ? (
            <div className="space-y-3 p-4 text-sm text-ink-2">
              <p>{t("consent.body")}</p>
              <p className="text-xs">
                <Link to="/$lang/legal/$docType" params={{ lang, docType: "privacy" }} className="underline">
                  {t("consent.privacy")}
                </Link>
              </p>
              <Button type="button" onClick={accept} disabled={busy} className="w-full">
                {t("consent.accept")}
              </Button>
            </div>
          ) : (
            <>
              <div
                ref={logRef}
                role="log"
                aria-live="polite"
                aria-label={t("logLabel")}
                className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm"
              >
                {bubbles.map((bubble) => (
                  <p
                    key={bubble.id}
                    className={
                      bubble.role === "user"
                        ? "ml-6 border border-line bg-canvas px-3 py-2 text-ink"
                        : bubble.role === "assistant"
                          ? "mr-6 rounded-2xl bg-surface px-3 py-2 text-ink whitespace-pre-line"
                          : "border border-line bg-canvas px-3 py-2 text-xs text-ink-2"
                    }
                  >
                    <span className="sr-only">
                      {bubble.role === "user" ? t("roleYou") : t("roleAssistant")}:{" "}
                    </span>
                    {bubble.text}
                  </p>
                ))}
                {busy ? <p className="text-xs text-ink-2">{t("thinking")}</p> : null}
                {reference ? (
                  <p className="border border-line bg-canvas px-3 py-2 text-xs text-ink">
                    {t("leadCreated", { reference })}
                  </p>
                ) : null}
              </div>

              {available ? (
                <form onSubmit={submit} className="border-t border-line p-3">
                  <label htmlFor="chat-input" className="sr-only">
                    {t("inputLabel")}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="chat-input"
                      ref={inputRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={t("placeholder")}
                      maxLength={1200}
                      autoComplete="off"
                    />
                    <Button type="submit" disabled={busy || !input.trim()}>
                      {t("send")}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 border-t border-line p-3 text-sm text-ink-2">
                  <p>{t("fallback")}</p>
                  <Link
                    to="/$lang/kontakt"
                    params={{ lang }}
                    className="inline-block border border-line px-3 py-2 text-sm text-ink hover:bg-canvas"
                  >
                    {t("toContact")}
                  </Link>
                </div>
              )}

              <div className="border-t border-line px-3 py-2">
                {handover ? (
                  <form onSubmit={requestHuman} className="space-y-2">
                    <p className="text-xs text-ink-2">{t("handover.lead")}</p>
                    <label htmlFor="chat-handover-name" className="sr-only">
                      {t("handover.name")}
                    </label>
                    <Input
                      id="chat-handover-name"
                      value={handoverName}
                      onChange={(event) => setHandoverName(event.target.value)}
                      placeholder={t("handover.name")}
                      autoComplete="name"
                    />
                    <label htmlFor="chat-handover-contact" className="sr-only">
                      {t("handover.contact")}
                    </label>
                    <Input
                      id="chat-handover-contact"
                      value={handoverContact}
                      onChange={(event) => setHandoverContact(event.target.value)}
                      placeholder={t("handover.contact")}
                      autoComplete="tel"
                    />
                    {handoverError ? (
                      <p role="alert" className="text-xs text-danger">
                        {handoverError}
                      </p>
                    ) : null}
                    <Button type="submit" disabled={busy} className="w-full">
                      {t("handover.submit")}
                    </Button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setHandover(true)}
                    className="text-xs text-ink-2 underline hover:text-ink"
                  >
                    {t("handover.open")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

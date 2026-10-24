/**
 * /admin/postfach/einstellungen — mailbox settings.
 *
 * Every value on this page is resolved when the page loads: the provider from
 * settings, MX/SPF/DKIM/DMARC from a live DNS lookup, activity from the real
 * message rows. Nothing shows a green tick that has not been verified, and
 * while the domain does not exist yet the honest answer is "not configured".
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardHeader,
  Chip,
  ErrorState,
  Input,
  LoadingState,
  NoticeState,
  Th,
  Td,
  Tr,
  TableShell,
  btn,
  btnPrimary,
} from "@/components/system";
import i18n from "@/i18n/config";
import type { DnsCheck } from "@/lib/email/dns-types";
import { getMailboxHealth, sendMailboxTest, type MailboxHealth } from "@/lib/inbox-settings.functions";
import { langOf, privateHead } from "@/lib/seo";

export const Route = createFileRoute("/admin/postfach_/einstellungen")({
  head: () => privateHead(langOf(i18n.language), "adminInbox"),
  component: MailboxSettingsPage,
});

function MailboxSettingsPage() {
  const { t } = useTranslation("admin");
  const s = (key: string) => t(`inbox.settings.${key}`);
  const load = useServerFn(getMailboxHealth);
  const test = useServerFn(sendMailboxTest);
  const [recipient, setRecipient] = useState("");

  const health = useQuery<MailboxHealth>({ queryKey: ["mailbox-health"], queryFn: () => load() });
  const testSend = useMutation({ mutationFn: (to: string) => test({ data: { to } }) });

  const stamp = (value: string) =>
    value ? new Date(value).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" }) : s("never");

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{s("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{s("subtitle")}</p>
          </div>
          <Link to="/admin/postfach" className={btn}>
            {s("back")}
          </Link>
        </header>

        {health.isLoading ? <LoadingState label={s("loading")} /> : null}
        {health.isError ? <ErrorState message={String(health.error)} /> : null}

        {health.data ? (
          <div className="space-y-6">
            {!health.data.canSend ? <NoticeState message={s("importOnly")} /> : null}

            <Card>
              <CardHeader title={s("connection")} eyebrow={s("provider")} />
              <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2">
                <Row label={s("provider")} value={health.data.providerLabel} />
                <Row
                  label={s("connection")}
                  value={
                    <span className="inline-flex items-center gap-2">
                      <Chip tone={health.data.connection === "connected" ? "success" : "neutral"}>
                        {health.data.connection === "connected"
                          ? s("connected")
                          : health.data.connection === "partially_configured"
                            ? s("partially")
                            : s("notConfigured")}
                      </Chip>
                      {health.data.connectionDetail ? (
                        <span className="text-muted-foreground">{health.data.connectionDetail}</span>
                      ) : null}
                    </span>
                  }
                />
                <Row label={s("senderName")} value={health.data.senderName || s("notConfigured")} />
                <Row label={s("senderAddress")} value={health.data.senderAddress || s("notConfigured")} />
                <Row label={s("replyTo")} value={health.data.replyTo || s("notConfigured")} />
                <Row label={s("inbound")} value={health.data.inboundAddress || s("notConfigured")} />
                <Row
                  label={s("sending")}
                  value={
                    <Chip tone={health.data.sendingEnabled ? "success" : "neutral"}>
                      {health.data.sendingEnabled ? s("sendingOn") : s("sendingOff")}
                    </Chip>
                  }
                />
                <Row
                  label={s("webhookSecret")}
                  value={health.data.webhookSecretSet ? s("set") : s("unset")}
                />

              </dl>
            </Card>

            <Card>
              <CardHeader title={s("dns")} eyebrow={health.data.domain || s("notConfigured")} />
              <TableShell
                caption={s("dns")}
                head={
                  <Tr>
                    <Th>{s("record")}</Th>
                    <Th>{s("host")}</Th>
                    <Th>{s("connection")}</Th>
                  </Tr>
                }
              >
                {health.data.dns.map((entry: DnsCheck) => (
                  <Tr key={entry.label}>
                    <Td className="font-medium">{entry.label}</Td>
                    <Td className="font-mono text-xs">{entry.hostname}</Td>
                    <Td>
                      <span className="flex flex-col gap-1">
                        <Chip
                          tone={entry.status === "ok" ? "success" : entry.status === "error" ? "danger" : "neutral"}
                        >
                          {entry.status === "ok" ? s("ok") : entry.status === "error" ? s("error") : s("missing")}
                        </Chip>
                        <span className="text-xs text-muted-foreground">{entry.detail}</span>
                        {entry.status === "ok" ? (
                          <span className="break-all font-mono text-xs text-muted-foreground">
                            {entry.records.join(" · ")}
                          </span>
                        ) : null}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </TableShell>

            </Card>

            <Card>
              <CardHeader title={s("templates")} eyebrow={String(health.data.templates.length)} />
              <p className="px-4 pt-4 text-sm text-muted-foreground">{s("templatesHint")}</p>
              <TableShell
                caption={s("templates")}
                head={
                  <Tr>
                    <Th>{s("templateName")}</Th>
                    <Th>{s("templateLangs")}</Th>
                    <Th>{s("connection")}</Th>
                  </Tr>
                }
              >
                {health.data.templates.map((tpl) => (
                  <Tr key={tpl.key}>
                    <Td className="font-medium">
                      {t(`inbox.settings.names.${tpl.key}`, { defaultValue: tpl.key })}
                    </Td>
                    <Td className="font-mono text-xs uppercase">{tpl.languages.join(" · ")}</Td>
                    <Td>
                      <Chip tone="success">{s("templateReady")}</Chip>
                    </Td>
                  </Tr>
                ))}
              </TableShell>
            </Card>



            <Card>
              <CardHeader title={s("activity")} />
              <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2">
                <Row label={s("lastInbound")} value={stamp(health.data.lastInboundAt)} />
                <Row
                  label={s("lastOutbound")}
                  value={`${stamp(health.data.lastOutboundAt)}${
                    health.data.lastOutboundStatus ? ` · ${health.data.lastOutboundStatus}` : ""
                  }`}
                />
                <Row label={s("failed")} value={String(health.data.failedCount)} />
                <Row label={s("pending")} value={String(health.data.pendingCount)} />
              </dl>
            </Card>

            <Card>
              <CardHeader title={s("test")} />
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="email"
                    value={recipient}
                    onChange={(event) => setRecipient(event.target.value)}
                    placeholder={s("testPlaceholder")}
                    aria-label={s("test")}
                    className="max-w-sm"
                  />
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={testSend.isPending || !recipient.includes("@")}
                    onClick={() => testSend.mutate(recipient)}
                  >
                    {s("testSend")}
                  </button>
                </div>
                {testSend.data ? (
                  <p className="text-sm">
                    {testSend.data.sent ? s("testSent") : `${s("testFailed")}: ${testSend.data.reason}`}
                  </p>
                ) : null}
              </div>
            </Card>

            <Card>
              <CardHeader title={s("steps")} />
              <ol className="list-decimal space-y-2 p-4 pl-8 text-sm text-muted-foreground">
                {health.data.setupSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </Card>
          </div>
        ) : null}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-border/60 pb-2">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all">{value}</dd>
    </div>
  );
}

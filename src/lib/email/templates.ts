/**
 * Partner workflow email templates.
 *
 * Plain data in, subject + HTML + text out. No provider details here, so the
 * templates can be rendered in tests, previews and the real send path alike.
 */

import {
  OPERATIONAL_COPY,
  OPERATIONAL_TEMPLATE_KEYS,
  type OperationalTemplateKey,
} from "./templates-operational";
import { greeting, LANGS, type Copy, type EmailLang, type TemplateData } from "./template-types";

export type { EmailLang, TemplateData } from "./template-types";
export type { OperationalTemplateKey } from "./templates-operational";

export type PartnerTemplateKey =
  | "partner_invite"
  | "partner_status"
  | "partner_reminder"
  | "test_notification";

export type EmailTemplateKey = PartnerTemplateKey | OperationalTemplateKey;

export type RenderedEmail = { subject: string; html: string; text: string };

export function asEmailLang(value: string | null | undefined): EmailLang {
  const short = (value ?? "de").slice(0, 2).toLowerCase() as EmailLang;
  return LANGS.includes(short) ? short : "de";
}


const PARTNER_COPY: Record<PartnerTemplateKey, Record<EmailLang, Copy>> = {
  partner_invite: {
    de: {
      subject: () => "Einladung ins Partnernetzwerk",
      heading: () => "Willkommen im Partnernetzwerk",
      intro: (d) => greeting[
        "de"
      ](d.name),
      body: (d) => [
        "Wir laden Sie ein, Ihr Partnerprofil zu vervollständigen und Aufträge über unsere Plattform zu erhalten.",
        d.reference ? `Ihre Referenz: ${d.reference}` : "",
        d.note ?? "",
      ],
      cta: "Registrierung starten",
      footer: "Sie erhalten diese E-Mail, weil Sie als Partner erfasst wurden.",
    },
    fr: {
      subject: () => "Invitation au réseau de partenaires",
      heading: () => "Bienvenue dans le réseau de partenaires",
      intro: (d) => greeting["fr"](d.name),
      body: (d) => [
        "Nous vous invitons à compléter votre profil de partenaire et à recevoir des mandats via notre plateforme.",
        d.reference ? `Votre référence : ${d.reference}` : "",
        d.note ?? "",
      ],
      cta: "Commencer l'inscription",
      footer: "Vous recevez cet e-mail car vous êtes enregistré comme partenaire.",
    },
    it: {
      subject: () => "Invito alla rete partner",
      heading: () => "Benvenuti nella rete partner",
      intro: (d) => greeting["it"](d.name),
      body: (d) => [
        "Vi invitiamo a completare il vostro profilo partner e a ricevere incarichi tramite la nostra piattaforma.",
        d.reference ? `Il vostro riferimento: ${d.reference}` : "",
        d.note ?? "",
      ],
      cta: "Avvia la registrazione",
      footer: "Ricevete questa e-mail perché siete registrati come partner.",
    },
    en: {
      subject: () => "Invitation to the partner network",
      heading: () => "Welcome to the partner network",
      intro: (d) => greeting["en"](d.name),
      body: (d) => [
        "We invite you to complete your partner profile and receive jobs through our platform.",
        d.reference ? `Your reference: ${d.reference}` : "",
        d.note ?? "",
      ],
      cta: "Start registration",
      footer: "You are receiving this email because you were registered as a partner.",
    },
  },
  partner_status: {
    de: {
      subject: (d) => `Statusänderung${d.reference ? ` ${d.reference}` : ""}${d.status ? `: ${d.status}` : ""}`,
      heading: (d) => (d.status ? `Neuer Status: ${d.status}` : "Statusänderung"),
      intro: (d) => greeting["de"](d.name),
      body: (d) => [
        d.status ? `Der Status Ihres Partnerdossiers wurde auf „${d.status}“ geändert.` : "Der Status Ihres Partnerdossiers wurde geändert.",
        d.reference ? `Referenz: ${d.reference}` : "",
        d.note ?? "",
      ],
      cta: "Dossier öffnen",
      footer: "Bei Fragen antworten Sie einfach auf diese E-Mail.",
    },
    fr: {
      subject: (d) => `Changement de statut${d.reference ? ` ${d.reference}` : ""}${d.status ? ` : ${d.status}` : ""}`,
      heading: (d) => (d.status ? `Nouveau statut : ${d.status}` : "Changement de statut"),
      intro: (d) => greeting["fr"](d.name),
      body: (d) => [
        d.status ? `Le statut de votre dossier partenaire a été modifié en « ${d.status} ».` : "Le statut de votre dossier partenaire a été modifié.",
        d.reference ? `Référence : ${d.reference}` : "",
        d.note ?? "",
      ],
      cta: "Ouvrir le dossier",
      footer: "Pour toute question, répondez simplement à cet e-mail.",
    },
    it: {
      subject: (d) => `Cambio di stato${d.reference ? ` ${d.reference}` : ""}${d.status ? `: ${d.status}` : ""}`,
      heading: (d) => (d.status ? `Nuovo stato: ${d.status}` : "Cambio di stato"),
      intro: (d) => greeting["it"](d.name),
      body: (d) => [
        d.status ? `Lo stato del vostro dossier partner è stato modificato in «${d.status}».` : "Lo stato del vostro dossier partner è stato modificato.",
        d.reference ? `Riferimento: ${d.reference}` : "",
        d.note ?? "",
      ],
      cta: "Apri il dossier",
      footer: "Per domande rispondete semplicemente a questa e-mail.",
    },
    en: {
      subject: (d) => `Status update${d.reference ? ` ${d.reference}` : ""}${d.status ? `: ${d.status}` : ""}`,
      heading: (d) => (d.status ? `New status: ${d.status}` : "Status update"),
      intro: (d) => greeting["en"](d.name),
      body: (d) => [
        d.status ? `The status of your partner file changed to "${d.status}".` : "The status of your partner file changed.",
        d.reference ? `Reference: ${d.reference}` : "",
        d.note ?? "",
      ],
      cta: "Open file",
      footer: "If you have questions, simply reply to this email.",
    },
  },
  partner_reminder: {
    de: {
      subject: (d) => `Erinnerung${d.reference ? ` ${d.reference}` : ""}: offene Unterlagen`,
      heading: () => "Freundliche Erinnerung",
      intro: (d) => greeting["de"](d.name),
      body: (d) => [
        "Für Ihr Partnerdossier fehlen noch Angaben oder Dokumente.",
        d.dueDate ? `Frist: ${d.dueDate}` : "",
        d.note ?? "",
      ],
      cta: "Jetzt vervollständigen",
      footer: "Diese Erinnerung wird automatisch versendet.",
    },
    fr: {
      subject: (d) => `Rappel${d.reference ? ` ${d.reference}` : ""} : documents en attente`,
      heading: () => "Rappel amical",
      intro: (d) => greeting["fr"](d.name),
      body: (d) => [
        "Des informations ou documents manquent encore dans votre dossier partenaire.",
        d.dueDate ? `Délai : ${d.dueDate}` : "",
        d.note ?? "",
      ],
      cta: "Compléter maintenant",
      footer: "Ce rappel est envoyé automatiquement.",
    },
    it: {
      subject: (d) => `Promemoria${d.reference ? ` ${d.reference}` : ""}: documenti in sospeso`,
      heading: () => "Promemoria cortese",
      intro: (d) => greeting["it"](d.name),
      body: (d) => [
        "Nel vostro dossier partner mancano ancora informazioni o documenti.",
        d.dueDate ? `Termine: ${d.dueDate}` : "",
        d.note ?? "",
      ],
      cta: "Completa ora",
      footer: "Questo promemoria viene inviato automaticamente.",
    },
    en: {
      subject: (d) => `Reminder${d.reference ? ` ${d.reference}` : ""}: outstanding documents`,
      heading: () => "Friendly reminder",
      intro: (d) => greeting["en"](d.name),
      body: (d) => [
        "Information or documents are still missing from your partner file.",
        d.dueDate ? `Due: ${d.dueDate}` : "",
        d.note ?? "",
      ],
      cta: "Complete now",
      footer: "This reminder is sent automatically.",
    },
  },
  test_notification: {
    de: {
      subject: () => "Testnachricht – E-Mail-Zustellung",
      heading: () => "Testnachricht",
      intro: (d) => greeting["de"](d.name),
      body: (d) => [
        "Diese E-Mail bestätigt, dass der E-Mail-Versand korrekt konfiguriert ist.",
        d.note ?? "",
      ],
      cta: "Adminbereich öffnen",
      footer: "Automatisch erzeugte Testnachricht.",
    },
    fr: {
      subject: () => "Message de test – envoi d'e-mails",
      heading: () => "Message de test",
      intro: (d) => greeting["fr"](d.name),
      body: (d) => ["Cet e-mail confirme que l'envoi d'e-mails est correctement configuré.", d.note ?? ""],
      cta: "Ouvrir l'administration",
      footer: "Message de test généré automatiquement.",
    },
    it: {
      subject: () => "Messaggio di prova – invio e-mail",
      heading: () => "Messaggio di prova",
      intro: (d) => greeting["it"](d.name),
      body: (d) => ["Questa e-mail conferma che l'invio delle e-mail è configurato correttamente.", d.note ?? ""],
      cta: "Apri l'amministrazione",
      footer: "Messaggio di prova generato automaticamente.",
    },
    en: {
      subject: () => "Test message – email delivery",
      heading: () => "Test message",
      intro: (d) => greeting["en"](d.name),
      body: (d) => ["This email confirms that email delivery is configured correctly.", d.note ?? ""],
      cta: "Open admin",
      footer: "Automatically generated test message.",
    },
  },
};

const COPY: Record<EmailTemplateKey, Record<EmailLang, Copy>> = {
  ...PARTNER_COPY,
  ...OPERATIONAL_COPY,
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmail(
  template: EmailTemplateKey,
  lang: EmailLang,
  data: TemplateData,
): RenderedEmail {
  const copy = COPY[template][lang];
  const paragraphs = copy.body(data).map((line) => line.trim()).filter(Boolean);
  const company = data.companyName?.trim() || "PS Umzug AG";
  const subject = copy.subject(data);

  const cta = data.actionUrl
    ? `<p style="margin:28px 0 0"><a href="${escapeHtml(data.actionUrl)}" style="display:inline-block;background:#312e81;color:#ffffff;padding:12px 20px;text-decoration:none;font-size:14px;letter-spacing:0.04em;text-transform:uppercase">${escapeHtml(copy.cta)}</a></p>`
    : "";

  const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f5f5f7;font-family:Helvetica,Arial,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e5e7eb">
        <tr><td style="background:#111827;padding:18px 24px;color:#ffffff;font-size:13px;letter-spacing:0.16em;text-transform:uppercase">${escapeHtml(company)}</td></tr>
        <tr><td style="padding:28px 24px">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827">${escapeHtml(copy.heading(data))}</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6">${escapeHtml(copy.intro(data))}</p>
          ${paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${escapeHtml(p)}</p>`).join("")}
          ${cta}
        </td></tr>
        <tr><td style="padding:18px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">${escapeHtml(copy.footer)}<br>${escapeHtml(company)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [copy.heading(data), "", copy.intro(data), "", ...paragraphs, data.actionUrl ? `\n${copy.cta}: ${data.actionUrl}` : "", "", copy.footer, company]
    .filter((line) => line !== undefined)
    .join("\n");

  return { subject, html, text };
}

export const PARTNER_TEMPLATE_KEYS: PartnerTemplateKey[] = [
  "partner_invite",
  "partner_status",
  "partner_reminder",
  "test_notification",
];

export const TEMPLATE_KEYS: EmailTemplateKey[] = [
  ...PARTNER_TEMPLATE_KEYS,
  ...OPERATIONAL_TEMPLATE_KEYS,
];

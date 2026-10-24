/**
 * Operational notification templates: the customer and operations mails that
 * accompany an order from the first inquiry through to the invoice.
 *
 * These are prepared and renderable (and covered by tests) before any provider
 * is connected — nothing here decides whether a mail is actually sent.
 */

import { copyOf, type Copy, type EmailLang, type TemplateData } from "./template-types";

export type OperationalTemplateKey =
  | "inquiry_confirmation"
  | "quote_sent"
  | "booking_confirmation"
  | "change_order"
  | "work_order_update"
  | "job_completion"
  | "invoice"
  | "ops_notification"
  | "review_request"
  | "order_document";

const ref = (d: TemplateData, label: string) => (d.reference ? `${label}: ${d.reference}` : "");
const list = (d: TemplateData) => (d.items ?? []).filter((line) => Boolean(line && line.trim()));

export const OPERATIONAL_COPY: Record<OperationalTemplateKey, Record<EmailLang, Copy>> = {
  /* ------------------------------------------------ inquiry confirmation */
  inquiry_confirmation: {
    de: copyOf("de", {
      subject: (d) => `Ihre Anfrage ist bei uns eingegangen${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Anfrage eingegangen",
      body: (d) => [
        "Vielen Dank für Ihre Anfrage. Wir haben sie erfasst und melden uns mit den nächsten Schritten.",
        ref(d, "Referenz"),
        d.scheduledFor ? `Gewünschter Termin: ${d.scheduledFor}` : "",
        d.location ? `Objekt: ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Anfrage ansehen",
      footer: "Sie erhalten diese E-Mail, weil Sie eine Anfrage gestellt haben.",
    }),
    fr: copyOf("fr", {
      subject: (d) => `Nous avons bien reçu votre demande${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Demande reçue",
      body: (d) => [
        "Merci pour votre demande. Nous l'avons enregistrée et revenons vers vous avec les prochaines étapes.",
        ref(d, "Référence"),
        d.scheduledFor ? `Date souhaitée : ${d.scheduledFor}` : "",
        d.location ? `Objet : ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Voir la demande",
      footer: "Vous recevez cet e-mail car vous avez envoyé une demande.",
    }),
    it: copyOf("it", {
      subject: (d) => `Abbiamo ricevuto la vostra richiesta${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Richiesta ricevuta",
      body: (d) => [
        "Grazie per la vostra richiesta. L'abbiamo registrata e vi contatteremo con i prossimi passi.",
        ref(d, "Riferimento"),
        d.scheduledFor ? `Data desiderata: ${d.scheduledFor}` : "",
        d.location ? `Oggetto: ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Vedere la richiesta",
      footer: "Ricevete questa e-mail perché avete inviato una richiesta.",
    }),
    en: copyOf("en", {
      subject: (d) => `We received your inquiry${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Inquiry received",
      body: (d) => [
        "Thank you for your inquiry. We have recorded it and will come back to you with the next steps.",
        ref(d, "Reference"),
        d.scheduledFor ? `Requested date: ${d.scheduledFor}` : "",
        d.location ? `Property: ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "View inquiry",
      footer: "You are receiving this email because you submitted an inquiry.",
    }),
  },

  /* ------------------------------------------------------------- quote */
  quote_sent: {
    de: copyOf("de", {
      subject: (d) => `Ihre Offerte${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "Ihre Offerte liegt bereit",
      body: (d) => [
        "Wir haben Ihre Offerte erstellt. Sie können sie online einsehen und bestätigen.",
        ref(d, "Referenz"),
        d.amount ? `Betrag inkl. MWST: ${d.amount}` : "",
        d.dueDate ? `Gültig bis: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Offerte öffnen",
      footer: "Die Offerte ist erst mit Ihrer Bestätigung verbindlich.",
    }),
    fr: copyOf("fr", {
      subject: (d) => `Votre offre${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "Votre offre est prête",
      body: (d) => [
        "Nous avons établi votre offre. Vous pouvez la consulter et la confirmer en ligne.",
        ref(d, "Référence"),
        d.amount ? `Montant TVA incluse : ${d.amount}` : "",
        d.dueDate ? `Valable jusqu'au : ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Ouvrir l'offre",
      footer: "L'offre n'est contraignante qu'après votre confirmation.",
    }),
    it: copyOf("it", {
      subject: (d) => `La vostra offerta${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "La vostra offerta è pronta",
      body: (d) => [
        "Abbiamo preparato la vostra offerta. Potete consultarla e confermarla online.",
        ref(d, "Riferimento"),
        d.amount ? `Importo IVA inclusa: ${d.amount}` : "",
        d.dueDate ? `Valida fino al: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Aprire l'offerta",
      footer: "L'offerta diventa vincolante solo con la vostra conferma.",
    }),
    en: copyOf("en", {
      subject: (d) => `Your quote${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "Your quote is ready",
      body: (d) => [
        "We have prepared your quote. You can review and confirm it online.",
        ref(d, "Reference"),
        d.amount ? `Amount incl. VAT: ${d.amount}` : "",
        d.dueDate ? `Valid until: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Open quote",
      footer: "The quote only becomes binding once you confirm it.",
    }),
  },

  /* ------------------------------------------------ booking confirmation */
  booking_confirmation: {
    de: copyOf("de", {
      subject: (d) => `Auftragsbestätigung${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "Ihr Auftrag ist bestätigt",
      body: (d) => [
        "Ihr Auftrag ist bei uns bestätigt und eingeplant.",
        ref(d, "Referenz"),
        d.scheduledFor ? `Termin: ${d.scheduledFor}` : "",
        d.location ? `Objekt: ${d.location}` : "",
        d.amount ? `Vereinbarter Betrag inkl. MWST: ${d.amount}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Auftrag ansehen",
      footer: "Änderungen und Stornierungen richten sich nach unseren Bedingungen.",
    }),
    fr: copyOf("fr", {
      subject: (d) => `Confirmation de commande${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "Votre commande est confirmée",
      body: (d) => [
        "Votre commande est confirmée et planifiée.",
        ref(d, "Référence"),
        d.scheduledFor ? `Date : ${d.scheduledFor}` : "",
        d.location ? `Objet : ${d.location}` : "",
        d.amount ? `Montant convenu TVA incluse : ${d.amount}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Voir la commande",
      footer: "Les modifications et annulations suivent nos conditions.",
    }),
    it: copyOf("it", {
      subject: (d) => `Conferma d'ordine${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "Il vostro ordine è confermato",
      body: (d) => [
        "Il vostro ordine è confermato e pianificato.",
        ref(d, "Riferimento"),
        d.scheduledFor ? `Data: ${d.scheduledFor}` : "",
        d.location ? `Oggetto: ${d.location}` : "",
        d.amount ? `Importo concordato IVA inclusa: ${d.amount}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Vedere l'ordine",
      footer: "Modifiche e disdette seguono le nostre condizioni.",
    }),
    en: copyOf("en", {
      subject: (d) => `Booking confirmation${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "Your booking is confirmed",
      body: (d) => [
        "Your booking is confirmed and scheduled.",
        ref(d, "Reference"),
        d.scheduledFor ? `Date: ${d.scheduledFor}` : "",
        d.location ? `Property: ${d.location}` : "",
        d.amount ? `Agreed amount incl. VAT: ${d.amount}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "View booking",
      footer: "Changes and cancellations follow our terms.",
    }),
  },

  /* -------------------------------------------------------- change order */
  change_order: {
    de: copyOf("de", {
      subject: (d) => `Nachtrag zur Freigabe${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Nachtrag zur Freigabe",
      body: (d) => [
        "Für Ihren Auftrag liegt ein Nachtrag vor. Er wird erst nach Ihrer Freigabe ausgeführt.",
        ref(d, "Referenz"),
        d.amount ? `Zusätzlicher Betrag inkl. MWST: ${d.amount}` : "",
        d.dueDate ? `Antwort erbeten bis: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Nachtrag prüfen",
      footer: "Ohne Ihre Freigabe wird kein Zusatzaufwand verrechnet.",
    }),
    fr: copyOf("fr", {
      subject: (d) => `Avenant à approuver${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Avenant à approuver",
      body: (d) => [
        "Un avenant existe pour votre commande. Il ne sera exécuté qu'après votre approbation.",
        ref(d, "Référence"),
        d.amount ? `Montant supplémentaire TVA incluse : ${d.amount}` : "",
        d.dueDate ? `Réponse souhaitée avant le : ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Examiner l'avenant",
      footer: "Aucun surcoût n'est facturé sans votre approbation.",
    }),
    it: copyOf("it", {
      subject: (d) => `Variante da approvare${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Variante da approvare",
      body: (d) => [
        "Per il vostro ordine è disponibile una variante. Sarà eseguita solo dopo la vostra approvazione.",
        ref(d, "Riferimento"),
        d.amount ? `Importo aggiuntivo IVA inclusa: ${d.amount}` : "",
        d.dueDate ? `Risposta richiesta entro: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Esaminare la variante",
      footer: "Nessun costo aggiuntivo viene fatturato senza la vostra approvazione.",
    }),
    en: copyOf("en", {
      subject: (d) => `Change order for approval${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Change order for approval",
      body: (d) => [
        "There is a change order for your booking. It is only carried out after your approval.",
        ref(d, "Reference"),
        d.amount ? `Additional amount incl. VAT: ${d.amount}` : "",
        d.dueDate ? `Please reply by: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Review change order",
      footer: "No additional work is charged without your approval.",
    }),
  },

  /* --------------------------------------------------- work order update */
  work_order_update: {
    de: copyOf("de", {
      subject: (d) => `Auftragsupdate${d.reference ? ` ${d.reference}` : ""}${d.status ? `: ${d.status}` : ""}`,
      heading: (d) => (d.status ? `Neuer Stand: ${d.status}` : "Auftragsupdate"),
      body: (d) => [
        "Der Stand Ihres Auftrags hat sich geändert.",
        ref(d, "Referenz"),
        d.scheduledFor ? `Termin: ${d.scheduledFor}` : "",
        d.location ? `Objekt: ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Auftrag öffnen",
      footer: "Sie erhalten Statusmeldungen zu Ihrem laufenden Auftrag.",
    }),
    fr: copyOf("fr", {
      subject: (d) => `Mise à jour${d.reference ? ` ${d.reference}` : ""}${d.status ? ` : ${d.status}` : ""}`,
      heading: (d) => (d.status ? `Nouvel état : ${d.status}` : "Mise à jour du mandat"),
      body: (d) => [
        "L'état de votre mandat a changé.",
        ref(d, "Référence"),
        d.scheduledFor ? `Date : ${d.scheduledFor}` : "",
        d.location ? `Objet : ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Ouvrir le mandat",
      footer: "Vous recevez les mises à jour de votre mandat en cours.",
    }),
    it: copyOf("it", {
      subject: (d) => `Aggiornamento${d.reference ? ` ${d.reference}` : ""}${d.status ? `: ${d.status}` : ""}`,
      heading: (d) => (d.status ? `Nuovo stato: ${d.status}` : "Aggiornamento incarico"),
      body: (d) => [
        "Lo stato del vostro incarico è cambiato.",
        ref(d, "Riferimento"),
        d.scheduledFor ? `Data: ${d.scheduledFor}` : "",
        d.location ? `Oggetto: ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Aprire l'incarico",
      footer: "Ricevete gli aggiornamenti del vostro incarico in corso.",
    }),
    en: copyOf("en", {
      subject: (d) => `Work order update${d.reference ? ` ${d.reference}` : ""}${d.status ? `: ${d.status}` : ""}`,
      heading: (d) => (d.status ? `New status: ${d.status}` : "Work order update"),
      body: (d) => [
        "The status of your work order has changed.",
        ref(d, "Reference"),
        d.scheduledFor ? `Date: ${d.scheduledFor}` : "",
        d.location ? `Property: ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Open work order",
      footer: "You receive status updates for your running work order.",
    }),
  },

  /* ------------------------------------------------------- job completion */
  job_completion: {
    de: copyOf("de", {
      subject: (d) => `Arbeiten abgeschlossen${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Arbeiten abgeschlossen",
      body: (d) => [
        "Die vereinbarten Arbeiten sind abgeschlossen. Vielen Dank für Ihr Vertrauen.",
        ref(d, "Referenz"),
        d.scheduledFor ? `Ausführung: ${d.scheduledFor}` : "",
        d.location ? `Objekt: ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Abschluss ansehen",
      footer: "Beanstandungen melden Sie uns bitte umgehend.",
    }),
    fr: copyOf("fr", {
      subject: (d) => `Travaux terminés${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Travaux terminés",
      body: (d) => [
        "Les travaux convenus sont terminés. Merci de votre confiance.",
        ref(d, "Référence"),
        d.scheduledFor ? `Exécution : ${d.scheduledFor}` : "",
        d.location ? `Objet : ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Voir la clôture",
      footer: "Merci de nous signaler immédiatement toute réclamation.",
    }),
    it: copyOf("it", {
      subject: (d) => `Lavori conclusi${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Lavori conclusi",
      body: (d) => [
        "I lavori concordati sono conclusi. Grazie per la fiducia.",
        ref(d, "Riferimento"),
        d.scheduledFor ? `Esecuzione: ${d.scheduledFor}` : "",
        d.location ? `Oggetto: ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Vedere la chiusura",
      footer: "Vi preghiamo di segnalarci subito eventuali contestazioni.",
    }),
    en: copyOf("en", {
      subject: (d) => `Work completed${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Work completed",
      body: (d) => [
        "The agreed work has been completed. Thank you for your trust.",
        ref(d, "Reference"),
        d.scheduledFor ? `Executed: ${d.scheduledFor}` : "",
        d.location ? `Property: ${d.location}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "View completion",
      footer: "Please report any complaints to us without delay.",
    }),
  },

  /* ------------------------------------------------------------- invoice */
  invoice: {
    de: copyOf("de", {
      subject: (d) => `Rechnung${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "Ihre Rechnung",
      body: (d) => [
        "Anbei finden Sie die Rechnung zu Ihrem Auftrag.",
        ref(d, "Rechnungsnummer"),
        d.amount ? `Betrag inkl. MWST: ${d.amount}` : "",
        d.dueDate ? `Zahlbar bis: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Rechnung öffnen",
      footer: "Bitte geben Sie bei der Zahlung die Rechnungsnummer an.",
    }),
    fr: copyOf("fr", {
      subject: (d) => `Facture${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "Votre facture",
      body: (d) => [
        "Veuillez trouver ci-joint la facture relative à votre mandat.",
        ref(d, "Numéro de facture"),
        d.amount ? `Montant TVA incluse : ${d.amount}` : "",
        d.dueDate ? `Payable jusqu'au : ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Ouvrir la facture",
      footer: "Merci d'indiquer le numéro de facture lors du paiement.",
    }),
    it: copyOf("it", {
      subject: (d) => `Fattura${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "La vostra fattura",
      body: (d) => [
        "In allegato trovate la fattura relativa al vostro incarico.",
        ref(d, "Numero di fattura"),
        d.amount ? `Importo IVA inclusa: ${d.amount}` : "",
        d.dueDate ? `Pagabile entro: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Aprire la fattura",
      footer: "Vi preghiamo di indicare il numero di fattura al pagamento.",
    }),
    en: copyOf("en", {
      subject: (d) => `Invoice${d.reference ? ` ${d.reference}` : ""}`,
      heading: () => "Your invoice",
      body: (d) => [
        "Please find the invoice for your booking below.",
        ref(d, "Invoice number"),
        d.amount ? `Amount incl. VAT: ${d.amount}` : "",
        d.dueDate ? `Payable by: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Open invoice",
      footer: "Please quote the invoice number with your payment.",
    }),
  },

  /* -------------------------------------------- partner / ops notification */
  ops_notification: {
    de: copyOf("de", {
      subject: (d) => `${d.status?.trim() || "Meldung"}${d.reference ? ` – ${d.reference}` : ""}`,
      heading: (d) => d.status?.trim() || "Interne Meldung",
      body: (d) => [
        ref(d, "Referenz"),
        d.location ? `Objekt: ${d.location}` : "",
        d.scheduledFor ? `Termin: ${d.scheduledFor}` : "",
        d.amount ? `Betrag: ${d.amount}` : "",
        d.dueDate ? `Frist: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Im Adminbereich öffnen",
      footer: "Interne Benachrichtigung für Partner und Disposition.",
    }),
    fr: copyOf("fr", {
      subject: (d) => `${d.status?.trim() || "Notification"}${d.reference ? ` – ${d.reference}` : ""}`,
      heading: (d) => d.status?.trim() || "Notification interne",
      body: (d) => [
        ref(d, "Référence"),
        d.location ? `Objet : ${d.location}` : "",
        d.scheduledFor ? `Date : ${d.scheduledFor}` : "",
        d.amount ? `Montant : ${d.amount}` : "",
        d.dueDate ? `Délai : ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Ouvrir dans l'administration",
      footer: "Notification interne pour les partenaires et la répartition.",
    }),
    it: copyOf("it", {
      subject: (d) => `${d.status?.trim() || "Notifica"}${d.reference ? ` – ${d.reference}` : ""}`,
      heading: (d) => d.status?.trim() || "Notifica interna",
      body: (d) => [
        ref(d, "Riferimento"),
        d.location ? `Oggetto: ${d.location}` : "",
        d.scheduledFor ? `Data: ${d.scheduledFor}` : "",
        d.amount ? `Importo: ${d.amount}` : "",
        d.dueDate ? `Termine: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Aprire nell'amministrazione",
      footer: "Notifica interna per partner e disposizione.",
    }),
    en: copyOf("en", {
      subject: (d) => `${d.status?.trim() || "Notification"}${d.reference ? ` – ${d.reference}` : ""}`,
      heading: (d) => d.status?.trim() || "Internal notification",
      body: (d) => [
        ref(d, "Reference"),
        d.location ? `Property: ${d.location}` : "",
        d.scheduledFor ? `Date: ${d.scheduledFor}` : "",
        d.amount ? `Amount: ${d.amount}` : "",
        d.dueDate ? `Deadline: ${d.dueDate}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Open in admin",
      footer: "Internal notification for partners and dispatch.",
    }),
  },

  /* ---------------------------------------------------- review request */
  review_request: {
    de: copyOf("de", {
      subject: (d) => `Wie war Ihr Umzug?${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Ihre Rückmeldung zählt",
      body: (d) => [
        "Ihr Auftrag ist abgeschlossen. Mit zwei Klicks sagen Sie uns, wie es gelaufen ist.",
        ref(d, "Referenz"),
        d.scheduledFor ? `Ausführung: ${d.scheduledFor}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Jetzt bewerten",
      footer: "Sie erhalten diese E-Mail, weil Ihr Auftrag abgeschlossen wurde.",
    }),
    fr: copyOf("fr", {
      subject: (d) => `Comment s'est passé votre déménagement ?${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Votre avis compte",
      body: (d) => [
        "Votre commande est terminée. En deux clics, dites-nous comment cela s'est passé.",
        ref(d, "Référence"),
        d.scheduledFor ? `Exécution : ${d.scheduledFor}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Donner un avis",
      footer: "Vous recevez cet e-mail car votre commande est terminée.",
    }),
    it: copyOf("it", {
      subject: (d) => `Com'è andato il vostro trasloco?${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "La vostra opinione conta",
      body: (d) => [
        "Il vostro ordine è concluso. Con due clic ci dite com'è andata.",
        ref(d, "Riferimento"),
        d.scheduledFor ? `Esecuzione: ${d.scheduledFor}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Lascia una valutazione",
      footer: "Ricevete questa e-mail perché il vostro ordine è concluso.",
    }),
    en: copyOf("en", {
      subject: (d) => `How was your move?${d.reference ? ` – ${d.reference}` : ""}`,
      heading: () => "Your feedback matters",
      body: (d) => [
        "Your job is complete. Two clicks tell us how it went.",
        ref(d, "Reference"),
        d.scheduledFor ? `Completed: ${d.scheduledFor}` : "",
        ...list(d),
        d.note ?? "",
      ],
      cta: "Leave a review",
      footer: "You receive this e-mail because your job was completed.",
    }),
  },
  /* ------------------------------------------------ order document (Auftrag PDF) */
  order_document: (() => {
    const de = copyOf("de", {
      subject: (d) => `Ihr Auftrag${d.reference ? ` ${d.reference}` : ""} – Auftragsdokument`,
      heading: () => "Ihr Auftrag",
      body: (d) => [
        "Im Anhang-Link finden Sie Ihr Auftragsdokument (PDF) auf Grundlage der angenommenen Offerte.",
        ref(d, "Auftrag"),
        d.scheduledFor ? `Termin: ${d.scheduledFor}` : "",
        d.amount ? `Vereinbarter Betrag inkl. MWST: ${d.amount}` : "",
        "Der Link ist aus Sicherheitsgründen 14 Tage gültig.",
        d.note ?? "",
      ],
      cta: "Auftrag (PDF) öffnen",
      footer: "Änderungen und Stornierungen richten sich nach unseren Bedingungen.",
    });
    // German is the approved fallback for the other languages.
    return { de, fr: de, it: de, en: de };
  })(),
};

export const OPERATIONAL_TEMPLATE_KEYS: OperationalTemplateKey[] = [
  "inquiry_confirmation",
  "quote_sent",
  "booking_confirmation",
  "change_order",
  "work_order_update",
  "job_completion",
  "invoice",
  "ops_notification",
  "review_request",
  "order_document",
];

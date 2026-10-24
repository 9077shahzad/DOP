import { CheckCircle2, Loader2, Printer, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { buttonVariants } from "@/components/system";
import type { Lang } from "@/i18n/config";
import { groupLines } from "@/lib/line-groups";
import { isEstimateDocument } from "@/lib/quote-disclaimer";
import { formatCurrency, formatDayMonthYear, formatNumber } from "@/i18n/format";
import {
  clockLabel,
  CLEANING_HANDOVER_HOUR,
  CLEANING_START_HOUR,
  FIXED_START_TIME,
  cleaningReviewItems,
  effectiveCleaning,
  MAIN_AND_EXTRA_SERVICE_KEYS,
  type Calculation,
  type PlannerState,
  type TimelinePlan,
} from "@/lib/pricing";
import { fetchInventory, inventoryName } from "@/lib/inventory";
import { useCompany } from "@/components/shell/CompanyContext";
import { fetchDocument } from "@/lib/legal-data";
import { fetchQuoteReviewState, submitQuoteReview } from "@/lib/quote-review.functions";
import type { ReviewSubmission } from "@/lib/quote-review.server";

/** Fills {{token}} from stored company data; only a truly missing value stays "[ausstehend]". */
function legalToken(token: string, c: Record<string, unknown> | null | undefined): string {
  const v = (k: string) => String(c?.[k] ?? "").trim();
  switch (token) {
    case "address":
      return [v("address_line"), [v("postal_code"), v("city")].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    case "currency":
      return "CHF";
    default:
      return v(token);
  }
}

function legalBlocks(body: string, company?: Record<string, unknown> | null) {
  const blocks: Array<{ title: string; body: string[]; icon: "terms" }> = [];
  let current: { title: string; body: string[]; icon: "terms" } | null = null;
  for (const raw of body.split(/\n/)) {
    const text = raw.trim();
    if (!text || text.startsWith("# ") || text.startsWith("> ")) continue;
    if (text.startsWith("## ")) {
      current = { title: text.slice(3).trim(), body: [], icon: "terms" };
      blocks.push(current);
    } else {
      if (!current) {
        current = { title: "", body: [], icon: "terms" };
        blocks.push(current);
      }
      current.body.push(
        text
          .replace(/^[-*]\s+/, "• ")
          .replace(/\*\*/g, "")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_m, key: string) => legalToken(key, company) || "[ausstehend]"),
      );
    }
  }
  return blocks;
}

export function QuotePreview({
  calc,
  lang,
  reference,
  email,
  state,
  plans = [],
  version = 1,
  status,
  submittable = false,
  contact,
  adjustment,
  documentKind = "quote",
  orderJobId,
  autoDownload = false,
  onDownloaded,
}: {
  /** Staff "Manuelle Preisanpassung": separate gross line, calculation untouched. */
  adjustment?: { amount: number; customerNote?: string | null };
  /** Staff order copy from the accepted offer; customer acceptance stays on the quote. */
  documentKind?: "quote" | "order";
  /** Job id when this preview is the Auftrag of a booked job (enables send). */
  orderJobId?: string;
  autoDownload?: boolean;
  onDownloaded?: (error?: string) => void;
  calc: Calculation;
  lang: Lang;
  reference: string;
  email: string;
  state?: PlannerState;
  /** False while the quotation is only a live preview and has no stored record. */
  submittable?: boolean;
  /** E-mail or phone the quotation was requested with; proves ownership. */
  contact?: string;
  /** One dated plan per service day — moving and cleaning stay separate. */
  plans?: TimelinePlan[];
  version?: number;
  status?: string;
}) {
  const company = useCompany();
  const { t } = useTranslation("planer");
  const { t: tDoc } = useTranslation("admin");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ReviewSubmission | null>(null);
  const [error, setError] = useState("");
  const proof = (contact ?? email ?? "").trim();
  const showEstimateNote = isEstimateDocument({ documentKind, status, version });
  // One named discount line: "Kombinationsrabatt – 5%" or "Standortrabatt
  // Steffisburg – 5%". Older offers without a stored reason keep the generic label.
  const discountLabel = calc.discountReason
    ? t(`quote.discountReason.${calc.discountReason}`, { pct: formatNumber(calc.discountRate * 100, lang, { maximumFractionDigits: 2 }) })
    : `${t("quote.discount")} ${Math.round(calc.discountRate * 100)} %`;

  // With a manual adjustment, net and VAT are shown for the calculated total so
  // Zwischentotal − Rabatt = Total netto stays readable; the adjustment follows.
  const adjAmount = adjustment?.amount ?? 0;
  const vatRatio = calc.net > 0 ? calc.vat / calc.net : 0;
  const shownNet = adjAmount ? Math.round(((calc.total - adjAmount) / (1 + vatRatio)) * 100) / 100 : calc.net;
  const shownVat = adjAmount ? Math.round((calc.total - adjAmount - shownNet) * 100) / 100 : calc.vat;

  // Whether this quotation was already submitted decides whether a PDF copy
  // may be handed out at all — the reference alone never unlocks it.
  const reviewed = useQuery({
    queryKey: ["quote-review", reference, proof],
    enabled: submittable && Boolean(reference) && Boolean(proof),
    queryFn: () => fetchQuoteReviewState({ data: { reference, contact: proof } }),
  });
  const state0 = result ?? reviewed.data ?? null;
  const submitted = Boolean(state0?.submittedAt);
  // Names only: retired categories must still read as names in older requests.
  const catalogue = useQuery({ queryKey: ["inventory-catalogue", "all"], queryFn: () => fetchInventory(true) });
  const terms = useQuery({
    queryKey: ["quote-terms", lang],
    queryFn: () => fetchDocument(lang, "terms"),
  });

  const downloadStarted = useRef(false);
  useEffect(() => {
    if (!autoDownload || downloadStarted.current || catalogue.isPending || terms.isPending) return;
    downloadStarted.current = true;
    void downloadPdf();
  }, [autoDownload, catalogue.isPending, terms.isPending]);


  /** Extra service name, with the packing-material choice where made. */
  function extraLabel(key: string): string {
    const base = t(`step8.items.${key}`);
    if (key === "packing_material" && state?.packingMaterialOption) {
      return `${base} — ${t(`step8.packingMaterial.${state.packingMaterialOption}`)}`;
    }
    return base;
  }

  /** Position label; per-piece positions show quantity × unit rate. */
  /** One-line split of the move position; display only, parts sum to the position. */
  function moveDetail(): string | null {
    const b = calc.moveBreakdown;
    if (!b) return null;
    return t("quote.moveBreakdown", {
      base: formatCurrency(b.base, lang, 2),
      m3: formatNumber(b.m3, lang, { maximumFractionDigits: 1 }),
      volume: formatCurrency(b.volume, lang, 2),
      km: formatNumber(b.km, lang, { maximumFractionDigits: 1 }),
      kmRate: formatCurrency(b.kmRate, lang, 2),
      distance: formatCurrency(b.distance, lang, 2),
    });
  }

  function lineLabel(id: string, amount: number): string {
    const base = t(`quote.lines.${id}`);
    if (id === "clean_dowel_holes" && state) {
      const qty = effectiveCleaning(state.cleaning).dowelHoles;
      if (qty > 0) return `${base} (${qty} × ${formatCurrency(amount / qty, lang, 2)})`;
    }
    return base;
  }

  // A real PDF file instead of window.print(): mobile browsers frequently
  // ignore print() inside an in-app webview, leaving the customer with nothing.
  async function buildPdf(): Promise<{ blob: Blob; filename: string } | null> {
    {
      const [{ renderQuotePdfBlob }, { pdfLabels, quoteBreakdownLabels }] = await Promise.all([
        import("@/lib/documents/download"),
        import("@/lib/documents/labels"),
      ]);
      // Every priced position in the same order as on screen. The discount is
      // shown once, named, in the totals block (Zwischentotal → Rabatt → netto),
      // so the positions table sums exactly to the Zwischentotal.
      const line = (description: string, amount: number) => ({
        description,
        quantity: 1,
        unit_price: amount,
        net: amount,
      });
      const lineItems = [
        ...groupLines(calc.lines).map((l) => {
          const detail = l.id === "move" ? moveDetail() : null;
          return line(detail ? `${lineLabel(l.id, l.amount)}\n${detail}\n${t("quote.moveBreakdownNote")}` : lineLabel(l.id, l.amount), l.amount);
        }),
        ...(calc.peakSurcharge > 0
          ? [line(`${t("quote.peak")} ${Math.round(calc.peakRate * 100)} %`, calc.peakSurcharge)]
          : []),
      ];

      // Who the offer is for, and what it covers — an offer without the
      // customer, the addresses and the date is not a document anyone can use.
      const addr = (street: string, zip: string, city: string, canton = "") =>
        [street, [zip, city].filter(Boolean).join(" "), canton].filter(Boolean).join(", ");
      // The customer's own (invoice) address — never the departure address,
      // which is a place the work happens and may be a different address.
      const customerAddress = state
        ? [addr(state.customerStreet || state.fromAddress, state.customerZip || state.fromZip, state.customerCity || state.fromCity), state.customerCountry]
            .map((v) => v.trim())
            .filter(Boolean)
            .join(", ")
        : "";
      const recipient = [state?.name, state?.company, customerAddress, email, state?.phone]
        .map((v) => (v ?? "").trim())
        .filter(Boolean);


      // An order is the accepted, binding document — never call it an estimate.
      const notes = showEstimateNote ? [t("quote.disclaimer")] : [];

      const hours = (value: number) => `${formatNumber(value, lang, { maximumFractionDigits: 1 })} h`;
      // Moving metrics — volume, boxes, vehicles, carrying time, distance —
      // only describe a move. A cleaning-only or disposal-only offer must not
      // print figures that were never asked for.
      const movingFacts = state?.services.move
        ? [
            { label: t("panel.volume"), value: `${formatNumber(calc.m3, lang, { maximumFractionDigits: 1 })} m³` },
            { label: t("panel.boxes"), value: formatNumber(calc.boxes, lang, { maximumFractionDigits: 0 }) },
            { label: t("panel.van"), value: t("panel.vans", { count: calc.vans }) },
            { label: t("panel.moveTeam"), value: t("panel.people", { count: calc.crew }) },
            {
              label: t("step1.km"),
              value: calc.distanceManualRequired
                ? tDoc("quotes.distance.aboveMaximum")
                : `${formatNumber(calc.km, lang, { maximumFractionDigits: 0 })} km`,
            },
          ]
        : [];
      // Einsatzdauer and Reinigungsdauer are not printed (owner decision);
      // the engine still uses both durations internally.
      const cleaningFacts: { label: string; value: string }[] = [];
      const disposalFacts = calc.disposal
        ? [
            {
              label: t("panel.disposalVolume"),
              value: `${formatNumber(calc.disposal.m3, lang, { maximumFractionDigits: 1 })} m³`,
            },
            { label: t("panel.disposalHours"), value: hours(calc.disposal.billedHours) },
          ]
        : [];
      const facts = [...movingFacts, ...cleaningFacts, ...disposalFacts];

      const names = new Map((catalogue.data ?? []).map((i) => [i.key, inventoryName(i, lang)]));
      const counted = Object.entries(state?.items ?? {}).filter(([, qty]) => qty > 0);
      const clean = state ? effectiveCleaning(state.services.move
        ? { ...state.cleaning, propertyType: state.propertyType, roomUnits: state.roomUnits }
        : state.cleaning) : null;
      const yesNo = (on: boolean) => t(on ? "cleaning.yes" : "cleaning.no");
      const sections = state
        ? [
            // The cleaning checklist travels with the offer so the crew and the
            // customer read the same scope.
            ...(state.services.clean && clean
              ? [
                  {
                    title: t("summary.cleaning"),
                    rows: [
                      // Without a move there is no address summary, so the
                      // cleaning block itself must carry the property address
                      // and the access details the crew needs.
                      ...(!state.services.move
                        ? [
                            {
                              label: t("summary.objectAddress"),
                              value: addr(state.fromAddress, state.fromZip, state.fromCity, state.fromCanton) || "—",
                            },
                            { label: t("summary.floors"), value: String(state.floorOut) },
                            { label: t("step2.lift"), value: t(`step2.lift_${state.liftOut}`) },
                            { label: t("step3.parking"), value: t(`step3.p${state.parkingOut}`) },
                            ...(state.narrowStairs ? [{ label: t("step3.stairs"), value: yesNo(true) }] : []),
                            ...(state.carry > 0 ? [{ label: t("step3.carry"), value: String(state.carry) }] : []),
                            ...(state.permit ? [{ label: t("step3.permit"), value: yesNo(true) }] : []),
                            ...(state.hoist ? [{ label: t("step3.hoist"), value: yesNo(true) }] : []),
                          ]
                        : []),
                      { label: t("cleaning.object"), value: t(`step2.${clean.propertyType}`) },
                      {
                        label: t("cleaning.size"),
                        value: clean.roomUnits ? `${clean.roomUnits} ${t("step1.rooms")}` : clean.otherSize || "—",
                      },
                      { label: t("cleaning.windowsNormal"), value: String(clean.windowsNormal) },
                      { label: t("cleaning.windowsLarge"), value: String(clean.windowsLarge) },
                      {
                        label: t("cleaning.coverings"),
                        value: clean.coverings.length
                          ? clean.coverings.map((c) => t(`cleaning.covering.${c}`)).join(", ")
                          : t("summary.none"),
                      },
                      { label: t("cleaning.wetRooms"), value: String(clean.wetRooms) },
                      { label: t("cleaning.balcony"), value: yesNo(clean.balcony) },
                      ...(clean.balcony
                        ? [{ label: t("cleaning.pressure"), value: yesNo(clean.balconyPressure) }]
                        : []),
                      { label: t("cleaning.cellar"), value: yesNo(clean.cellar) },
                      { label: t("cleaning.garage"), value: yesNo(clean.garage) },
                      { label: t("cleaning.carpet"), value: yesNo(clean.carpet) },
                      ...(clean.carpet
                        ? [{ label: t("cleaning.shampoo"), value: yesNo(clean.carpetShampoo) }]
                        : []),
                      ...(clean.dowelHoles > 0
                        ? [
                            {
                              label: t("cleaning.dowelHoles"),
                              value: (() => {
                                const l = calc.lines.find((x) => x.id === "clean_dowel_holes");
                                return l
                                  ? `${clean.dowelHoles} × ${formatCurrency(l.amount / clean.dowelHoles, lang, 2)} = ${formatCurrency(l.amount, lang, 2)}`
                                  : String(clean.dowelHoles);
                              })(),
                            },
                          ]
                        : []),
                      // Work the price list carries no rate for is named as
                      // such — never shown as free or already included.
                      ...(cleaningReviewItems(clean).length
                        ? [
                            {
                              label: t("cleaning.reviewTitle"),
                              value: `${cleaningReviewItems(clean)
                                .map((k) => t(`cleaning.review.${k}`))
                                .join(", ")} — ${t("cleaning.reviewNote")}`,
                            },
                          ]
                        : []),
                    ],
                  },
                ]
              : []),
            // Disposal is volume plus team labour, both shown separately and
            // labelled as estimated quantities, never as a fixed package.
            ...(state.services.disp && calc.disposal
              ? [
                  {
                    title: t("summary.disposal"),
                    rows: [
                      {
                        label: t("disposal.volumeLabel"),
                        value: `${formatNumber(calc.disposal.m3, lang, { maximumFractionDigits: 1 })} m³ × ${formatCurrency(calc.disposal.ratePerM3, lang, 2)} = ${formatCurrency(calc.disposal.volumeAmount, lang, 2)}`,
                      },
                      {
                        label: t("disposal.hoursLabel"),
                        value: calc.disposal.teamRate
                          ? `${formatNumber(calc.disposal.billedHours, lang, { maximumFractionDigits: 2 })} h × ${formatCurrency(calc.disposal.teamRate, lang, 2)} = ${formatCurrency(calc.disposal.labourAmount, lang, 2)}`
                          : tDoc("documents.pendingValue"),
                      },
                      { label: t("disposal.estimateLabel"), value: t("disposal.estimateNote") },
                      ...(state.disposal.notes.trim() ? [{ label: t("step6.notes"), value: state.disposal.notes.trim() }] : []),
                    ],
                  },
                ]
              : []),
            // "Weitere Informationen" exactly as the customer wrote it; the PDF
            // renderer prints it as plain text, never as markup.
            ...(state.notes.trim()
              ? [
                  {
                    title: t("step6.notes"),
                    // eslint-disable-next-line no-control-regex -- strips control characters from free text before the PDF
                    rows: [{ label: "", value: state.notes.trim().replace(/[\u0000-\u0008\u000B-\u001F]/g, "") }],
                  },
                ]
              : []),
          ]
        : [];

      const selectedServices = state
        ? MAIN_AND_EXTRA_SERVICE_KEYS.filter((key) => state.services[key]).map((key) => t(`step4.${key}`))
        : [];
      const selectedExtras = state?.extras.map((key) => extraLabel(key)) ?? [];
      const termsBlocks =
        terms.data?.status === "published"
          ? legalBlocks(terms.data.body, company as unknown as Record<string, unknown> | null)
          : [];

      let qr: { dataUrl: string; caption: string; title: string } | undefined;
      try {
        const { plainQrDataUrl } = await import("@/lib/documents/qr-bill");
        const link = `${window.location.origin}/${lang}/offerte/${reference}`;
        qr = {
          dataUrl: await plainQrDataUrl(link),
          title: t("quote.title"),
          caption: `${link}\n${t("quote.ref")} ${reference} · ${t("quote.total")}: ${formatCurrency(calc.total, lang, 2)}`,
        };
      } catch {
        qr = undefined;
      }

      return renderQuotePdfBlob(
        {
          reference,
          created_at: new Date().toISOString(),
          line_items: lineItems,
          vat: calc.vat,
          total: calc.total,
          currency: "CHF",
          terms: notes.join("\n"),
        },
        recipient,
        pdfLabels(tDoc),
        quoteBreakdownLabels(tDoc),
        // Company details come from the public company block: the documents
        // table itself is staff-only, which is why the header printed blank.
        company
          ? {
              legal_name: company.legal_name,
              address_line: company.address_line,
              postal_code: company.postal_code,
              city: company.city,
              canton: company.canton,
              country: company.country,
              register_number: company.register_number,
              vat_number: company.vat_number,
              email: company.email,
              phone: company.phone,
            }
          : null,
        {
          facts,
          sections,
          schedules: [],
          // Presentation layer of the agreed offer format: contact strip,
          // customer box, appointment table, address boxes and the commercial
          // summary. All values come from the planner state and the
          // calculation — nothing is invented here.
          ...(company
            ? {
                contactStrip: [
                  [company.address_line, [company.postal_code, company.city].filter(Boolean).join(" ")]
                    .filter(Boolean)
                    .join(", "),
                  company.phone,
                  company.email,
                ]
                  .filter(Boolean)
                  .join("   ·   "),
                acceptanceContact: [company.legal_name, company.phone, company.email]
                  .filter(Boolean)
                  .join("   ·   "),
              }
            : {}),
          ...(state
            ? {
                parties: [
                  {
                    // The customer block: their own name, company and invoice
                    // address, kept apart from the work addresses below.
                    title: t("step6.addressTitle"),
                    icon: "customer" as const,
                    rows: [
                      { label: "", value: [state.name, state.company].filter(Boolean).join(" · ") || "—" },
                      ...((state.customerStreet || state.fromAddress).trim()
                        ? [{ label: "", value: (state.customerStreet || state.fromAddress).trim() }]
                        : []),
                      ...([state.customerZip || state.fromZip, state.customerCity || state.fromCity].filter((v) => v.trim()).length > 0
                        ? [
                            {
                              label: "",
                              value: [state.customerZip || state.fromZip, state.customerCity || state.fromCity]
                                .map((v) => v.trim())
                                .filter(Boolean)
                                .join(" "),
                            },
                          ]
                        : []),
                      ...(state.customerCountry.trim()
                        ? [{ label: "", value: state.customerCountry.trim() }]
                        : []),
                      { label: "", value: [email, state.phone].filter(Boolean).join(" · ") || "—" },
                    ],
                  },

                  {
                    title: t("quote.scope"),
                    icon: "info" as const,
                    rows: [
                      { label: `${t("quote.ref")}`, value: reference },
                      { label: `${t("quote.date")}`, value: formatDayMonthYear(new Date()) },
                      ...(state.services.move ? [{ label: `${t("panel.crew")}`, value: calc.crew ? t("panel.people", { count: calc.crew }) : t("quote.notCalculated") }] : []),
                    ],
                  },
                ],
                appointmentsTitle: t("summary.date"),
                appointments: [
                  // Moving and cleaning are two appointments on two dates, and
                  // both start at the fixed 08:00 Europe/Zurich.
                  ...(state.services.move
                    ? [
                        {
                          label: t("step5.moveDate"),
                          date: state.date || "—",
                          time: state.startTime || FIXED_START_TIME,
                          icon: "truck" as const,
                        },
                      ]
                    : []),
                  ...(state.services.clean
                    ? [
                        {
                          label: t("step5.cleanDate"),
                          date: (state.services.move ? state.cleanDate : (state.cleanDate ?? state.date)) || "—",
                          time: clockLabel(CLEANING_START_HOUR),
                          icon: "clean" as const,
                        },
                        {
                          label: t("timeline.handoverLabel"),
                          date: (state.services.move ? state.cleanDate : (state.cleanDate ?? state.date)) || "—",
                          time: `${t("timeline.approx")} ${clockLabel(CLEANING_HANDOVER_HOUR)}`,
                          icon: "calendar" as const,
                        },
                      ]
                    : []),
                  ...(state.services.disp && !state.services.move
                    ? [
                        {
                          label: t("step4.disp"),
                          date: state.date || "—",
                          time: state.startTime || FIXED_START_TIME,
                          icon: "truck" as const,
                        },
                      ]
                    : []),
                ],

                locationsTitle: t("summary.title"),
                // Cleaning-only: no separate address summary — the cleaning
                // block above carries the property address and access details.
                locations: state.services.clean && !state.services.move && !state.services.disp ? [] : [
                  {
                    // Without a move this is the property the work happens at,
                    // never a departure address.
                    title: state.services.move ? t("summary.from") : t("summary.objectAddress"),
                    address: addr(state.fromAddress, state.fromZip, state.fromCity, state.fromCanton) || "—",
                    // Each address carries its own lift and parking answer.
                    details: [
                      `${t("summary.floors")}: ${state.floorOut}`,
                      `${state.services.move ? t("step2.liftOut") : t("step2.lift")}: ${t(`step2.lift_${state.liftOut}`)}`,
                      `${state.services.move ? t("step3.parkingOut") : t("step3.parking")}: ${t(`step3.p${state.parkingOut}`)}`,
                      ...(state.narrowStairs ? [t("step3.stairs")] : []),
                      ...(state.carry > 0 ? [`${t("step3.carry")}: ${state.carry}`] : []),
                      ...(state.permit ? [t("step3.permit")] : []),
                      ...(state.hoist ? [t("step3.hoist")] : []),
                    ],
                    icon: "pin" as const,
                  },
                  ...(state.services.move
                    ? [
                        {
                          title: t("summary.to"),
                          address: addr(state.toAddress, state.toZip, state.toCity, state.toCanton) || "—",
                          details: [
                            `${t("summary.floors")}: ${state.floorIn}`,
                            `${t("step2.liftIn")}: ${t(`step2.lift_${state.liftIn}`)}`,
                            `${t("step3.parkingIn")}: ${t(`step3.p${state.parkingIn}`)}`,
                            ...(state.permitIn ? [t("step3.permit")] : []),
                            ...(state.narrowStairsIn ? [t("step3.stairs")] : []),
                            ...(state.carryIn > 0 ? [`${t("step3.carry")}: ${state.carryIn}`] : []),
                            ...(state.hoistIn ? [t("step3.hoist")] : []),
                            `${t("step1.km")}: ${formatNumber(calc.km, lang, { maximumFractionDigits: 0 })}`,
                          ],
                          icon: "route" as const,
                        },
                      ]
                    : []),
                ],
              }
            : {}),
          priceTitle: tDoc("documents.priceTitle"),
          summaryTitle: tDoc("documents.summaryTitle"),
          summary: [
            { label: t("quote.subtotal"), value: formatCurrency(calc.subtotal, lang, 2) },
            ...(calc.discount > 0
              ? [
                  {
                    label: discountLabel,
                    value: `- ${formatCurrency(calc.discount, lang, 2)}`,
                    negative: true,
                  },
                ]
              : []),
            ...(calc.peakSurcharge > 0
              ? [
                  {
                    label: `${t("quote.peak")} ${Math.round(calc.peakRate * 100)} %`,
                    value: formatCurrency(calc.peakSurcharge, lang, 2),
                  },
                ]
              : []),
            { label: t("quote.net"), value: formatCurrency(shownNet, lang, 2) },
            { label: t("quote.vat"), value: formatCurrency(shownVat, lang, 2) },
            ...(adjustment && adjustment.amount !== 0
              ? [
                  { label: "Berechnetes Total", value: formatCurrency(calc.total - adjustment.amount, lang, 2) },
                  {
                    label: adjustment.customerNote ? `Manuelle Preisanpassung — ${adjustment.customerNote}` : "Manuelle Preisanpassung",
                    value: `${adjustment.amount < 0 ? "- " : "+ "}${formatCurrency(Math.abs(adjustment.amount), lang, 2)}`,
                    negative: adjustment.amount < 0,
                  },
                ]
              : []),
            { label: t("quote.total"), value: formatCurrency(calc.total, lang, 2), emphasis: true },
          ],
          // The minimum-hours paragraph is not repeated under the totals: it
          // is part of the terms and conditions printed with the offer.
          summaryNotes: [tDoc("documents.summaryOptionsNote"), tDoc("documents.roundingNote")],
          // Version 1 of the preview: acceptance binds exactly this version,
          // and the four-hour minimum is stated in the customer's words.
          version,
          // Never print a technical status word: unreleased offers say
          // "Vorschau", released ones carry only their version.
          status: documentKind === "order" ? t("documents.orderTitle", { ns: "admin" }) : !status || status === "new" || status === "draft" ? t("quote.statusPreview") : "",
          // Proof of the hourly basis in the agreed format: crew, effective
          // duration. No tariff row: there is no approved customer-facing hourly
          // tariff table; price list 1031 positions are the commercial basis.
          // No separate minimum-hours box either — the rule is stated once, in
          // the terms and conditions section of the same document.
          scopeTitle: tDoc("documents.scopeTitle"),
          scopeBlocks: [
            {
              title: tDoc("documents.includedServices"),
              icon: "scope" as const,
              body: [selectedServices.length ? selectedServices.join(", ") : tDoc("documents.pendingValue"),
                `${t("step2.type")}: ${t(`step2.${state?.services.move || !state?.services.clean ? state?.propertyType : state.cleaning.propertyType}`)}`,
                `${t("summary.size")}: ${state?.roomUnits ?? state?.cleaning.roomUnits ?? "—"}`],
            },
            {
              title: tDoc("documents.inventoryBasis"),
              icon: "box" as const,
              body: [
                counted.length
                  ? counted.map(([id, qty]) => `${qty}× ${names.get(id) ?? id}`).join(", ")
                  : tDoc("documents.noInventoryRecorded"),
                tDoc("documents.uploadBasis", { count: state?.uploads.length ?? 0 }),
              ],
            },
          ],
          // Selected extras are already priced in the positions table above —
          // never show them as "pending" next to a price the customer can see.
          options: selectedExtras.map((description) => ({
            description,
            priceLabel: tDoc("documents.optionIncluded"),
            selected: true,
          })),
          acceptance: documentKind === "quote",
          acceptanceStatement: tDoc("documents.acceptanceStatement"),
          termsTitle: tDoc("documents.termsTitle"),
          termsSubtitle:
            terms.data?.status === "published"
              ? tDoc("documents.termsSubtitle", { version: terms.data.version })
              : tDoc("documents.termsPending"),
          terms: termsBlocks.length
            ? termsBlocks
            : [
                {
                  title: tDoc("documents.termsPendingTitle"),
                  body: [tDoc("documents.termsPending")],
                  icon: "terms" as const,
                },
              ],
          mandatoryQuoteFormat: true,
          ...(qr ? { qr } : {}),
        },
        documentKind,
      );
    }
  }

  /** Staff and already-submitted customers may take the file itself. */
  async function downloadPdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const rendered = await buildPdf();
      if (!rendered) return;
      const { downloadPdf: save } = await import("@/lib/documents/pdf");
      save(rendered.blob, rendered.filename);
      onDownloaded?.();
    } catch {
      const message = "PDF konnte nicht heruntergeladen werden. Bitte erneut versuchen.";
      setError(message);
      onDownloaded?.(message);
    } finally {
      setPdfBusy(false);
    }
  }

  const [orderMsg, setOrderMsg] = useState<string | null>(null);
  async function orderPdf(): Promise<{ blob: Blob; filename: string } | null> {
    const rendered = await buildPdf();
    // Hard guard: the order actions only ever handle the Auftrag document.
    if (!rendered || documentKind !== "order" || !rendered.filename.endsWith("-Auftrag.pdf")) {
      setOrderMsg("Auftrags-PDF konnte nicht erzeugt werden.");
      return null;
    }
    return rendered;
  }
  async function previewOrder() {
    setPdfBusy(true);
    try {
      const r = await orderPdf();
      if (r) window.open(URL.createObjectURL(r.blob), "_blank", "noopener");
    } finally { setPdfBusy(false); }
  }
  async function sendOrder() {
    if (!orderJobId || !window.confirm("Auftrag (PDF) jetzt an den Kunden senden?")) return;
    setPdfBusy(true); setOrderMsg(null);
    try {
      const r = await orderPdf();
      if (!r) return;
      const { sendOrderDocument } = await import("@/lib/order-document.functions");
      const res = await sendOrderDocument({ data: { jobId: orderJobId, pdfBase64: await blobToBase64(r.blob) } });
      setOrderMsg(res.status === "sent" ? `Auftrag an ${res.recipient} gesendet.`
        : res.status === "queued" ? `Auftrag vorbereitet, aber nicht zugestellt (${res.reason}) — im Verlauf als ausstehend vermerkt.`
        : `Nicht gesendet: ${res.reason}`);
    } catch (e) {
      setOrderMsg(`Senden fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setPdfBusy(false); }
  }

  async function blobToBase64(blob: Blob): Promise<string> {
    const buffer = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buffer.length; i += 1) binary += String.fromCharCode(buffer[i] as number);
    return btoa(binary);
  }

  /**
   * One request, in order: save, notify PS Umzug, then the customer copy.
   * Repeated clicks cannot create a second request — the server is the judge.
   */
  async function submitForReview() {
    if (sending || !proof) return;
    setSending(true);
    setError("");
    try {
      let pdfBase64 = "";
      try {
        const rendered = await buildPdf();
        if (rendered) pdfBase64 = await blobToBase64(rendered.blob);
      } catch {
        pdfBase64 = "";
      }
      const outcome = await submitQuoteReview({
        data: { reference, contact: proof, ...(pdfBase64 ? { pdfBase64 } : {}) },
      });
      if (!outcome.ok) {
        setError(t("quote.submitFailed"));
        return;
      }
      setResult(outcome);
      void reviewed.refetch();
    } catch {
      setError(t("quote.submitFailed"));
    } finally {
      setSending(false);
    }
  }


  const scope = calc.lines.length === 0 && !calc.crew ? t("quote.notCalculated") : t("quote.scopeText", {
    volume: formatNumber(calc.m3, lang, { maximumFractionDigits: 1 }),
    crew: calc.crew,
    vans: calc.vans,
    km: calc.km,
  });

  return (
    <section aria-labelledby="offerte" className="rounded-md rounded-2xl bg-surface elev-raised">
      <div aria-hidden="true" className="brand-rule h-px w-full" />
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-5">
        <div>
          <h2 id="offerte" className="type-h2 text-ink">
            {t("quote.title")}
          </h2>
          <p className="label-mono mt-2 text-soft">
            {t("quote.ref")} <span className="data-mono text-ink">{reference}</span>
          </p>
          <p className="label-mono text-soft">
            {t("quote.date")} <span className="data-mono text-ink">{formatDayMonthYear(new Date())}</span>
          </p>
        </div>
        <p className="label-mono max-w-xs text-primary">
          {t("quote.scope")}: <span className="text-ink-2">{scope}</span>
        </p>
      </div>

      <table className="w-full text-start [overflow-wrap:anywhere]">
        <caption className="sr-only">{t("quote.title")}</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="label-mono px-3 py-3 md:px-5 text-start text-soft">
              {t("quote.position")}
            </th>
            <th scope="col" className="label-mono px-3 py-3 md:px-5 text-end text-soft">
              {t("quote.amount")}
            </th>
          </tr>
        </thead>
        <tbody>
          {groupLines(calc.lines).map((line) => (
            <tr key={line.id} className="border-b border-line">
              <td className="px-3 py-3 md:px-5 text-ink">
                {lineLabel(line.id, line.amount)}
                {line.id === "move" && moveDetail() ? (
                  <span data-move-breakdown className="mt-1 block text-xs text-soft">
                    {moveDetail()}
                    <span className="block">{t("quote.moveBreakdownNote")}</span>
                  </span>
                ) : null}
              </td>
              <td className="data-mono px-3 py-3 md:px-5 text-end text-ink">
                {formatCurrency(line.amount, lang, 2)}
              </td>
            </tr>
          ))}
          <tr className="border-b border-line">
            <td className="px-3 py-3 md:px-5 text-soft">{t("quote.subtotal")}</td>
            <td className="data-mono px-3 py-3 md:px-5 text-end text-soft">{formatCurrency(calc.subtotal, lang, 2)}</td>
          </tr>
          {calc.discount > 0 ? (
            <tr className="border-b border-line bg-primary-subtle">
              <td className="px-3 py-3 md:px-5 text-ink">
                {discountLabel}
              </td>
              <td className="data-mono px-3 py-3 md:px-5 text-end text-ink">
                −{formatCurrency(calc.discount, lang, 2)}
              </td>
            </tr>
          ) : null}
          {calc.peakSurcharge > 0 ? (
            <tr className="border-b border-line">
              <td className="px-3 py-3 md:px-5 text-ink">
                {t("quote.peak")} <span className="data-mono">{Math.round(calc.peakRate * 100)} %</span>
              </td>
              <td className="data-mono px-3 py-3 md:px-5 text-end text-ink">
                +{formatCurrency(calc.peakSurcharge, lang, 2)}
              </td>
            </tr>
          ) : null}
          <tr className="border-b border-line">
            <td className="px-3 py-3 md:px-5 text-ink">{t("quote.net")}</td>
            <td className="data-mono px-3 py-3 md:px-5 text-end text-ink">{formatCurrency(shownNet, lang, 2)}</td>
          </tr>
          <tr className="border-b border-line">
            <td className="px-3 py-3 md:px-5 text-soft">{t("quote.vat")}</td>
            <td className="data-mono px-3 py-3 md:px-5 text-end text-soft">{formatCurrency(shownVat, lang, 2)}</td>
          </tr>
          {adjustment && adjustment.amount !== 0 ? (
            <>
              <tr className="border-b border-line">
                <td className="px-3 py-3 md:px-5 text-soft">Berechnetes Total</td>
                <td className="data-mono px-3 py-3 md:px-5 text-end text-soft">{formatCurrency(calc.total - adjustment.amount, lang, 2)}</td>
              </tr>
              <tr className="border-b border-line bg-primary-subtle">
                <td className="px-3 py-3 md:px-5 text-ink">
                  Manuelle Preisanpassung
                  {adjustment.customerNote ? (
                    <span className="block text-xs text-soft">{adjustment.customerNote}</span>
                  ) : null}
                </td>
                <td className="data-mono px-3 py-3 md:px-5 text-end text-ink">
                  {adjustment.amount < 0 ? "−" : "+"}{formatCurrency(Math.abs(adjustment.amount), lang, 2)}
                </td>
              </tr>
            </>
          ) : null}
          <tr className="bg-ink text-canvas">
            <td className="px-5 py-4 font-display uppercase">{t("quote.total")}</td>
            <td className="data-mono px-5 py-4 text-end text-xl tabular-nums">{formatCurrency(calc.total, lang, 2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="space-y-3 px-5 py-5 print:hidden">
        {submittable ? (
          <>
            <p className="type-small text-soft">{t("quote.submitBody")}</p>
            {submitted ? (
              <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-4">
                <p className="flex items-center gap-2 text-ink">
                  <CheckCircle2 aria-hidden="true" className="size-4 text-primary" />
                  {t("quote.submitted", { reference })}
                </p>
                <p className="type-small text-soft">
                  {t(
                    state0?.internal === "sent"
                      ? "quote.statusInternalSent"
                      : "quote.statusInternalPending",
                  )}
                </p>
                <p className="type-small text-soft">
                  {t(
                    state0?.customer === "sent"
                      ? "quote.statusCustomerSent"
                      : "quote.statusCustomerPending",
                  )}
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={sending || !proof}
                onClick={() => void submitForReview()}
                className={buttonVariants({ variant: "primary", size: "lg" })}
              >
                {sending ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Send aria-hidden="true" className="size-4" />
                )}
                {t("quote.submitAction")}
              </button>
            )}
            {!proof ? <p className="type-small text-soft">{t("quote.submitNeedsContact")}</p> : null}
            {error ? <p className="type-small text-danger">{error}</p> : null}
            {submitted ? (
              <button
                type="button"
                disabled={pdfBusy}
                onClick={() => void downloadPdf()}
                className={buttonVariants({ variant: "outline" })}
              >
                <Printer aria-hidden="true" className="size-4" />
                {t("quote.pdf")}
              </button>
            ) : null}
          </>
        ) : documentKind === "order" && orderJobId ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={pdfBusy} onClick={() => void previewOrder()} className={buttonVariants({ variant: "outline" })}>Auftrag-PDF ansehen</button>
            <button type="button" disabled={pdfBusy} onClick={() => void downloadPdf()} className={buttonVariants({ variant: "outline" })}>
              <Printer aria-hidden="true" className="size-4" />Auftrag PDF herunterladen
            </button>
            <button type="button" disabled={pdfBusy} onClick={() => void sendOrder()} className={buttonVariants({})}>
              <Send aria-hidden="true" className="size-4" />Auftrag an Kunden senden
            </button>
            {orderMsg ? <p role="status" className="type-small w-full text-ink-2">{orderMsg}</p> : null}
          </div>
        ) : status && status !== "new" && status !== "draft" ? (
          // Released offer: no "send for review" wording, only the PDF.
          <button
            type="button"
            disabled={pdfBusy}
            onClick={() => void downloadPdf()}
            className={buttonVariants({ variant: "outline" })}
          >
            <Printer aria-hidden="true" className="size-4" />
            {documentKind === "order" ? "Auftrag PDF herunterladen" : t("quote.pdf")}
          </button>
        ) : (
          <p className="type-small text-soft">{t("quote.submitLater")}</p>
        )}
      </div>

      {/* The four-hour minimum is stated in the AGB only — not repeated here. */}
      {showEstimateNote ? <p className="type-small border-t border-line px-5 pb-4 pt-4 text-soft">{t("quote.disclaimer")}</p> : null}
    </section>
  );
}

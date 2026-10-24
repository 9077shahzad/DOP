import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { I18nextProvider, useTranslation } from "react-i18next";

import { JobJourney } from "@/components/depth/JobJourney";
import { QuotePreview } from "@/components/planner/QuotePreview";
import { buttonVariants } from "@/components/system";
import { cn } from "@/lib/utils";
import { Timeline } from "@/components/planner/Timeline";
import i18n, { isLang, type Lang } from "@/i18n/config";
import { formatCurrency, formatNumber, formatDayMonthYear } from "@/i18n/format";
import { buildPlans } from "@/lib/pricing";
import { fetchPlannerPricing } from "@/lib/planner-pricing";
import { PricingTracePanel } from "@/components/planner/PricingTracePanel";
import { fetchQuote } from "@/lib/quotes.functions";
import { acceptQuote, fetchQuoteSnapshot } from "@/lib/quote-acceptance.functions";
import { attachQuoteFiles } from "@/lib/quote-uploads.functions";
import {
  QUOTE_ACCEPT_ATTR,
  QUOTE_UPLOAD_KINDS,
  UploadRejected,
  newDraftId,
  uploadQuoteFile,
  type QuoteUploadKind,
} from "@/lib/quote-uploads";
import { langOf, privateHead } from "@/lib/seo";
import { fetchQuoteCustomer, rowToCalculation, rowToState, type PublicQuote } from "@/lib/quotes";

export const Route = createFileRoute("/$lang/offerte/$ref")({
  head: ({ params }) => privateHead(langOf(params.lang), "offer"),
  errorComponent: () => <NotFound lang="de" />,
  notFoundComponent: () => <NotFound lang="de" />,
  component: OffertePage,
});

function NotFound({ lang }: { lang: Lang }) {
  const { t } = useTranslation("planer");
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 md:px-8">
      <p className="label-mono text-primary">PS Umzug</p>
      <h1 className="type-h1 mt-4 text-ink">{t("notFound.title")}</h1>
      <p className="type-body mt-6 text-ink-2">{t("notFound.body")}</p>
      <Link
        to="/$lang/planer"
        params={{ lang }}
        className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-8")}
      >
        {t("notFound.cta")}
      </Link>
    </div>
  );
}

function OffertePage() {
  const { lang, ref } = Route.useParams();
  const visitorLang = (isLang(lang) ? lang : "de") as Lang;
  const [contact, setContact] = useState("");

  const lookup = useMutation({
    mutationFn: (value: string) => fetchQuote({ data: { reference: ref, contact: value } }),
  });

  const quote = lookup.data ?? null;
  if (quote) return <StoredQuote quote={quote} contact={contact} />;

  return (
    <ContactGate
      lang={visitorLang}
      reference={ref}
      value={contact}
      onChange={setContact}
      pending={lookup.isPending}
      failed={lookup.isSuccess && !lookup.data}
      onSubmit={() => lookup.mutate(contact)}
    />
  );
}

function ContactGate({
  lang,
  reference,
  value,
  onChange,
  pending,
  failed,
  onSubmit,
}: {
  lang: Lang;
  reference: string;
  value: string;
  onChange: (v: string) => void;
  pending: boolean;
  failed: boolean;
  onSubmit: () => void;
}) {
  const scoped = useMemo(() => i18n.cloneInstance({ lng: lang }), [lang]);
  return (
    <I18nextProvider i18n={scoped} defaultNS="common">
      <GateForm
        reference={reference}
        value={value}
        onChange={onChange}
        pending={pending}
        failed={failed}
        onSubmit={onSubmit}
      />
    </I18nextProvider>
  );
}

function GateForm({
  reference,
  value,
  onChange,
  pending,
  failed,
  onSubmit,
}: {
  reference: string;
  value: string;
  onChange: (v: string) => void;
  pending: boolean;
  failed: boolean;
  onSubmit: () => void;
}) {
  const { t } = useTranslation("planer");
  return (
    <div className="mx-auto max-w-xl px-4 py-16 md:px-8 md:py-24">
      <p className="label-mono text-primary">{t("stored.badge")}</p>
      <h1 className="type-h1 mt-4 text-ink">{t("verify.title")}</h1>
      <p className="type-body mt-4 text-ink-2">{t("verify.body")}</p>
      <p className="data-mono mt-4 text-ink">{reference}</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim()) onSubmit();
        }}
      >
        <label className="block">
          <span className="label-mono text-soft">{t("verify.label")}</span>
          <input
            className="mt-2 w-full rounded-md border border-line bg-surface px-4 py-3 text-ink"
            value={value}
            autoComplete="email"
            onChange={(event) => onChange(event.target.value)}
            placeholder={t("verify.placeholder")}
            required
          />
        </label>
        {failed ? (
          <p role="alert" className="type-caption text-danger">
            {t("verify.failed")}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
        >
          {pending ? t("verify.pending") : t("verify.cta")}
        </button>
      </form>
    </div>
  );
}


function StoredQuote({ quote, contact }: { quote: PublicQuote; contact: string }) {
  const quoteLang = (isLang(quote.language) ? quote.language : "de") as Lang;
  // Render in the language the customer used, not the visitor's browser language.
  const scoped = useMemo(() => i18n.cloneInstance({ lng: quoteLang }), [quoteLang]);

  const pricingQuery = useQuery({
    queryKey: ["planner-pricing", "CH"],
    queryFn: () => fetchPlannerPricing("CH"),
    staleTime: 5 * 60 * 1000,
  });
  const pricing = pricingQuery.data ?? null;

  // Name and invoice address never travel in the public projection; they are
  // fetched back only against the contact the customer just proved.
  const customerQuery = useQuery({
    queryKey: ["quote-customer", quote.reference, contact],
    enabled: Boolean(contact),
    queryFn: () => fetchQuoteCustomer(quote.reference, contact),
    staleTime: 5 * 60 * 1000,
  });
  const customer = customerQuery.data ?? null;

  const state = useMemo(() => {
    const base = rowToState(quote);
    if (!customer) return base;
    return {
      ...base,
      name: customer.name,
      company: customer.company,
      phone: customer.phone,
      email: customer.email,
      customerStreet: customer.street,
      customerZip: customer.zip,
      customerCity: customer.city,
      customerCountry: customer.country,
      fromAddress: customer.fromAddress,
      toAddress: customer.toAddress,
      notes: customer.notes,
    };
  }, [quote, customer]);
  const calc = useMemo(() => rowToCalculation(quote, state, pricing), [quote, state, pricing]);
  // Same query as the acceptance panel: the stored version the PDF must name.
  const snapshot = useQuery({
    queryKey: ["quote-snapshot", quote.reference],
    queryFn: () => fetchQuoteSnapshot({ data: { reference: quote.reference, contact } }),
  });
  const snapshotVersion = (snapshot.data as { version?: number } | null | undefined)?.version;
  // A stored quote without a recorded size has no schedule to draw.
  const plans = useMemo(
    () => (state.roomUnits == null ? [] : buildPlans({ ...state, roomUnits: state.roomUnits }, calc)),
    [state, calc],
  );

  return (
    <I18nextProvider i18n={scoped} defaultNS="common">
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-8 md:py-14">
        <StoredHeader quote={quote} lang={quoteLang} score={calc.score.score} />
        <div className="mt-8 space-y-8">
          {/* Real stored status — nothing is drawn as reached that is not. */}
          <JobJourney status={quote.status} />
          <QuotePreview
            calc={calc}
            lang={quoteLang}
            reference={quote.reference}
            email={customer?.email ?? ""}
            state={state}
            plans={plans}
            status={quote.status}
            // "Send for review" only applies before staff have released an offer.
            submittable={quote.status === "new"}
            contact={contact}
            version={snapshotVersion ?? 1}
            {...(Number(quote.manual_adjustment ?? 0) !== 0
              ? { adjustment: { amount: Number(quote.manual_adjustment), customerNote: quote.manual_adjustment_customer_note ?? null } }
              : {})}
          />
          <AcceptancePanel reference={quote.reference} contact={contact} lang={quoteLang} />
          <UploadPanel reference={quote.reference} contact={contact} />
          <PricingTracePanel trace={calc.trace} lang={quoteLang} />
          {plans.map((plan) => (
            <Timeline key={plan.id} plan={plan} lang={quoteLang} />
          ))}
        </div>
      </div>
    </I18nextProvider>
  );
}

/**
 * Binding acceptance of one exact stored version.
 *
 * The submitted version and total come from the snapshot the customer is
 * looking at. If the offer changed in between, the database refuses the
 * acceptance instead of binding different figures.
 */
function AcceptancePanel({
  reference,
  contact,
  lang,
}: {
  reference: string;
  contact: string;
  lang: Lang;
}) {
  const { t } = useTranslation("planer");
  const [name, setName] = useState("");

  const snapshot = useQuery({
    queryKey: ["quote-snapshot", reference],
    queryFn: () => fetchQuoteSnapshot({ data: { reference, contact } }),
  });

  const accept = useMutation({
    mutationFn: (input: { version: number; total: number }) =>
      acceptQuote({ data: { reference, contact, version: input.version, total: input.total, name } }),
    onSuccess: () => void snapshot.refetch(),
  });

  const data = snapshot.data ?? null;
  if (!data) return null;

  const acceptedAt = accept.data?.ok ? accept.data.acceptedAt : data.acceptedAt;
  const acceptedVersion = accept.data?.ok ? accept.data.version : data.version;
  const failure = accept.data && !accept.data.ok ? accept.data.reason : null;

  return (
    <section className="rounded-2xl bg-surface p-5 elev-raised">
      <h2 className="type-h3 text-ink">{t("stored.accept.title")}</h2>
      {acceptedAt ? (
        <p className="type-body mt-3 text-ink-2">
          {t("stored.accept.done", {
            date: formatDayMonthYear(acceptedAt),
            version: acceptedVersion,
          })}
        </p>
      ) : (
        <>
          <p className="type-body mt-3 text-ink-2">{t("stored.accept.body")}</p>
          {!data.acceptable ? (
            <p role="status" className="type-body mt-3 rounded-md border border-line bg-canvas p-3 text-ink">
              {t("stored.accept.notReleased")}
            </p>
          ) : null}
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="label-mono text-soft">{t("stored.accept.version")}</dt>
              <dd className="data-mono text-ink">{data.version}</dd>
            </div>
            <div>
              <dt className="label-mono text-soft">{t("stored.accept.total")}</dt>
              <dd className="data-mono text-ink">{formatCurrency(data.total, lang)}</dd>
            </div>
          </dl>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              accept.mutate({ version: data.version, total: data.total });
            }}
          >
            <label className="block">
              <span className="label-mono text-soft">{t("stored.accept.name")}</span>
              <input
                className="mt-2 w-full rounded-md border border-line bg-canvas px-4 py-3 text-ink"
                value={name}
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            {failure ? (
              <p role="alert" className="type-caption text-danger">
                {t(`stored.accept.${failure === "not_found" ? "failed" : failure}`)}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={accept.isPending || !name.trim() || !data.acceptable}
              className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
            >
              {accept.isPending ? t("stored.accept.pending") : t("stored.accept.cta")}
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function StoredHeader({ quote, lang, score }: { quote: PublicQuote; lang: Lang; score: number }) {
  const { t } = useTranslation("planer");
  return (
    <header className="rounded-md rounded-2xl bg-surface elev-raised">
      <div aria-hidden="true" className="brand-rule h-px w-full" />
      <div className="grid gap-px bg-line sm:grid-cols-3">
        <div className="bg-surface px-5 py-4 sm:col-span-3">
          <p className="label-mono text-primary">{t("stored.badge")}</p>
          <h1 className="data-mono mt-2 text-3xl text-ink md:text-4xl">{quote.reference}</h1>
          <p className="type-caption mt-2">{t("stored.note")}</p>
        </div>
        <div className="bg-surface px-5 py-4">
          <p className="label-mono text-soft">{t("quote.date")}</p>
          <p className="data-mono mt-1 text-ink">{formatDayMonthYear(quote.created_at)}</p>
        </div>
        <div className="bg-surface px-5 py-4">
          <p className="label-mono text-soft">{t("panel.score")}</p>
          <p className="data-mono mt-1 text-ink">
            {score}/100 · {t(`score.${quote.score_label ?? "easy"}`)}
          </p>
        </div>
        {(() => {
          // Only the parts that apply: distance belongs to moves, empty values are left out.
          const isMove = Boolean((quote.services as { move?: boolean } | null)?.move);
          const parts = [
            Number(quote.volume_m3) > 0 ? `${formatNumber(Number(quote.volume_m3), lang, { maximumFractionDigits: 1 })} m³` : "",
            quote.crew ? String(quote.crew) : "",
            isMove && quote.distance_km != null ? `${quote.distance_km} km` : "",
          ].filter(Boolean);
          return parts.length ? (
            <div className="bg-surface px-5 py-4">
              <p className="label-mono text-soft">{t("panel.volume")}</p>
              <p className="data-mono mt-1 text-ink">{parts.join(" · ")}</p>
            </div>
          ) : null;
        })()}
      </div>
    </header>
  );
}

/**
 * Optional customer documents.
 *
 * Files are stored privately against this offer. Uploading never changes the
 * offer, its price or its scope — a resulting change goes through the normal
 * review and the versioned quotation history.
 */
function UploadPanel({ reference, contact }: { reference: string; contact: string }) {
  const { t } = useTranslation("planer");
  const [draftId] = useState(() => newDraftId());
  const [kind, setKind] = useState<QuoteUploadKind>("photo");
  const [error, setError] = useState<"tooLarge" | "wrongType" | "failed" | null>(null);
  const [sent, setSent] = useState(0);
  const [busy, setBusy] = useState(false);

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const files = [];
      for (const file of Array.from(list)) files.push(await uploadQuoteFile(draftId, kind, file));
      const linked = await attachQuoteFiles({ data: { reference, contact, draft: draftId, files } });
      if (linked === 0) setError("failed");
      else setSent((n) => n + linked);
    } catch (cause) {
      if (cause instanceof UploadRejected) {
        setError(cause.reason === "too_large" ? "tooLarge" : "wrongType");
      } else setError("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-surface p-5 elev-raised">
      <h2 className="type-h3 text-ink">{t("stored.uploads.title")}</h2>
      <p className="type-body mt-3 text-ink-2">{t("stored.uploads.body")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {QUOTE_UPLOAD_KINDS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setKind(option)}
            aria-pressed={kind === option}
            className={cn(
              buttonVariants({ variant: kind === option ? "primary" : "ghost", size: "sm" }),
            )}
          >
            {t(`stored.uploads.${option}`)}
          </button>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="label-mono text-soft">{t("stored.uploads.cta")}</span>
        <input
          type="file"
          multiple
          accept={QUOTE_ACCEPT_ATTR}
          disabled={busy}
          className="mt-2 w-full rounded-md border border-line bg-canvas px-4 py-3 text-ink"
          onChange={(event) => {
            void onFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      <p className="type-caption mt-3 text-soft">{t("stored.uploads.hint")}</p>
      <p className="type-caption mt-1 text-soft">{t("stored.uploads.notice")}</p>
      {busy ? <p className="type-caption mt-3 text-ink-2">{t("stored.uploads.pending")}</p> : null}
      {sent > 0 && !busy ? (
        <p className="type-caption mt-3 text-ink-2">{t("stored.uploads.done", { count: sent })}</p>
      ) : null}
      {error ? (
        <p role="alert" className="type-caption mt-3 text-danger">
          {t(`stored.uploads.${error}`)}
        </p>
      ) : null}
    </section>
  );
}

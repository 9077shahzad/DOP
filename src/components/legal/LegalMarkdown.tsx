import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { PublicLegalEntity } from "@/lib/legal-data";
import { cn } from "@/lib/utils";

const REVIEW_MARKER = "LOCAL LEGAL REVIEW REQUIRED";

/** Placeholder token -> value on the legal entity. Company data lives in one place. */
function valueFor(token: string, entity: PublicLegalEntity | null, currency: string): string {
  if (!entity) return "";
  switch (token) {
    case "legal_name":
      return entity.legal_name;
    case "register_number":
      return entity.register_number;
    case "vat_number":
      return entity.vat_number;
    case "email":
      return entity.email;
    case "phone":
      return entity.phone;
    case "canton":
      return entity.canton;
    case "currency":
      return currency;

    case "address":
      return [entity.address_line, [entity.postal_code, entity.city].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ");
    default:
      return "";
  }
}

function PendingChip({ label }: { label: string }) {
  const { t } = useTranslation("legal");
  return (
    <span className="label-mono mx-0.5 inline-flex items-center gap-1 border border-dashed border-primary/60 bg-primary/5 px-1.5 py-0.5 align-baseline text-primary">
      {t(`fields.${label}`, { defaultValue: label })} · {t("pending")}
    </span>
  );
}

function ReviewChip() {
  const { t } = useTranslation("legal");
  return (
    <span className="label-mono mx-0.5 inline-flex items-center border border-warning bg-warning/10 px-1.5 py-0.5 align-baseline text-ink">
      {t("reviewMarker")}
    </span>
  );
}

/** Inline pass: {{placeholder}}, **bold**, and the review marker. */
function inline(text: string, entity: PublicLegalEntity | null, currency: string, keyBase: string): ReactNode[] {
  const parts = text.split(/(\{\{[a-z_]+\}\}|\*\*[^*]+\*\*|LOCAL LEGAL REVIEW REQUIRED)/g);
  return parts.filter(Boolean).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part === REVIEW_MARKER) return <ReviewChip key={key} />;
    if (part.startsWith("{{")) {
      const token = part.slice(2, -2);
      const value = valueFor(token, entity, currency);
      return value ? (
        <Fragment key={key}>{value}</Fragment>
      ) : (
        <PendingChip key={key} label={token} />
      );
    }
    if (part.startsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
    return <Fragment key={key}>{part}</Fragment>;
  });
}

/**
 * Minimal markdown renderer for legal drafts: headings, quotes, paragraphs.
 * No HTML is ever injected — every node is built from parsed text.
 */
export function LegalMarkdown({
  body,
  entity,
  currency,
  className,
}: {
  body: string;
  entity: PublicLegalEntity | null;
  currency: string;
  className?: string;
}) {
  const blocks = body.split(/\n{2,}/);

  return (
    <div className={cn("space-y-5", className)}>
      {blocks.map((raw, index) => {
        const block = raw.trim();
        if (!block) return null;
        const key = `b${index}`;

        if (block.startsWith("# ")) {
          return (
            <h2 key={key} className="type-h2 text-ink">
              {inline(block.slice(2), entity, currency, key)}
            </h2>
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h3 key={key} className="mt-10 text-xl text-ink">
              {inline(block.slice(3), entity, currency, key)}
            </h3>
          );
        }
        if (block.startsWith("> ")) {
          return (
            <p
              key={key}
              role="note"
              className="border-s-4 border-warning bg-warning/10 p-4 text-sm text-ink"
            >
              {inline(block.replace(/^> ?/gm, ""), entity, currency, key)}
            </p>
          );
        }
        return (
          <p key={key} className="whitespace-pre-line text-ink-2">
            {inline(block, entity, currency, key)}
          </p>
        );
      })}
    </div>
  );
}

export function DraftBanner({ status }: { status: string }) {
  const { t } = useTranslation("legal");
  if (status === "published") return null;
  return (
    <p
      role="status"
      className="border border-warning bg-warning/10 px-4 py-3 text-sm text-ink"
    >
      <span className="label-mono me-2 bg-warning px-1.5 py-0.5 text-ink">{t("draft.badge")}</span>
      {t("draft.text")}
    </p>
  );
}

import { useTranslation } from "react-i18next";

import type { Blocker } from "@/lib/planner-blockers";

/**
 * Names every outstanding requirement, each with the step it lives on, and
 * jumps to the field when clicked. A requirement is only ever listed while it
 * is genuinely unmet — the list is derived from state on every render.
 */
export function BlockerList({
  blockers,
  title,
  tone,
  onJump,
}: {
  blockers: Blocker[];
  title: string;
  tone: "blocking" | "info";
  onJump: (blocker: Blocker) => void;
}) {
  const { t } = useTranslation("planer");
  if (blockers.length === 0) return null;

  return (
    <div
      role={tone === "blocking" ? "alert" : "status"}
      className={
        tone === "blocking"
          ? "mt-6 rounded-xl border border-danger/40 bg-danger-subtle px-4 py-3.5 text-sm text-ink"
          : "mt-6 rounded-xl bg-surface px-4 py-3.5 text-sm text-ink"
      }
    >
      <p className="font-medium">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {blockers.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => onJump(b)}
              className="text-start text-primary underline underline-offset-4"
            >
              {t("blockers.item", {
                label: t(`blockers.fields.${b.id}`),
                step: String(b.step).padStart(2, "0"),
                stepName: t(`flow.${b.step}.name`),
              })}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

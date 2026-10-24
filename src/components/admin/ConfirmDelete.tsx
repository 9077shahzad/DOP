import { useTranslation } from "react-i18next";

import { Dialog, btn, btnDanger } from "@/components/system";

/** t("common.delete") never acts on one click: it asks first and only archives. */
export function ConfirmDelete({ label, onConfirm, onCancel, busy }: { label: string; onConfirm: () => void; onCancel: () => void; busy?: boolean }) {
  const { t } = useTranslation("dop");
  return (
    <Dialog
      title={t("cd.title")}
      closeLabel={t("common.close")}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className={btn} onClick={onCancel}>{t("common.cancel")}</button>
          <button type="button" className={btnDanger} disabled={busy} onClick={onConfirm}>{t("common.delete")}</button>
        </>
      }
    >
      <p className="text-sm text-ink">{t("cd.q")}</p>
      <p className="mt-2 text-sm text-ink-2">{label}</p>
      <p className="mt-2 text-xs text-soft">{t("cd.note")}</p>
    </Dialog>
  );
}

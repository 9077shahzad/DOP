/**
 * Unterlagen/Dokumente of an offer, inside the staff editor: lists the
 * customer's request files and offer files, and lets staff add a document
 * (PDF/JPG/PNG, private bucket, audited via `dop_attach_offer_file`).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { field } from "@/components/system";
import { MAX_UPLOAD_BYTES, QUOTE_ACCEPTED_TYPES, QUOTE_ACCEPT_ATTR, newDraftId } from "@/lib/quote-uploads";
import type { QuoteRow } from "@/lib/quotes";

type Doc = { id: string; file_name: string; storage_path: string; source: string };

export function OfferDocuments({ quote }: { quote: QuoteRow }) {
  const { t } = useTranslation("dop");
  const qc = useQueryClient();
  const key = ["offer-docs", quote.id];
  const docs = useQuery({
    queryKey: key,
    queryFn: async (): Promise<Doc[]> => {
      const [lead, offer] = await Promise.all([
        quote.lead_id
          ? supabase.from("lead_attachments").select("id, file_name, storage_path").eq("lead_id", quote.lead_id)
          : Promise.resolve({ data: [] as { id: string; file_name: string; storage_path: string }[] }),
        supabase.from("quote_attachments").select("id, file_name, storage_path").eq("quote_id", quote.id),
      ]);
      return [
        ...(lead.data ?? []).map((d) => ({ ...d, source: t("docs.request") })),
        ...(offer.data ?? []).map((d) => ({ ...d, source: t("docs.offer") })),
      ];
    },
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function open(path: string) {
    const { data } = await supabase.storage.from("lead-attachments").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  }

  async function upload(file: File) {
    setMsg(null);
    if (file.size > MAX_UPLOAD_BYTES || !QUOTE_ACCEPTED_TYPES.includes(file.type)) {
      setMsg(t("docs.badType"));
      return;
    }
    setBusy(true);
    try {
      const path = `intake/${newDraftId()}/staff-${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_").slice(-80)}`;
      const up = await supabase.storage.from("lead-attachments").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase.rpc("dop_attach_offer_file" as never, {
        _quote_id: quote.id, _storage_path: path, _file_name: file.name, _mime: file.type, _size: file.size,
      } as never);
      if (error) throw error;
      setMsg(t("docs.added", { name: file.name }));
      await qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      setMsg(t("docs.failed", { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="rounded-md border border-line p-3">
      <legend className="label-mono px-1 text-primary">{t("docs.title")}</legend>
      <ul className="space-y-1 text-sm">
        {(docs.data ?? []).length === 0 ? <li className="text-ink-2">{t("docs.none")}</li> : null}
        {(docs.data ?? []).map((d) => (
          <li key={d.id} className="flex items-center gap-2">
            <span className="label-mono text-soft">{d.source}</span>
            <button type="button" className="underline" onClick={() => void open(d.storage_path)}>{d.file_name}</button>
          </li>
        ))}
      </ul>
      <label className="mt-3 block text-sm">{t("docs.add")}
        <input className={field} type="file" accept={QUOTE_ACCEPT_ATTR} disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      </label>
      {msg ? <p role="status" className="mt-2 text-sm">{msg}</p> : null}
    </fieldset>
  );
}

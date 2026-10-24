/**
 * /admin/inventar — the inventory list the public quotation wizard shows.
 *
 * Staff own this list: names, volumes and order are data, not code. Volume is a
 * capacity figure in m³ used for planning; it carries no price. Each item keeps
 * one record with a label in every interface language.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/system";
import i18n, { UI_LANGS, type Lang } from "@/i18n/config";
import { langOf, privateHead } from "@/lib/seo";
import { labelIn } from "@/lib/i18n-label";
import { fetchInventory, saveInventoryItem, setInventoryActive, type InventoryItem } from "@/lib/inventory";

export const Route = createFileRoute("/admin/inventar")({
  ssr: false,
  head: () => privateHead(langOf(i18n.language), "admin"),
  component: InventoryScreen,
});

const EMPTY = { key: "", name_de: "", category: "wohnen", m3: "", sort_order: "100" };

function InventoryScreen() {
  const { t } = useTranslation("ops");
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await fetchInventory(true));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!draft.key.trim() || !draft.name_de.trim()) return;
    setSaving(true);
    try {
      await saveInventoryItem({
        key: draft.key.trim(),
        name_de: draft.name_de.trim(),
        label_i18n: { de: draft.name_de.trim() },
        category: draft.category.trim() || "wohnen",
        m3: Number(draft.m3) || 0,
        sort_order: Number(draft.sort_order) || 100,
      });
      setDraft({ ...EMPTY });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
    setSaving(false);
  }

  async function patchItem(item: InventoryItem, patch: Partial<InventoryItem>) {
    try {
      await saveInventoryItem({ id: item.id, key: item.key, name_de: item.name_de, ...patch });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  }

  /** One record, five labels — never a duplicated row per language. */
  async function patchLabel(item: InventoryItem, lang: Lang, value: string) {
    const current = (item.label_i18n && typeof item.label_i18n === "object" ? item.label_i18n : {}) as Record<
      string,
      unknown
    >;
    const next = { ...current, [lang]: value };
    await patchItem(item, {
      label_i18n: next as InventoryItem["label_i18n"],
      ...(lang === "de" ? { name_de: value } : {}),
    });
  }

  return (
      <div className="space-y-6">
        <Card>
          <CardHeader title={t("inventory.addTitle")} eyebrow={t("inventory.addEyebrow")} />
          <div className="grid gap-4 p-5 pt-0 sm:grid-cols-5">
            <Field label={t("inventory.key")}>
              {(p) => <Input {...p} value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />}
            </Field>
            <Field label={t("inventory.label")}>
              {(p) => (
                <Input {...p} value={draft.name_de} onChange={(e) => setDraft({ ...draft, name_de: e.target.value })} />
              )}
            </Field>
            <Field label={t("inventory.category")}>
              {(p) => (
                <Input {...p} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              )}
            </Field>
            <Field label={t("inventory.volume")}>
              {(p) => (
                <Input {...p} inputMode="decimal" value={draft.m3} onChange={(e) => setDraft({ ...draft, m3: e.target.value })} />
              )}
            </Field>
            <Field label={t("inventory.order")}>
              {(p) => (
                <Input
                  {...p}
                  inputMode="numeric"
                  value={draft.sort_order}
                  onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
                />
              )}
            </Field>
          </div>
          <div className="px-5 pb-5">
            <Button onClick={() => void add()} disabled={saving}>
              {saving ? t("common.saving") : t("common.add")}
            </Button>
          </div>
        </Card>

        {error ? (
          <ErrorState
            message={error}
            action={
              <Button variant="quiet" onClick={() => void load()}>
                {t("common.reload")}
              </Button>
            }
          />
        ) : null}
        {items === null ? (
          <LoadingState label={t("inventory.loading")} />
        ) : items.length === 0 ? (
          <EmptyState title={t("inventory.empty")} />
        ) : (
          <TableShell
            caption={t("inventory.caption")}
            head={
              <Tr>
                <Th>{t("inventory.labels")}</Th>
                <Th>{t("inventory.key")}</Th>
                <Th>{t("inventory.category")}</Th>
                <Th>{t("inventory.volume")}</Th>
                <Th>{t("inventory.order")}</Th>
                <Th>{t("common.status")}</Th>
              </Tr>
            }
          >
            {items.map((item) => (
              <Tr key={item.id}>
                <Td>
                  <div className="space-y-1.5">
                    <p className="type-small text-soft">{t("inventory.labelsHint")}</p>
                    {UI_LANGS.map((lang) => (
                      <label key={lang} className="flex items-center gap-2">
                        <span className="data-mono w-7 text-xs uppercase text-soft">{lang}</span>
                        <Input
                          dir={lang === "ar" ? "rtl" : "ltr"}
                          defaultValue={labelIn(item.label_i18n, lang, lang === "de" ? item.name_de : "")}
                          onBlur={(e) => {
                            const before = labelIn(item.label_i18n, lang, lang === "de" ? item.name_de : "");
                            if (e.target.value !== before) void patchLabel(item, lang, e.target.value);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </Td>
                <Td className="data-mono">{item.key}</Td>
                <Td>
                  <Input
                    defaultValue={item.category}
                    onBlur={(e) =>
                      e.target.value !== item.category && void patchItem(item, { category: e.target.value })
                    }
                  />
                </Td>
                <Td>
                  <Input
                    inputMode="decimal"
                    defaultValue={String(item.m3)}
                    onBlur={(e) =>
                      Number(e.target.value) !== Number(item.m3) &&
                      void patchItem(item, { m3: Number(e.target.value) || 0 })
                    }
                  />
                </Td>
                <Td>
                  <Input
                    inputMode="numeric"
                    defaultValue={String(item.sort_order)}
                    onBlur={(e) =>
                      Number(e.target.value) !== item.sort_order &&
                      void patchItem(item, { sort_order: Number(e.target.value) || 100 })
                    }
                  />
                </Td>
                <Td>
                  <Button variant="quiet" onClick={() => void setInventoryActive(item.id, !item.active).then(load)}>
                    {item.active ? t("common.active") : t("common.inactive")}
                  </Button>
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </div>
  );
}

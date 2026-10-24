/**
 * The three-pane email client.
 *
 * Nothing here guesses: a thread is only linked to a record when the database
 * found exactly one non-shared address match, or when a staff member picked
 * the record by hand. Outbound replies show their real delivery state.
 */
import { Link as RouterLink } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  CornerUpLeft,
  CornerUpRight,
  Inbox,
  Link2,
  Mail,
  Paperclip,
  Send,
  Tag as TagIcon,
  Upload,
  UserCheck,
  X,
} from "lucide-react";

import { useActiveLang } from "@/lib/admin-i18n";
import { formatDateTime } from "@/i18n/format";
import { sendInboxReply } from "@/lib/inbox.functions";
import {
  CONVERSIONS,
  EMPTY_FILTERS,
  FOLDERS,
  addTag,
  assignThread,
  attachmentUrl,
  convertToLead,
  describeLinks,
  folderCounts,
  forwardBody,
  ingestEmail,
  linkThread,
  listStaffProfiles,
  listTags,
  listThreads,
  loadThread,
  manualForward,
  markThreadRead,
  ownAddresses,
  parseEml,
  quoteForReply,
  removeTag,
  replyRecipients,
  searchLinkTargets,
  setThreadFolder,
  splitQuoted,
  unlinkThread,
  type Conversion,
  type Folder,
  type LinkTarget,
  type MessageRow,
  type ThreadDetail,
  type ThreadFilters,
  type ThreadView,
} from "@/lib/inbox";

const FOLDER_ICON: Record<Folder, typeof Inbox> = {
  inbox: Inbox,
  sent: Send,
  drafts: Mail,
  archived: Archive,
  unassigned: Link2,
};

const inputClass =
  "w-full border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function InboxWorkspace() {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();

  const [filters, setFilters] = useState<ThreadFilters>(EMPTY_FILTERS);
  const [threads, setThreads] = useState<ThreadView[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [staff, setStaff] = useState<{ id: string; label: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [linkLabels, setLinkLabels] = useState<Record<string, string>>({});
  const [mine, setMine] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showImport, setShowImport] = useState(false);

  const refreshList = useCallback(async () => {
    const [rows, folderTotals] = await Promise.all([listThreads(filters), folderCounts()]);
    setThreads(rows);
    setCounts(folderTotals);
  }, [filters]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    void listTags().then(setTags);
    void listStaffProfiles().then(setStaff);
    void ownAddresses().then(setMine);
  }, []);

  const openThread = useCallback(async (threadId: string) => {
    setSelected(threadId);
    const loaded = await loadThread(threadId);
    setDetail(loaded);
    if (loaded) {
      setLinkLabels(await describeLinks(loaded.links));
      if (loaded.thread.unread_count > 0) {
        await markThreadRead(threadId);
      }
    }
  }, []);

  const reload = useCallback(async () => {
    await refreshList();
    if (selected) await openThread(selected);
  }, [refreshList, selected, openThread]);

  function set<K extends keyof ThreadFilters>(key: K, value: ThreadFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="grid gap-px bg-line lg:grid-cols-[15rem_22rem_minmax(0,1fr)]">
      {/* Pane 1 — folders, filters, import */}
      <aside className="bg-surface p-4">
        <p className="label-mono text-primary">{t("inbox.eyebrow")}</p>
        <h1 className="mt-2 text-2xl">{t("inbox.title")}</h1>
        <RouterLink
          to="/admin/postfach/einstellungen"
          className="mt-2 inline-block text-xs text-primary underline underline-offset-4"
        >
          {t("inbox.settings.title")}
        </RouterLink>


        <ul className="mt-5 space-y-1">
          {FOLDERS.map((folder) => {
            const Icon = FOLDER_ICON[folder];
            const active = filters.folder === folder;
            return (
              <li key={folder}>
                <button
                  type="button"
                  onClick={() => set("folder", folder)}
                  className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-start text-sm ${
                    active ? "border-primary bg-canvas text-ink" : "border-transparent text-ink-2 hover:text-primary"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
                  <span className="flex-1">{t(`inbox.folder.${folder}`)}</span>
                  <span className="data-mono text-xs text-soft">{counts[folder] ?? 0}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 space-y-3">
          <label className="block text-sm">
            <span className="label-mono text-soft">{t("inbox.filter.search")}</span>
            <input
              className={`${inputClass} mt-1`}
              value={filters.search}
              onChange={(event) => set("search", event.target.value)}
              placeholder={t("inbox.filter.searchHint")}
            />
          </label>
          <label className="block text-sm">
            <span className="label-mono text-soft">{t("inbox.filter.tag")}</span>
            <select className={`${inputClass} mt-1`} value={filters.tag} onChange={(e) => set("tag", e.target.value)}>
              <option value="">{t("inbox.filter.any")}</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="label-mono text-soft">{t("inbox.filter.assignee")}</span>
            <select
              className={`${inputClass} mt-1`}
              value={filters.assignee}
              onChange={(e) => set("assignee", e.target.value)}
            >
              <option value="">{t("inbox.filter.any")}</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="label-mono text-soft">{t("inbox.filter.link")}</span>
            <select
              className={`${inputClass} mt-1`}
              value={filters.linkState}
              onChange={(e) => set("linkState", e.target.value)}
            >
              <option value="any">{t("inbox.filter.any")}</option>
              <option value="linked">{t("inbox.filter.linked")}</option>
              <option value="unlinked">{t("inbox.filter.unlinked")}</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="label-mono text-soft">{t("inbox.filter.read")}</span>
            <select
              className={`${inputClass} mt-1`}
              value={filters.readState}
              onChange={(e) => set("readState", e.target.value)}
            >
              <option value="any">{t("inbox.filter.any")}</option>
              <option value="unread">{t("inbox.filter.unread")}</option>
              <option value="read">{t("inbox.filter.readOnly")}</option>
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          className="label-mono mt-6 flex w-full items-center justify-center gap-2 border border-ink px-3 py-2 text-ink hover:bg-ink hover:text-canvas"
        >
          <Upload aria-hidden="true" className="size-4" strokeWidth={1.5} />
          {t("inbox.import.open")}
        </button>
        <p className="mt-3 text-xs text-soft">{t("inbox.providerNote")}</p>
      </aside>

      {/* Pane 2 — thread list */}
      <section className="bg-surface">
        {showImport ? (
          <ImportPanel
            onClose={() => setShowImport(false)}
            onDone={async (message) => {
              setNotice(message);
              await refreshList();
            }}
          />
        ) : null}
        {notice ? (
          <p className="border-b border-line bg-canvas px-4 py-3 text-sm text-ink">{notice}</p>
        ) : null}
        <ul className="divide-y divide-line">
          {threads.length === 0 ? (
            <li className="px-4 py-8 text-sm text-soft">{t("inbox.list.empty")}</li>
          ) : (
            threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => void openThread(thread.id)}
                  className={`block w-full px-4 py-3 text-start ${
                    selected === thread.id ? "bg-canvas" : "hover:bg-canvas"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`truncate text-sm ${thread.unread_count > 0 ? "font-semibold text-ink" : "text-ink-2"}`}>
                      {thread.subject || t("inbox.noSubject")}
                    </span>
                    <span className="data-mono shrink-0 text-xs text-soft">
                      {formatDateTime(thread.last_message_at, lang)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-soft">{thread.participants.join(", ")}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-2">{thread.snippet}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {thread.links.length === 0 ? (
                      <span className="label-mono border border-warning px-2 py-0.5 text-[0.65rem] text-warning">
                        {t("inbox.badge.unlinked")}
                      </span>
                    ) : (
                      <span className="label-mono border border-line px-2 py-0.5 text-[0.65rem] text-ink-2">
                        {thread.links.map((l) => t(`inbox.entity.${l.entity_type}`)).join(", ")}
                      </span>
                    )}
                    {thread.tags.map((tag) => (
                      <span key={tag.id} className="label-mono bg-canvas px-2 py-0.5 text-[0.65rem] text-ink-2">
                        {tag.tag}
                      </span>
                    ))}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Pane 3 — conversation */}
      <section className="bg-surface">
        {!detail ? (
          <p className="p-8 text-sm text-soft">{t("inbox.detail.none")}</p>
        ) : (
          <ThreadPane
            detail={detail}
            linkLabels={linkLabels}
            staff={staff}
            mine={mine}
            busy={busy}
            setBusy={setBusy}
            onReload={reload}
            onFolder={async (folder) => {
              await setThreadFolder(detail.thread.id, folder);
              await reload();
            }}
          />
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ThreadPane({
  detail,
  linkLabels,
  staff,
  mine,
  busy,
  setBusy,
  onReload,
  onFolder,
}: {
  detail: ThreadDetail;
  linkLabels: Record<string, string>;
  staff: { id: string; label: string }[];
  mine: string[];
  busy: boolean;
  setBusy: (value: boolean) => void;
  onReload: () => Promise<void>;
  onFolder: (folder: Folder) => Promise<void>;
}) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [tagDraft, setTagDraft] = useState("");
  const [compose, setCompose] = useState<null | { mode: "reply" | "replyAll" | "forward"; message: MessageRow }>(null);

  const last = detail.messages[detail.messages.length - 1];

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line px-5 py-4">
        <h2 className="text-xl text-ink">{detail.thread.subject || t("inbox.noSubject")}</h2>
        <p className="mt-1 text-xs text-soft">{detail.thread.participants.join(", ")}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {last ? (
            <>
              <ActionButton icon={CornerUpLeft} onClick={() => setCompose({ mode: "reply", message: last })}>
                {t("inbox.action.reply")}
              </ActionButton>
              <ActionButton icon={CornerUpLeft} onClick={() => setCompose({ mode: "replyAll", message: last })}>
                {t("inbox.action.replyAll")}
              </ActionButton>
              <ActionButton icon={CornerUpRight} onClick={() => setCompose({ mode: "forward", message: last })}>
                {t("inbox.action.forward")}
              </ActionButton>
            </>
          ) : null}
          <ActionButton icon={Archive} onClick={() => void onFolder("archived")}>
            {t("inbox.action.archive")}
          </ActionButton>
          {detail.thread.folder === "archived" ? (
            <ActionButton icon={Inbox} onClick={() => void onFolder("inbox")}>
              {t("inbox.action.toInbox")}
            </ActionButton>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="label-mono text-soft">
              <UserCheck aria-hidden="true" className="mr-1 inline size-3.5" /> {t("inbox.assign")}
            </span>
            <select
              className={`${inputClass} mt-1`}
              value={detail.thread.assigned_to ?? ""}
              onChange={async (event) => {
                await assignThread(detail.thread.id, event.target.value || null);
                await onReload();
              }}
            >
              <option value="">{t("inbox.unassignedPerson")}</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.label}
                </option>
              ))}
            </select>
          </label>

          <div className="text-sm">
            <span className="label-mono text-soft">
              <TagIcon aria-hidden="true" className="mr-1 inline size-3.5" /> {t("inbox.tags")}
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {detail.tags.map((tag) => (
                <span key={tag.id} className="label-mono flex items-center gap-1 border border-line px-2 py-1 text-xs">
                  {tag.tag}
                  <button
                    type="button"
                    aria-label={t("inbox.removeTag")}
                    onClick={async () => {
                      await removeTag(tag.id);
                      await onReload();
                    }}
                  >
                    <X aria-hidden="true" className="size-3" />
                  </button>
                </span>
              ))}
              <input
                className="w-28 border border-line bg-canvas px-2 py-1 text-xs outline-none focus:border-primary"
                value={tagDraft}
                placeholder={t("inbox.addTag")}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={async (event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  await addTag(detail.thread.id, tagDraft);
                  setTagDraft("");
                  await onReload();
                }}
              />
            </div>
          </div>
        </div>

        <LinksPanel detail={detail} labels={linkLabels} onReload={onReload} />
        {last ? <ConvertPanel threadId={detail.thread.id} message={last} lang={lang} onReload={onReload} /> : null}
      </header>

      <div className="flex-1 space-y-px overflow-y-auto bg-line">
        {detail.messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            attachments={detail.attachments.filter((a) => a.message_id === message.id)}
          />
        ))}
      </div>

      {compose && last ? (
        <Composer
          detail={detail}
          mode={compose.mode}
          source={compose.message}
          mine={mine}
          busy={busy}
          setBusy={setBusy}
          onClose={() => setCompose(null)}
          onSent={onReload}
        />
      ) : null}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  onClick,
  children,
}: {
  icon: typeof Inbox;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="label-mono flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-ink hover:border-primary hover:text-primary"
    >
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
      {children}
    </button>
  );
}

function MessageCard({
  message,
  attachments,
}: {
  message: MessageRow;
  attachments: { id: string; filename: string; storage_path: string }[];
}) {
  const { t } = useTranslation("admin");
  const lang = useActiveLang();
  const [open, setOpen] = useState(false);
  const { visible, quoted } = splitQuoted(message.body_text);

  const status =
    message.direction === "outbound"
      ? message.delivery_status === "sent"
        ? { tone: "text-success", text: t("inbox.status.sent") }
        : message.delivery_status === "failed"
          ? { tone: "text-destructive", text: `${t("inbox.status.failed")} — ${message.delivery_reason}` }
          : { tone: "text-warning", text: `${t("inbox.status.pending")} — ${message.delivery_reason || t("inbox.noProvider")}` }
      : null;

  return (
    <article className="bg-surface px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink">
          <span className="font-semibold">{message.from_name || message.from_address}</span>
          <span className="text-soft"> → {message.to_addresses.join(", ")}</span>
        </p>
        <p className="data-mono text-xs text-soft">{formatDateTime(message.received_at, lang)}</p>
      </div>
      {status ? <p className={`label-mono mt-1 text-xs ${status.tone}`}>{status.text}</p> : null}

      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-ink-2">{visible}</pre>

      {quoted ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="label-mono flex items-center gap-1 text-xs text-soft hover:text-primary"
          >
            {open ? <ChevronDown aria-hidden="true" className="size-3.5" /> : <ChevronRight aria-hidden="true" className="size-3.5" />}
            {t("inbox.quoted")}
          </button>
          {open ? (
            <pre className="mt-2 whitespace-pre-wrap border-l-2 border-line pl-3 font-sans text-xs text-soft">
              {quoted}
            </pre>
          ) : null}
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {attachments.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                onClick={async () => {
                  const url = await attachmentUrl(file.storage_path);
                  if (url) window.open(url, "_blank", "noopener");
                }}
                className="label-mono flex items-center gap-1 border border-line px-2 py-1 text-xs text-ink hover:border-primary"
              >
                <Paperclip aria-hidden="true" className="size-3.5" />
                {file.filename}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */

function LinksPanel({
  detail,
  labels,
  onReload,
}: {
  detail: ThreadDetail;
  labels: Record<string, string>;
  onReload: () => Promise<void>;
}) {
  const { t } = useTranslation("admin");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<LinkTarget[]>([]);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      void searchLinkTargets(term).then((rows) => {
        if (alive) setResults(rows);
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [term]);

  return (
    <div className="mt-4 border border-line bg-canvas p-3">
      <p className="label-mono text-soft">
        <Link2 aria-hidden="true" className="mr-1 inline size-3.5" /> {t("inbox.links")}
      </p>
      {detail.links.length === 0 ? (
        <p className="mt-2 text-xs text-warning">{t("inbox.noLinks")}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {detail.links.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-2 text-xs text-ink">
              <span>
                <span className="label-mono text-soft">{t(`inbox.entity.${link.entity_type}`)}</span>{" "}
                {labels[link.entity_id] ?? link.entity_id.slice(0, 8)}{" "}
                <span className="text-soft">({t(`inbox.confidence.${link.confidence}`, link.confidence)})</span>
              </span>
              <button
                type="button"
                className="label-mono text-destructive hover:underline"
                onClick={async () => {
                  await unlinkThread(link.id);
                  await onReload();
                }}
              >
                {t("inbox.unlink")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        className={`${inputClass} mt-3`}
        value={term}
        placeholder={t("inbox.linkSearch")}
        onChange={(event) => setTerm(event.target.value)}
      />
      {results.length > 0 ? (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {results.map((target) => (
            <li key={`${target.entityType}-${target.entityId}`}>
              <button
                type="button"
                onClick={async () => {
                  await linkThread(detail.thread.id, target.entityType, target.entityId);
                  setTerm("");
                  await onReload();
                }}
                className="block w-full border border-line bg-surface px-2 py-1 text-start text-xs hover:border-primary"
              >
                <span className="label-mono text-soft">{t(`inbox.entity.${target.entityType}`)}</span> {target.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ConvertPanel({
  threadId,
  message,
  lang,
  onReload,
}: {
  threadId: string;
  message: MessageRow;
  lang: string;
  onReload: () => Promise<void>;
}) {
  const { t } = useTranslation("admin");
  const [conversion, setConversion] = useState<Conversion>("inquiry");
  const [name, setName] = useState(message.from_name);
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-3 border border-line bg-canvas p-3">
      <p className="label-mono text-soft">{t("inbox.convert.title")}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        <select
          className={inputClass}
          value={conversion}
          onChange={(event) => setConversion(event.target.value as Conversion)}
        >
          {CONVERSIONS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`inbox.convert.${kind}`)}
            </option>
          ))}
        </select>
        <input className={inputClass} value={name} placeholder={t("inbox.convert.name")} onChange={(e) => setName(e.target.value)} />
        <input className={inputClass} value={phone} placeholder={t("inbox.convert.phone")} onChange={(e) => setPhone(e.target.value)} />
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const reference = await convertToLead({
                threadId,
                message,
                conversion,
                customerName: name,
                phone,
                language: lang,
              });
              setResult(reference);
              await onReload();
            } catch (error) {
              setResult(error instanceof Error ? error.message : String(error));
            } finally {
              setBusy(false);
            }
          }}
          className="label-mono bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {t("inbox.convert.submit")}
        </button>
      </div>
      {result ? <p className="data-mono mt-2 text-xs text-ink">{result}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Composer({
  detail,
  mode,
  source,
  mine,
  busy,
  setBusy,
  onClose,
  onSent,
}: {
  detail: ThreadDetail;
  mode: "reply" | "replyAll" | "forward";
  source: MessageRow;
  mine: string[];
  busy: boolean;
  setBusy: (value: boolean) => void;
  onClose: () => void;
  onSent: () => Promise<void>;
}) {
  const { t } = useTranslation("admin");
  const initial = useMemo(() => {
    if (mode === "forward") {
      return { to: "", cc: "", subject: `Fwd: ${source.subject}`, body: forwardBody(source) };
    }
    const { to, cc } = replyRecipients(source, mode === "replyAll", mine);
    const subject = /^re:/i.test(source.subject) ? source.subject : `Re: ${source.subject}`;
    return { to: to.join(", "), cc: cc.join(", "), subject, body: quoteForReply(source) };
  }, [mode, source, mine]);

  const [to, setTo] = useState(initial.to);
  const [cc, setCc] = useState(initial.cc);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [outcome, setOutcome] = useState<{ status: string; reason: string } | null>(null);

  return (
    <div className="border-t border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="label-mono text-primary">{t(`inbox.action.${mode}`)}</p>
        <button type="button" onClick={onClose} aria-label={t("inbox.close")}>
          <X aria-hidden="true" className="size-4 text-soft" />
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        <input className={inputClass} value={to} placeholder={t("inbox.compose.to")} onChange={(e) => setTo(e.target.value)} />
        <input className={inputClass} value={cc} placeholder={t("inbox.compose.cc")} onChange={(e) => setCc(e.target.value)} />
        <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className={inputClass} rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>

      {outcome ? (
        <p
          className={`mt-3 border-l-4 px-3 py-2 text-sm ${
            outcome.status === "sent"
              ? "border-success text-success"
              : outcome.status === "pending"
                ? "border-warning text-warning"
                : "border-destructive text-destructive"
          }`}
        >
          {t(`inbox.status.${outcome.status}`)}
          {outcome.reason ? ` — ${outcome.reason}` : ""}
        </p>
      ) : (
        <p className="mt-3 text-xs text-soft">{t("inbox.compose.pendingHint")}</p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await sendInboxReply({
              data: {
                threadId: detail.thread.id,
                to: to.split(",").map((a) => a.trim()).filter(Boolean),
                cc: cc.split(",").map((a) => a.trim()).filter(Boolean),
                subject,
                bodyText: body,
                inReplyTo: source.message_id,
                references: [...source.references, source.message_id].filter(Boolean),
              },
            });
            setOutcome({ status: result.status, reason: result.reason });
            await onSent();
          } catch (error) {
            setOutcome({ status: "failed", reason: error instanceof Error ? error.message : String(error) });
          } finally {
            setBusy(false);
          }
        }}
        className="label-mono mt-3 flex items-center gap-2 bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        <Send aria-hidden="true" className="size-4" strokeWidth={1.5} />
        {t("inbox.compose.submit")}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ImportPanel({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => Promise<void> }) {
  const { t } = useTranslation("admin");
  const [raw, setRaw] = useState("");
  const [forward, setForward] = useState({ from_address: "", from_name: "", to: "", subject: "", body: "" });
  const [busy, setBusy] = useState(false);

  async function importRaw(text: string) {
    setBusy(true);
    try {
      const parsed = parseEml(text);
      const result = await ingestEmail(parsed, "import_eml");
      await onDone(
        result.duplicate
          ? t("inbox.import.duplicate")
          : result.auto_linked
            ? t("inbox.import.linked")
            : t("inbox.import.unassigned"),
      );
      setRaw("");
    } catch (error) {
      await onDone(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-line bg-canvas p-4">
      <div className="flex items-center justify-between">
        <p className="label-mono text-primary">{t("inbox.import.title")}</p>
        <button type="button" onClick={onClose} aria-label={t("inbox.close")}>
          <X aria-hidden="true" className="size-4 text-soft" />
        </button>
      </div>
      <p className="mt-2 text-xs text-soft">{t("inbox.import.lead")}</p>

      <label className="mt-3 block text-sm">
        <span className="label-mono text-soft">{t("inbox.import.file")}</span>
        <input
          type="file"
          accept=".eml,message/rfc822,text/plain"
          className="mt-1 w-full text-xs"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await importRaw(await file.text());
            event.target.value = "";
          }}
        />
      </label>

      <label className="mt-3 block text-sm">
        <span className="label-mono text-soft">{t("inbox.import.paste")}</span>
        <textarea className={`${inputClass} mt-1`} rows={4} value={raw} onChange={(e) => setRaw(e.target.value)} />
      </label>
      <button
        type="button"
        disabled={busy || !raw.trim()}
        onClick={() => void importRaw(raw)}
        className="label-mono mt-2 border border-ink px-3 py-1.5 text-xs text-ink hover:bg-ink hover:text-canvas disabled:opacity-50"
      >
        {t("inbox.import.submitPaste")}
      </button>

      <fieldset className="mt-4 border-t border-line pt-3">
        <legend className="label-mono text-soft">{t("inbox.import.manual")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            className={inputClass}
            placeholder={t("inbox.import.fromAddress")}
            value={forward.from_address}
            onChange={(e) => setForward({ ...forward, from_address: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder={t("inbox.import.fromName")}
            value={forward.from_name}
            onChange={(e) => setForward({ ...forward, from_name: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder={t("inbox.import.to")}
            value={forward.to}
            onChange={(e) => setForward({ ...forward, to: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder={t("inbox.import.subject")}
            value={forward.subject}
            onChange={(e) => setForward({ ...forward, subject: e.target.value })}
          />
          <textarea
            className={`${inputClass} sm:col-span-2`}
            rows={4}
            placeholder={t("inbox.import.body")}
            value={forward.body}
            onChange={(e) => setForward({ ...forward, body: e.target.value })}
          />
        </div>
        <button
          type="button"
          disabled={busy || !forward.from_address.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await ingestEmail(manualForward(forward), "manual_forward");
              await onDone(result.duplicate ? t("inbox.import.duplicate") : t("inbox.import.unassigned"));
              setForward({ from_address: "", from_name: "", to: "", subject: "", body: "" });
            } catch (error) {
              await onDone(error instanceof Error ? error.message : String(error));
            } finally {
              setBusy(false);
            }
          }}
          className="label-mono mt-2 border border-ink px-3 py-1.5 text-xs text-ink hover:bg-ink hover:text-canvas disabled:opacity-50"
        >
          {t("inbox.import.submitManual")}
        </button>
      </fieldset>
    </div>
  );
}

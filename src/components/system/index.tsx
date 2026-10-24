/**
 * PS Umzug shared component set.
 *
 * Everything visual that appears on more than one screen lives here: buttons,
 * fields, tables, chips, dialogs, drawers, empty/loading/error states,
 * pagination and filter bars. Screens compose these; screens never declare
 * their own `const btn = "..."` again.
 *
 * Rules baked in:
 *  - colour only through design tokens, never literal Tailwind palette classes
 *  - three elevation levels (flat / raised / overlay), no ad-hoc box shadows
 *  - motion through the duration tokens, and never in the way of an action
 *  - every interactive element has a visible focus ring and a >=44px target
 */
import { X } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { TONE_CHIP, statusTone, type Tone } from "@/lib/status-tone";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------- button */

export const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold leading-none whitespace-nowrap",
    "transition-colors motion-fast",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:opacity-50 disabled:pointer-events-none",
  ),
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        dark: "bg-ink text-canvas hover:bg-ink-2",
        outline: "border border-ink text-ink hover:bg-ink hover:text-canvas",
        ghost: "border border-ink/25 text-ink hover:border-primary hover:text-primary",
        ghostLight: "border border-canvas/40 text-canvas hover:border-primary-light hover:text-primary-light",
        danger: "border border-danger bg-danger text-primary-foreground hover:opacity-90",
        quiet: "text-ink-2 underline underline-offset-4 hover:text-primary",
      },
      size: {
        /* dense admin toolbars — still 36px, only ever next to other controls */
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-base",
        /* field use: 48px minimum, gloves and one thumb */
        touch: "min-h-12 px-5 text-base",
        icon: "size-11",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, block, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}

/* ---------------------------------------------------------------------- chip */

export function Chip({
  status,
  tone,
  className,
  children,
}: {
  /** Enum value — resolved through the single status→tone map. */
  status?: string | null;
  /** Explicit tone, when the value is not a product status. */
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  const resolved = tone ?? statusTone(status);
  return (
    <span
      className={cn(
        "label-mono inline-flex items-center gap-1 rounded-md border px-2 py-1",
        TONE_CHIP[resolved],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------------- card */

const cardVariants = cva("rounded-md border border-line bg-surface", {
  variants: {
    elevation: { flat: "elev-flat", raised: "elev-raised", overlay: "elev-overlay" },
    padding: { none: "", sm: "p-4", md: "p-5", lg: "p-6" },
    interactive: { true: "lift", false: "" },
  },
  defaultVariants: { elevation: "flat", padding: "md", interactive: false },
});

export function Card({
  className,
  elevation,
  padding,
  interactive,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return <div className={cn(cardVariants({ elevation, padding, interactive }), className)} {...props} />;
}

export function CardHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="label-mono text-primary">{eyebrow}</p> : null}
        <h2 className="type-h2 mt-1 text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------- fields */

export const controlClass = cn(
  "w-full rounded-md border border-line bg-canvas px-3 py-2.5 text-sm text-ink",
  "outline-none transition-colors motion-fast placeholder:text-soft",
  "focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-[invalid=true]:border-danger",
);

/** 48px control for on-site use. */
export const controlTouchClass = cn(controlClass, "min-h-12 text-base");

export function Field({
  label,
  help,
  error,
  required,
  className,
  children,
}: {
  label: string;
  help?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string | undefined; "aria-invalid"?: boolean | undefined }) => ReactNode;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("block", className)}>
      <label htmlFor={id} className="label-mono block pb-1.5 text-soft">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {help && !error ? (
        <p id={helpId} className="type-caption mt-1.5">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="type-small mt-1.5 text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, touch, ...props }: ComponentProps<"input"> & { touch?: boolean }) {
  return <input className={cn(touch ? controlTouchClass : controlClass, className)} {...props} />;
}

export function Textarea({ className, touch, ...props }: ComponentProps<"textarea"> & { touch?: boolean }) {
  return <textarea className={cn(touch ? controlTouchClass : controlClass, "min-h-24", className)} {...props} />;
}

export function Select({ className, touch, ...props }: ComponentProps<"select"> & { touch?: boolean }) {
  return <select className={cn(touch ? controlTouchClass : controlClass, "cursor-pointer", className)} {...props} />;
}

/* -------------------------------------------------------------------- states */

export function LoadingState({ label }: { label: string }) {
  return (
    <p role="status" aria-live="polite" className="label-mono py-8 text-soft">
      {label}
    </p>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-line bg-surface px-6 py-10 text-center", className)}>
      <p className="label-mono text-soft">{title}</p>
      {body ? <p className="type-body mx-auto mt-2 max-w-md text-ink-2">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, action, className }: { message: string; action?: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-md border-l-4 border-danger bg-danger-subtle px-4 py-3",
        className,
      )}
    >
      <p className="type-small text-danger-ink">{message}</p>
      {action}
    </div>
  );
}

export function NoticeState({ message, className }: { message: string; className?: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-md border-l-4 border-primary bg-primary-subtle px-4 py-3 text-sm text-ink-2",
        className,
      )}
    >
      {message}
    </p>
  );
}

/* -------------------------------------------------------------------- upload */

/**
 * One upload row, used for every file the product accepts: partner documents,
 * job photos, lead attachments. The states are always the same four — missing,
 * uploading (with percentage), stored, failed — so a partner sees the same
 * thing on a registration form and on a job site.
 */
export function UploadRow({
  title,
  status,
  statusLabel,
  fileName,
  buttonLabel,
  accept,
  capture,
  progress,
  uploading,
  error,
  disabled,
  onSelect,
  children,
  className,
}: {
  title: string;
  /** Product status value (resolved through statusTone) or a tone-free label. */
  status?: string | null;
  statusLabel: string;
  fileName?: string | null;
  buttonLabel: string;
  accept?: string;
  capture?: "user" | "environment";
  progress?: number;
  uploading?: boolean;
  error?: string | null;
  disabled?: boolean;
  onSelect: (file: File) => void;
  children?: ReactNode;
  className?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("rounded-md border border-line bg-surface p-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <Chip status={status ?? "missing"}>{statusLabel}</Chip>
            {fileName ? <span className="data-mono truncate text-xs text-soft">{fileName}</span> : null}
          </p>
        </div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="sr-only"
          accept={accept}
          capture={capture}
          disabled={disabled || uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onSelect(file);
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="touch"
          className="shrink-0"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          aria-describedby={id}
        >
          {buttonLabel}
        </Button>
      </div>

      {uploading ? (
        <div className="mt-3">
          <div
            role="progressbar"
            aria-valuenow={progress ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={statusLabel}
            className="h-1.5 w-full overflow-hidden rounded-full bg-line"
          >
            <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${progress ?? 0}%` }} />
          </div>
          <p className="label-mono mt-1 text-soft" aria-live="polite">
            {statusLabel} {progress ?? 0}%
          </p>
        </div>
      ) : null}

      {error ? <ErrorState className="mt-3" message={error} /> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------------- table */

export function TableShell({
  caption,
  head,
  children,
  className,
}: {
  caption: string;
  head: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("scroll-x rounded-md border border-line bg-surface", className)}>
      <table className="w-full min-w-max border-collapse text-start">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-canvas">{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th scope="col" className={cn("label-mono px-4 py-3 text-start text-soft", className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-top text-sm text-ink", className)} {...props} />;
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("border-b border-line last:border-0 hover:bg-canvas", className)} {...props} />;
}

/* ---------------------------------------------------------------- pagination */

export function Pagination({
  page,
  pageCount,
  onPage,
  labels,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  labels: { previous: string; next: string; status: string };
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={labels.status} className="mt-4 flex items-center justify-between gap-3">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {labels.previous}
      </Button>
      <p aria-live="polite" className="label-mono text-soft">
        {labels.status}
      </p>
      <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        {labels.next}
      </Button>
    </nav>
  );
}

/* -------------------------------------------------------------------- filters */

export function FilterBar({
  label,
  children,
  onReset,
  resetLabel,
}: {
  label: string;
  children: ReactNode;
  onReset?: () => void;
  resetLabel?: string;
}) {
  return (
    <section aria-label={label} className="mt-6 rounded-md border border-line bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      {onReset && resetLabel ? (
        <div className="mt-3 flex justify-end">
          <Button variant="quiet" size="sm" onClick={onReset}>
            {resetLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------ dialog / drawer */

const OverlayContext = createContext<(() => void) | null>(null);
export const useOverlayClose = () => useContext(OverlayContext);

function useDismiss(onClose: () => void, panel: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose, panel]);
}

export function Dialog({
  title,
  onClose,
  children,
  footer,
  closeLabel,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useDismiss(onClose, panel);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panel}
        className="elev-overlay max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-md border border-line bg-surface sm:rounded-md"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="type-h3 text-ink">{title}</h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="-me-2 -mt-1 inline-flex size-11 items-center justify-center rounded-md text-soft hover:text-ink"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="px-5 py-5">
          <OverlayContext.Provider value={onClose}>{children}</OverlayContext.Provider>
        </div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Drawer({
  title,
  onClose,
  children,
  closeLabel,
  header,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel: string;
  header?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useDismiss(onClose, panel);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/45">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panel}
        className="elev-overlay flex h-dvh w-full max-w-xl flex-col overflow-y-auto border-s border-line bg-surface"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4">
          <div>
            <h2 className="type-h3 text-ink">{title}</h2>
            {header}
          </div>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="-me-2 inline-flex size-11 items-center justify-center rounded-md text-soft hover:text-ink"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- shared class aliases
 * Screens used to declare their own `const btn = "..."` — twelve slightly
 * different buttons and five slightly different inputs. These aliases are the
 * only remaining string form, and they resolve to the components above so a
 * change here changes every screen. */
export const btn = buttonVariants({ variant: "outline", size: "sm" });
export const btnPrimary = buttonVariants({ variant: "primary", size: "sm" });
export const btnDanger = buttonVariants({ variant: "danger", size: "sm" });
export const field = cn(controlClass, "mt-1");
export const numField = cn(controlClass, "w-24 px-2 py-1.5");
export const cellClass = "border-b border-line px-3 py-2.5 align-top text-sm text-ink";
export const headClass = "label-mono border-b border-line bg-canvas px-3 py-2.5 text-start text-soft";

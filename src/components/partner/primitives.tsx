import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Input,
  Select,
  Textarea,
  Field as SystemField,
} from "@/components/system";
import { cn } from "@/lib/utils";


export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl text-ink md:text-2xl">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-ink-2">{hint}</p> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  id,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | null | undefined;
  id: string;
  children: (props: {
    id: string;
    "aria-invalid"?: boolean | undefined;
    "aria-describedby"?: string | undefined;
  }) => ReactNode;

}) {
  // Delegates to the shared Field so label/help/error wiring, spacing and the
  // invalid state are identical to every other form in the product. The caller
  // still owns the control id, which the wizard uses for focus management.
  return (
    <SystemField
      className="min-w-0"
      label={label}
      {...(hint ? { help: hint } : {})}
      {...(error ? { error } : {})}
    >
      {(fieldProps) =>
        children({
          ...fieldProps,
          id,
          "aria-describedby": fieldProps["aria-describedby"],
        })
      }
    </SystemField>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  required,
  type = "text",
  inputMode,
  autoComplete,
  validate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  required?: boolean;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url";
  autoComplete?: string;
  validate?: (value: string) => string | null;
}) {
  const id = useId();
  const { t } = useTranslation("partner");
  const [error, setError] = useState<string | null>(null);

  return (
    <Field label={required ? `${label} *` : label} hint={hint} error={error} id={id}>
      {(props) => (
        <Input
          {...props}
          touch
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            if (error) setError(null);
          }}
          onBlur={(event) => {
            const raw = event.target.value.trim();
            if (required && !raw) return setError(t("apply.errors.required"));
            setError(validate ? validate(raw) : null);
          }}
        />
      )}
    </Field>
  );
}

export function NumberField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return <TextField {...props} type="text" inputMode="numeric" />;
}

export function TextAreaField({
  label,
  value,
  onChange,
  hint,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      {(fieldProps) => (
        <Textarea
          {...fieldProps}
          touch
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      {(fieldProps) => (
        <Select
          {...fieldProps}
          touch
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary">
      <input
        type="checkbox"
        className="size-5 accent-[var(--color-primary,#19457C)]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function CardToggle({
  title,
  body,
  selected,
  onToggle,
}: {
  title: string;
  body?: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "min-h-11 w-full rounded-md border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        selected
          ? "border-primary bg-primary/5"
          : "border-line bg-canvas hover:border-primary/60",
      )}
    >
      <span className="block text-sm font-semibold text-ink">{title}</span>
      {body ? <span className="mt-1 block text-sm text-ink-2">{body}</span> : null}
    </button>
  );
}

/** Multi-entry text list (areas served, coverage cities). */
export function TagField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const { t } = useTranslation("partner");

  function commit() {
    const value = draft.trim();
    if (!value) return;
    if (!values.includes(value)) onChange([...values, value]);
    setDraft("");
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="label-mono block text-soft">
        {label}
      </label>
      <div className="mt-1 flex gap-2">
        <Input
          id={id}
          touch
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commit();
            }
          }}
        />
        <Button type="button" variant="ghost" size="touch" className="shrink-0" onClick={commit}>
          {t("apply.add")}
        </Button>
      </div>
      {values.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(values.filter((v) => v !== value))}
                aria-label={`${t("apply.remove")}: ${value}`}
                className="label-mono"
              >
                {value} ×
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function RowCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  const { t } = useTranslation("partner");
  return (
    <div className="rounded-md rounded-2xl bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="label-mono text-primary">{title}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="label-mono">
          {t("apply.remove")}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

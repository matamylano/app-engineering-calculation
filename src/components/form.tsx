import type { ReactNode } from "react";

export const inputClass = "campo";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="tarjeta overflow-hidden">
      <h2 className="border-b border-linea bg-zinc-50/70 px-5 py-3.5 text-base font-semibold tracking-tight sm:px-6 dark:bg-white/[0.02]">
        {title}
      </h2>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

interface FieldProps {
  label: string;
  unit?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "number" | "text";
}

export function Field({ label, unit, value, onChange, placeholder, type = "number" }: FieldProps) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {unit && <span className="sr-only"> ({unit})</span>}
      </span>
      <span className="relative">
        <input
          className={`${inputClass} ${unit ? "pr-16" : ""}`}
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          step="any"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">
            {unit}
          </span>
        )}
      </span>
    </label>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" className="size-4 accent-marca-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-linea first:border-t-0">
      <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{label}</td>
      <td className="py-2 text-right font-mono text-[13px] font-medium tabular-nums">{value}</td>
    </tr>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
      {children}
    </p>
  );
}

/** Número con formato mexicano. */
export const fmt = (n: number, digits = 2) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** "" → NaN, para que la validación del motor lo rechace. */
export const num = (s: string) => (s.trim() === "" ? Number.NaN : Number(s));

/** "" → undefined, para datos opcionales. */
export const optNum = (s: string) => (s.trim() === "" ? undefined : Number(s));

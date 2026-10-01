import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
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
    <label className="grid gap-1 text-sm">
      <span className="font-medium">
        {label} {unit && <span className="font-normal text-zinc-500">({unit})</span>}
      </span>
      <input
        className={inputClass}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        step="any"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
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
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
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
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-800">
      <td className="py-1.5 pr-4 text-zinc-600 dark:text-zinc-400">{label}</td>
      <td className="py-1.5 text-right font-mono">{value}</td>
    </tr>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-red-600 dark:text-red-400">{children}</p>;
}

/** Número con formato mexicano. */
export const fmt = (n: number, digits = 2) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** "" → NaN, para que la validación del motor lo rechace. */
export const num = (s: string) => (s.trim() === "" ? Number.NaN : Number(s));

/** "" → undefined, para datos opcionales. */
export const optNum = (s: string) => (s.trim() === "" ? undefined : Number(s));

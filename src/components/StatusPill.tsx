import type { Availability } from "@/calc/suite";

export default function StatusPill({ status }: { status: Availability }) {
  return status === "disponible" ? (
    <span className="pastilla bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900">
      Disponible
    </span>
  ) : (
    <span className="pastilla bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700">
      Próximamente
    </span>
  );
}

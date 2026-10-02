import type { ReactNode } from "react";
import type { EstadoMemoria } from "@/lib/servidor/tipos";

export const botonPrimario = "btn-primario";
export const botonSecundario = "btn-secundario";

export function Boton({
  children,
  pendiente,
  secundario,
}: {
  children: ReactNode;
  pendiente?: boolean;
  secundario?: boolean;
}) {
  return (
    <button type="submit" disabled={pendiente} className={secundario ? botonSecundario : botonPrimario}>
      {pendiente ? "Un momento…" : children}
    </button>
  );
}

export function Mensajes({ error, aviso }: { error?: string; aviso?: string }) {
  if (error)
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  if (aviso)
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
        {aviso}
      </p>
    );
  return null;
}

const ESTADOS: Record<EstadoMemoria, { texto: string; clase: string }> = {
  borrador: { texto: "Lista para tu firma", clase: "bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700" },
  en_revision: { texto: "En revisión", clase: "bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800" },
  aprobada: { texto: "Aprobada por el ingeniero", clase: "bg-emerald-50 text-emerald-800 ring-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800" },
  rechazada: { texto: "Con cambios pedidos", clase: "bg-red-50 text-red-700 ring-red-300 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800" },
};

export function EstadoPill({ estado }: { estado: EstadoMemoria }) {
  const e = ESTADOS[estado];
  return (
    <span className={`pastilla ${e.clase}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {e.texto}
    </span>
  );
}

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });

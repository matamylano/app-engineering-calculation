import type { ReactNode } from "react";
import type { EstadoMemoria } from "@/lib/servidor/tipos";

export const botonPrimario =
  "inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";
export const botonSecundario =
  "inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-500 disabled:opacity-50 dark:border-zinc-700";

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
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (aviso) return <p className="text-sm text-emerald-700 dark:text-emerald-400">{aviso}</p>;
  return null;
}

const ESTADOS: Record<EstadoMemoria, { texto: string; clase: string }> = {
  borrador: { texto: "Lista para tu firma", clase: "border-zinc-300 text-zinc-700 dark:text-zinc-300" },
  en_revision: { texto: "En revisión", clase: "border-amber-400 text-amber-700 dark:text-amber-400" },
  aprobada: { texto: "Aprobada por el ingeniero", clase: "border-emerald-500 text-emerald-700 dark:text-emerald-400" },
  rechazada: { texto: "Con cambios pedidos", clase: "border-red-400 text-red-700 dark:text-red-400" },
};

export function EstadoPill({ estado }: { estado: EstadoMemoria }) {
  const e = ESTADOS[estado];
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${e.clase}`}>{e.texto}</span>;
}

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });

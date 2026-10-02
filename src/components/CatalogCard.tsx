import Link from "next/link";
import type { Availability } from "@/calc/suite";
import Icono from "./Icono";
import StatusPill from "./StatusPill";

interface Props {
  title: string;
  description: string;
  status: Availability;
  href?: string;
  enValidacion?: boolean;
  /** Nombre del ícono (el slug del paquete o estudio). */
  icono?: string;
}

/** Tarjeta de paquete o estudio. Solo es enlace si está disponible. */
export default function CatalogCard({ title, description, status, href, enValidacion, icono }: Props) {
  const activa = status === "disponible" && href;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl ${
            activa
              ? "bg-marca-50 text-marca-600 ring-1 ring-marca-100 dark:bg-marca-950/60 dark:text-marca-300 dark:ring-marca-900"
              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
          }`}
        >
          <Icono nombre={icono ?? "paquete"} className="size-6" />
        </span>
        <StatusPill status={status} />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
      {enValidacion && status === "disponible" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
          En validación por el ingeniero responsable
        </p>
      )}
      {activa && (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-marca-600 dark:text-marca-300">
          Abrir
          <Icono nombre="flecha" className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      )}
    </>
  );
  if (activa) {
    return (
      <Link
        href={href}
        className="tarjeta group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-marca-300 hover:shadow-elevada dark:hover:border-marca-800"
      >
        {body}
      </Link>
    );
  }
  return (
    <div aria-disabled="true" className="flex h-full flex-col rounded-2xl border border-dashed border-zinc-300 p-5 opacity-75 dark:border-zinc-700">
      {body}
    </div>
  );
}

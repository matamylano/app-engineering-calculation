import Link from "next/link";
import type { Availability } from "@/calc/suite";
import StatusPill from "./StatusPill";

interface Props {
  title: string;
  description: string;
  status: Availability;
  href?: string;
}

/** Tarjeta de paquete o estudio. Solo es enlace si está disponible. */
export default function CatalogCard({ title, description, status, href }: Props) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <StatusPill status={status} />
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </>
  );
  if (status === "disponible" && href) {
    return (
      <Link
        href={href}
        className="block h-full rounded-lg border border-zinc-200 p-5 transition hover:border-zinc-500 dark:border-zinc-800 dark:hover:border-zinc-500"
      >
        {body}
      </Link>
    );
  }
  return (
    <div
      aria-disabled="true"
      className="h-full rounded-lg border border-dashed border-zinc-300 p-5 opacity-70 dark:border-zinc-700"
    >
      {body}
    </div>
  );
}

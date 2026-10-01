import type { Metadata } from "next";
import Link from "next/link";
import { getPackage } from "@/calc/suite";
import CatalogCard from "@/components/CatalogCard";

export const metadata: Metadata = { title: "Ingeniería civil" };

export default function CivilPackage() {
  const civil = getPackage("civil");
  if (!civil) return null;
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Paquetes
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{civil.title}</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Estudios conforme a las NTC de la Ciudad de México (2023) y los manuales de la CFE.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {civil.studies.map((s) => (
          <li key={s.slug}>
            <CatalogCard title={s.title} description={s.description} status={s.status} href={s.href} enValidacion={s.enValidacion} />
          </li>
        ))}
      </ul>
    </main>
  );
}

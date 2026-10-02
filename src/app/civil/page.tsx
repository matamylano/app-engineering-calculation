import type { Metadata } from "next";
import Link from "next/link";
import { getPackage } from "@/calc/suite";
import CatalogCard from "@/components/CatalogCard";

export const metadata: Metadata = { title: "Ingeniería civil" };

export default function CivilPackage() {
  const civil = getPackage("civil");
  if (!civil) return null;
  return (
    <main className="pagina">
      <Link href="/" className="volver">
        ← Paquetes
      </Link>
      <h1 className="titulo mt-3">{civil.title}</h1>
      <p className="intro mt-3">
        Estudios conforme a las NTC de la Ciudad de México (2023) y los manuales de la CFE.
      </p>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {civil.studies.map((s) => (
          <li key={s.slug}>
            <CatalogCard title={s.title} description={s.description} status={s.status} href={s.href} enValidacion={s.enValidacion} icono={s.slug} />
          </li>
        ))}
      </ul>
    </main>
  );
}

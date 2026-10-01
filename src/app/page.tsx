import { PACKAGES } from "@/calc/suite";
import CatalogCard from "@/components/CatalogCard";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Escoge un paquete</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Cada paquete reúne los estudios de una especialidad. Los resultados salen en una memoria de cálculo
        lista para que la firme un ingeniero responsable.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PACKAGES.map((p) => (
          <li key={p.slug}>
            <CatalogCard title={p.title} description={p.description} status={p.status} href={p.href} />
          </li>
        ))}
      </ul>
    </main>
  );
}

import Link from "next/link";
import { PACKAGES } from "@/calc/suite";
import CatalogCard from "@/components/CatalogCard";
import Icono from "@/components/Icono";

const VENTAJAS = [
  { icono: "regla", titulo: "Normas mexicanas", texto: "NTC de la Ciudad de México y manuales de la CFE." },
  { icono: "documento", titulo: "Memoria lista", texto: "Cálculo, gráficas y hoja de firma en PDF." },
  { icono: "firma", titulo: "Firma de un ingeniero", texto: "Fírmala tú o pide la revisión de un ingeniero con registro." },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-linea">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_0%,var(--color-marca-100),transparent_70%)] opacity-70 dark:bg-[radial-gradient(60%_80%_at_80%_0%,var(--color-marca-950),transparent_70%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--linea)_1px,transparent_1px),linear-gradient(to_bottom,var(--linea)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(70%_60%_at_70%_20%,black,transparent)] opacity-60"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="pastilla bg-marca-50 text-marca-700 ring-marca-200 dark:bg-marca-950/60 dark:text-marca-200 dark:ring-marca-900">
            Hecho para ingenieros y arquitectos en México
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Tus cálculos de ingeniería, con <span className="text-marca-600 dark:text-marca-300">memoria lista para firmar</span>
          </h1>
          <p className="intro mt-5 text-lg">
            Captura los datos, revisa los resultados y sus gráficas, y descarga la memoria de cálculo en PDF. Las cuentas
            nuevas traen 5 créditos gratis.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/civil" className="btn-primario px-5 py-3 text-base">
              Empezar con ingeniería civil
              <Icono nombre="flecha" className="size-4" />
            </Link>
            <Link href="/entrar" className="btn-secundario px-5 py-3 text-base">
              Crear cuenta
            </Link>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-3">
            {VENTAJAS.map((v) => (
              <li key={v.titulo} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-superficie text-marca-600 shadow-suave ring-1 ring-linea dark:text-marca-300">
                  <Icono nombre={v.icono} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{v.titulo}</span>
                  <span className="block text-sm text-zinc-600 dark:text-zinc-400">{v.texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pagina">
        <h2 className="text-2xl font-semibold tracking-tight">Escoge un paquete</h2>
        <p className="intro mt-2">Cada paquete reúne los estudios de una especialidad.</p>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PACKAGES.map((p) => (
            <li key={p.slug}>
              <CatalogCard title={p.title} description={p.description} status={p.status} href={p.href} icono={p.slug === "civil" ? "civil" : "paquete"} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

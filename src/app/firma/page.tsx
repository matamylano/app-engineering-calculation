import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EstadoPill, fechaCorta, Mensajes } from "@/components/ui";
import { almacen } from "@/lib/servidor/config";
import { sesionActual } from "@/lib/servidor/sesion";

export const metadata: Metadata = { title: "Panel de firma" };

export default async function Page({ searchParams }: PageProps<"/firma">) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar?siguiente=/firma");
  if (!sesion.firmante) notFound();
  const { aprobada, rechazada } = await searchParams;
  const alm = almacen();
  const [pendientes, rechazadas, perfil] = await Promise.all([
    alm.memoriasPorEstado("en_revision"),
    alm.memoriasPorEstado("rechazada"),
    alm.perfilFirmante(sesion.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Panel de firma</h1>
        <Link href="/firma/perfil" className="text-sm font-medium underline">
          Mi firma y sello
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Memorias que los clientes pagaron para que las revises. Al aprobar una, se congela con tus datos y ya no
        se puede cambiar.
      </p>
      <div className="mt-4">
        <Mensajes
          aviso={
            typeof aprobada === "string"
              ? `Aprobaste la memoria ${aprobada}.`
              : typeof rechazada === "string"
                ? `Le pediste cambios a la memoria ${rechazada}.`
                : undefined
          }
        />
      </div>

      {!perfil?.firmaImagen && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Todavía no subes tu firma. Sin ella, las memorias que apruebes salen con el espacio de firma en blanco.{" "}
          <Link href="/firma/perfil" className="font-medium underline">
            Subirla
          </Link>
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Por revisar ({pendientes.length})</h2>
        {pendientes.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No hay memorias pendientes.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {pendientes.map((m) => (
              <li key={m.folio}>
                <Link href={`/firma/${m.folio}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <span className="grid">
                    <span className="font-mono text-sm font-medium">{m.folio}</span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {m.datos.proyecto.obra || "Sin nombre de obra"} · {m.datos.proyecto.ubicacion || "sin ubicación"} ·
                      esperando desde {fechaCorta(m.actualizadaEn)}
                    </span>
                  </span>
                  <EstadoPill estado={m.estado} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {rechazadas.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Esperando correcciones del cliente ({rechazadas.length})</h2>
          <ul className="mt-2 grid gap-1 text-sm">
            {rechazadas.map((m) => (
              <li key={m.folio}>
                <Link href={`/memorias/${m.folio}`} className="font-mono hover:underline">
                  {m.folio}
                </Link>{" "}
                · {m.datos.proyecto.obra || "Sin nombre de obra"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

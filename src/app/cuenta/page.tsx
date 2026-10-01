import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { accionComprar, accionSalir } from "@/app/acciones";
import { Boton, EstadoPill, fechaCorta, Mensajes } from "@/components/ui";
import { PAQUETES, pesos } from "@/lib/pagos/catalogo";
import { almacen } from "@/lib/servidor/config";
import { sesionActual } from "@/lib/servidor/sesion";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function Page({ searchParams }: PageProps<"/cuenta">) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar?siguiente=/cuenta");
  const { pago, error } = await searchParams;
  const alm = almacen();
  const [saldo, memorias] = await Promise.all([alm.saldo(sesion.id), alm.memoriasDeUsuario(sesion.id)]);
  const base = PAQUETES[0];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Mi cuenta</h1>
        <form action={accionSalir}>
          <button type="submit" className="text-sm text-zinc-500 hover:underline">
            Salir ({sesion.email})
          </button>
        </form>
      </div>

      <div className="mt-4">
        <Mensajes
          error={typeof error === "string" ? error : undefined}
          aviso={pago === "ok" ? "Pago recibido. Tus créditos ya están en tu cuenta." : pago === "cancelado" ? "Cancelaste el pago; no se cobró nada." : undefined}
        />
      </div>

      <section className="mt-6 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Créditos</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Tienes <b className="text-zinc-900 dark:text-zinc-100">{saldo}</b> {saldo === 1 ? "crédito" : "créditos"}.
          Cada memoria generada usa uno; corregirla no cuesta otro.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {PAQUETES.map((p) => {
            const unitario = p.centavos / p.creditos;
            const ahorro = Math.round((1 - unitario / (base.centavos / base.creditos)) * 100);
            return (
              <form key={p.id} action={accionComprar} className="grid gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <input type="hidden" name="tipo" value="creditos" />
                <input type="hidden" name="paquete" value={p.id} />
                <p className="text-2xl font-semibold">{p.creditos} créditos</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {pesos(p.centavos)} · {pesos(unitario)} por memoria{ahorro > 0 && ` · ahorras ${ahorro} %`}
                </p>
                <Boton secundario>Comprar</Boton>
              </form>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Mis memorias</h2>
          <Link href="/civil/suelos" className="text-sm font-medium underline">
            Nuevo estudio de suelos
          </Link>
        </div>
        {memorias.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Todavía no generas ninguna memoria.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
            {memorias.map((m) => (
              <li key={m.folio} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <Link href={`/memorias/${m.folio}`} className="grid">
                  <span className="font-mono text-sm font-medium">{m.folio}</span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {m.datos.proyecto.obra || "Sin nombre de obra"} · {fechaCorta(m.creadaEn)}
                  </span>
                </Link>
                <EstadoPill estado={m.estado} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

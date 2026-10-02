import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { accionComprar, accionSalir } from "@/app/acciones";
import { Boton, EstadoPill, fechaCorta, Mensajes } from "@/components/ui";
import { PAQUETES, pesos } from "@/lib/pagos/catalogo";
import { ESTUDIOS } from "@/lib/estudios/registro";
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
    <main className="pagina">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="titulo">Mi cuenta</h1>
        <form action={accionSalir}>
          <button type="submit" className="volver">
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

      <section className="mt-6 tarjeta p-6">
        <h2 className="text-lg font-semibold">Créditos</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Tienes <b className="text-zinc-900 dark:text-zinc-100">{saldo}</b> {saldo === 1 ? "crédito" : "créditos"}.
          Cada memoria generada usa uno; corregirla no cuesta otro.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {PAQUETES.map((p, i) => {
            const unitario = p.centavos / p.creditos;
            const ahorro = Math.round((1 - unitario / (base.centavos / base.creditos)) * 100);
            const destacado = i === 1;
            return (
              <form
                key={p.id}
                action={accionComprar}
                className={`relative grid gap-2 rounded-2xl border p-5 ${
                  destacado
                    ? "border-marca-300 bg-marca-50/60 ring-2 ring-marca-500/20 dark:border-marca-800 dark:bg-marca-950/30"
                    : "border-linea bg-superficie"
                }`}
              >
                {destacado && (
                  <span className="pastilla absolute -top-2.5 right-4 bg-marca-600 text-white ring-marca-600">El más elegido</span>
                )}
                <input type="hidden" name="tipo" value="creditos" />
                <input type="hidden" name="paquete" value={p.id} />
                <p className="text-2xl font-semibold">{p.creditos} créditos</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {pesos(p.centavos)} · {pesos(unitario)} por memoria{ahorro > 0 && ` · ahorras ${ahorro} %`}
                </p>
                <Boton secundario={!destacado}>Comprar</Boton>
              </form>
            );
          })}
        </div>
      </section>

      <section className="mt-6 tarjeta p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Mis memorias</h2>
          <Link href="/civil" className="enlace text-sm">
            Nuevo estudio
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
                    {ESTUDIOS[m.estudio].titulo} · {m.datos.proyecto.obra || "Sin nombre de obra"} · {fechaCorta(m.creadaEn)}
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

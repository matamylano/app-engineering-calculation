import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { accionPagoDemo } from "@/app/acciones";
import { Boton } from "@/components/ui";
import { modoDemo, stripeConfigurado } from "@/lib/servidor/config";
import { descripcionCompra } from "@/lib/servidor/pagos";
import { sesionActual } from "@/lib/servidor/sesion";

export const metadata: Metadata = { title: "Pago de demostración" };

/** Sustituye al Checkout de Stripe mientras la app corre en modo demostración. */
export default async function Page({ searchParams }: PageProps<"/pagos/demo">) {
  if (!modoDemo() || stripeConfigurado()) notFound();
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");
  const q = await searchParams;
  const tipo = q.tipo === "firma" ? "firma" : "creditos";
  const paquete = typeof q.paquete === "string" ? q.paquete : "";
  const folio = typeof q.folio === "string" ? q.folio : "";
  const compra = descripcionCompra(tipo === "firma" ? { tipo, folio } : { tipo, paquete });
  if (!compra) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
      <p className="text-xs uppercase tracking-wide text-amber-700">Modo demostración · no se cobra</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Confirmar pago</h1>
      <p className="mt-4 text-sm">{compra.texto}</p>
      <p className="mt-1 text-3xl font-semibold">{compra.precio}</p>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Con Stripe configurado, aquí se abre su página de pago con tarjeta u OXXO.
      </p>
      <form action={accionPagoDemo} className="mt-6 flex items-center gap-4">
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="paquete" value={paquete} />
        <input type="hidden" name="folio" value={folio} />
        <input type="hidden" name="centavos" value={compra.centavos} />
        <Boton>Simular pago</Boton>
        <Link href={tipo === "firma" ? `/memorias/${folio}` : "/cuenta"} className="text-sm text-zinc-500 hover:underline">
          Cancelar
        </Link>
      </form>
    </main>
  );
}

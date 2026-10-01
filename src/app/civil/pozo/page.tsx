import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosPozo } from "@/lib/servidor/tipos";
import DisenoPozo from "./DisenoPozo";

export const metadata: Metadata = { title: "Pozo de agua" };

export default async function Page({
  searchParams,
}: PageProps<"/civil/pozo">) {
  const { folio } = await searchParams;
  const sesion = await sesionActual();
  const alm = almacen();
  const creditos = sesion ? await alm.saldo(sesion.id) : null;

  // ?folio=… corrige una memoria propia que aún se puede cambiar.
  let editar: { folio: string; datos: DatosPozo } | undefined;
  if (typeof folio === "string") {
    const m =
      sesion && FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
    if (
      !m ||
      m.estudio !== "pozo" ||
      m.usuarioId !== sesion?.id ||
      m.estado === "aprobada" ||
      m.estado === "en_revision"
    ) {
      notFound();
    }
    editar = { folio, datos: m.datos as DatosPozo };
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link
        href={editar ? `/memorias/${editar.folio}` : "/civil"}
        className="text-sm text-zinc-500 hover:underline"
      >
        ← {editar ? `Memoria ${editar.folio}` : "Ingeniería civil"}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Pozo de agua
      </h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Con las lecturas de la prueba de bombeo se obtiene la transmisividad del acuífero por el método de
        Cooper-Jacob y el abatimiento con el gasto que quieres sacar. Da el diámetro del ademe, la longitud mínima de
        rejilla, la profundidad de la bomba, la columna y la potencia.
      </p>
      <AvisoValidacion estudio="pozo" />
      <DisenoPozo
        folio={editar?.folio}
        inicial={editar?.datos.formulario}
        creditos={creditos}
      />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosPozo } from "@/lib/servidor/tipos";
import { leerFormularioPozo } from "@/lib/estudios/pozo";
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
    <main className="pagina">
      <Link
        href={editar ? `/memorias/${editar.folio}` : "/civil"}
        className="volver"
      >
        ← {editar ? `Memoria ${editar.folio}` : "Ingeniería civil"}
      </Link>
      <h1 className="titulo mt-3">
        Pozo de agua
      </h1>
      <p className="intro mt-3">
        Con las lecturas de la prueba de bombeo se obtiene la transmisividad del acuífero por el método de
        Cooper-Jacob y el abatimiento con el gasto que quieres sacar. Da el diámetro del ademe, la longitud mínima de
        rejilla, la profundidad de la bomba, la columna y la potencia, además del consumo y costo de energía, el
        volumen extraído contra el título de concesión y la curva del sistema.
      </p>
      <AvisoValidacion estudio="pozo" />
      <DisenoPozo
        folio={editar?.folio}
        // Las memorias anteriores no traen los campos nuevos: se completan vacíos.
        inicial={editar ? (leerFormularioPozo(editar.datos.formulario) ?? undefined) : undefined}
        creditos={creditos}
      />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosFosa } from "@/lib/servidor/tipos";
import { CAMPOS_PRELLENAR_FOSA, FORMULARIO_FOSA_INICIAL } from "@/lib/estudios/fosa";
import { prellenar } from "@/lib/estudios/prellenar";
import DisenoFosa from "./DisenoFosa";

export const metadata: Metadata = { title: "Fosa séptica" };

export default async function Page({
  searchParams,
}: PageProps<"/civil/fosa">) {
  const params = await searchParams;
  const { folio } = params;
  const sesion = await sesionActual();
  const alm = almacen();
  const creditos = sesion ? await alm.saldo(sesion.id) : null;

  // ?folio=… corrige una memoria propia que aún se puede cambiar.
  let editar: { folio: string; datos: DatosFosa } | undefined;
  if (typeof folio === "string") {
    const m =
      sesion && FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
    if (
      !m ||
      m.estudio !== "fosa" ||
      m.usuarioId !== sesion?.id ||
      m.estado === "aprobada" ||
      m.estado === "en_revision"
    ) {
      notFound();
    }
    editar = { folio, datos: m.datos as DatosFosa };
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
        Fosa séptica
      </h1>
      <p className="intro mt-3">
        Fosa séptica de una vivienda sin drenaje municipal: volumen, medidas, biodigestor equivalente y campo
        de infiltración para el agua tratada.
      </p>
      <AvisoValidacion estudio="fosa" />
      <DisenoFosa
        folio={editar?.folio}
        inicial={editar?.datos.formulario ?? prellenar(FORMULARIO_FOSA_INICIAL, params, CAMPOS_PRELLENAR_FOSA)}
        creditos={creditos}
      />
    </main>
  );
}

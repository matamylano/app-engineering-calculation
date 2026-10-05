import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosPluvial } from "@/lib/servidor/tipos";
import { CAMPOS_PRELLENAR_PLUVIAL, FORMULARIO_PLUVIAL_INICIAL } from "@/lib/estudios/pluvial";
import { prellenar } from "@/lib/estudios/prellenar";
import DisenoPluvial from "./DisenoPluvial";

export const metadata: Metadata = { title: "Drenaje pluvial" };

export default async function Page({
  searchParams,
}: PageProps<"/civil/pluvial">) {
  const params = await searchParams;
  const { folio } = params;
  const sesion = await sesionActual();
  const alm = almacen();
  const creditos = sesion ? await alm.saldo(sesion.id) : null;

  // ?folio=… corrige una memoria propia que aún se puede cambiar.
  let editar: { folio: string; datos: DatosPluvial } | undefined;
  if (typeof folio === "string") {
    const m =
      sesion && FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
    if (
      !m ||
      m.estudio !== "pluvial" ||
      m.usuarioId !== sesion?.id ||
      m.estado === "aprobada" ||
      m.estado === "en_revision"
    ) {
      notFound();
    }
    editar = { folio, datos: m.datos as DatosPluvial };
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
        Drenaje pluvial
      </h1>
      <p className="intro mt-3">
        Gasto de lluvia de tu predio por el método racional, diámetro de la tubería pluvial y, si el agua se
        infiltra en el terreno, cuántos pozos de absorción necesitas.
      </p>
      <AvisoValidacion estudio="pluvial" />
      <DisenoPluvial
        folio={editar?.folio}
        inicial={editar?.datos.formulario ?? prellenar(FORMULARIO_PLUVIAL_INICIAL, params, CAMPOS_PRELLENAR_PLUVIAL)}
        creditos={creditos}
      />
    </main>
  );
}

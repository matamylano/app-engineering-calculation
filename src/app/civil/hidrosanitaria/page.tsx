import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosHidrosanitaria } from "@/lib/servidor/tipos";
import { leerFormularioHidrosanitaria } from "@/lib/estudios/hidrosanitaria";
import DisenoHidrosanitaria from "./DisenoHidrosanitaria";

export const metadata: Metadata = { title: "Instalación hidráulica y sanitaria" };

export default async function Page({
  searchParams,
}: PageProps<"/civil/hidrosanitaria">) {
  const { folio } = await searchParams;
  const sesion = await sesionActual();
  const alm = almacen();
  const creditos = sesion ? await alm.saldo(sesion.id) : null;

  // ?folio=… corrige una memoria propia que aún se puede cambiar.
  let editar: { folio: string; datos: DatosHidrosanitaria } | undefined;
  if (typeof folio === "string") {
    const m =
      sesion && FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
    if (
      !m ||
      m.estudio !== "hidrosanitaria" ||
      m.usuarioId !== sesion?.id ||
      m.estado === "aprobada" ||
      m.estado === "en_revision"
    ) {
      notFound();
    }
    editar = { folio, datos: m.datos as DatosHidrosanitaria };
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
        Instalación hidráulica y sanitaria
      </h1>
      <p className="intro mt-3">
        Instalación de una casa: demanda diaria, cisterna y tinaco (con reserva para zonas con tandeo), gasto
        probable por el método de Hunter, diámetro de la alimentación desde el tinaco con su presión, bomba de la
        cisterna al tinaco, calentador de agua, diámetros del drenaje y lista de equipos y piezas para cotizar.
      </p>
      <AvisoValidacion estudio="hidrosanitaria" />
      <DisenoHidrosanitaria
        folio={editar?.folio}
        // Las memorias anteriores no traen los campos nuevos: se completan vacíos.
        inicial={editar ? (leerFormularioHidrosanitaria(editar.datos.formulario) ?? undefined) : undefined}
        creditos={creditos}
      />
    </main>
  );
}

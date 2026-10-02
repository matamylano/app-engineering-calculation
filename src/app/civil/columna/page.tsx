import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosColumna } from "@/lib/servidor/tipos";
import {
  CAMPOS_PRELLENAR_COLUMNA,
  completarFormularioColumna,
  FORMULARIO_COLUMNA_INICIAL,
} from "@/lib/estudios/columna";
import { prellenar } from "@/lib/estudios/prellenar";
import DisenoColumna from "./DisenoColumna";

export const metadata: Metadata = { title: "Columna de concreto" };

export default async function Page({
  searchParams,
}: PageProps<"/civil/columna">) {
  const params = await searchParams;
  const { folio } = params;
  const sesion = await sesionActual();
  const alm = almacen();
  const creditos = sesion ? await alm.saldo(sesion.id) : null;

  // ?folio=… corrige una memoria propia que aún se puede cambiar.
  let editar: { folio: string; datos: DatosColumna } | undefined;
  if (typeof folio === "string") {
    const m =
      sesion && FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
    if (
      !m ||
      m.estudio !== "columna" ||
      m.usuarioId !== sesion?.id ||
      m.estado === "aprobada" ||
      m.estado === "en_revision"
    ) {
      notFound();
    }
    editar = { folio, datos: m.datos as DatosColumna };
  }

  // Sin folio, acepta datos por la URL (?carga=…&momento=…&b=…&h=…&altura=…).
  const inicial = editar
    ? completarFormularioColumna(editar.datos.formulario)
    : prellenar(FORMULARIO_COLUMNA_INICIAL, params, CAMPOS_PRELLENAR_COLUMNA);

  return (
    <main className="pagina">
      <Link
        href={editar ? `/memorias/${editar.folio}` : "/civil"}
        className="volver"
      >
        ← {editar ? `Memoria ${editar.folio}` : "Ingeniería civil"}
      </Link>
      <h1 className="titulo mt-3">
        Columna de concreto
      </h1>
      <p className="intro mt-3">
        Columna rectangular con estribos en un marco sin desplazamiento lateral, según las NTC de Concreto: carga
        axial y momento en una o en dos direcciones (Bresler), excentricidad mínima, efectos de esbeltez, acero
        longitudinal, estribos y cuantificación con costo. La carga última sale de tu bajada de cargas.
      </p>
      <AvisoValidacion estudio="columna" />
      <DisenoColumna
        folio={editar?.folio}
        inicial={inicial}
        creditos={creditos}
      />
    </main>
  );
}

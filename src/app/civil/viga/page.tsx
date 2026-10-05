import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosViga } from "@/lib/servidor/tipos";
import { CAMPOS_PRELLENAR_VIGA, FORMULARIO_VIGA_INICIAL } from "@/lib/estudios/viga";
import { prellenar } from "@/lib/estudios/prellenar";
import DisenoViga from "./DisenoViga";

export const metadata: Metadata = { title: "Viga de concreto" };

export default async function Page({
  searchParams,
}: PageProps<"/civil/viga">) {
  const params = await searchParams;
  const { folio } = params;
  const sesion = await sesionActual();
  const alm = almacen();
  const creditos = sesion ? await alm.saldo(sesion.id) : null;

  // ?folio=… corrige una memoria propia que aún se puede cambiar.
  let editar: { folio: string; datos: DatosViga } | undefined;
  if (typeof folio === "string") {
    const m =
      sesion && FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
    if (
      !m ||
      m.estudio !== "viga" ||
      m.usuarioId !== sesion?.id ||
      m.estado === "aprobada" ||
      m.estado === "en_revision"
    ) {
      notFound();
    }
    editar = { folio, datos: m.datos as DatosViga };
  }

  // Valores por la URL (por ejemplo desde la losa o la bajada de cargas); ?folio= manda.
  const prellenado = editar ? undefined : prellenar(FORMULARIO_VIGA_INICIAL, params, CAMPOS_PRELLENAR_VIGA);

  return (
    <main className="pagina">
      <Link
        href={editar ? `/memorias/${editar.folio}` : "/civil"}
        className="volver"
      >
        ← {editar ? `Memoria ${editar.folio}` : "Ingeniería civil"}
      </Link>
      <h1 className="titulo mt-3">
        Viga de concreto
      </h1>
      <p className="intro mt-3">
        Viga rectangular con carga uniforme, según las NTC de Concreto: momentos y cortante por el tipo de apoyo,
        acero arriba y abajo, y estribos. El peso propio se suma solo.
      </p>
      <AvisoValidacion estudio="viga" />
      <DisenoViga
        folio={editar?.folio}
        inicial={editar?.datos.formulario ?? prellenado}
        creditos={creditos}
      />
    </main>
  );
}

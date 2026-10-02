import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosLosa } from "@/lib/servidor/tipos";
import { CAMPOS_PRELLENAR_LOSA, FORMULARIO_LOSA_INICIAL } from "@/lib/estudios/losa";
import { prellenar } from "@/lib/estudios/prellenar";
import DisenoLosa from "./DisenoLosa";

export const metadata: Metadata = { title: "Losa maciza en una dirección" };

export default async function Page({
  searchParams,
}: PageProps<"/civil/losa">) {
  const params = await searchParams;
  const { folio } = params;
  const sesion = await sesionActual();
  const alm = almacen();
  const creditos = sesion ? await alm.saldo(sesion.id) : null;

  // ?folio=… corrige una memoria propia que aún se puede cambiar.
  let editar: { folio: string; datos: DatosLosa } | undefined;
  if (typeof folio === "string") {
    const m =
      sesion && FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
    if (
      !m ||
      m.estudio !== "losa" ||
      m.usuarioId !== sesion?.id ||
      m.estado === "aprobada" ||
      m.estado === "en_revision"
    ) {
      notFound();
    }
    editar = { folio, datos: m.datos as DatosLosa };
  }

  // Valores por la URL; ?folio= manda. Si llega la carga viva, el destino queda como "otro".
  let prellenado = editar ? undefined : prellenar(FORMULARIO_LOSA_INICIAL, params, CAMPOS_PRELLENAR_LOSA);
  if (prellenado && prellenado.viva !== FORMULARIO_LOSA_INICIAL.viva) prellenado = { ...prellenado, uso: "" };

  return (
    <main className="pagina">
      <Link
        href={editar ? `/memorias/${editar.folio}` : "/civil"}
        className="volver"
      >
        ← {editar ? `Memoria ${editar.folio}` : "Ingeniería civil"}
      </Link>
      <h1 className="titulo mt-3">
        Losa maciza en una dirección
      </h1>
      <p className="intro mt-3">
        Losa maciza de concreto que trabaja en una dirección (apoyada en dos bordes, o con el lado largo de al
        menos el doble del corto), diseñada como franja de 1 m según las NTC de Concreto: acero por metro arriba y
        abajo, acero por temperatura, cortante y espesor mínimo.
      </p>
      <AvisoValidacion estudio="losa" />
      <DisenoLosa
        folio={editar?.folio}
        inicial={editar?.datos.formulario ?? prellenado}
        creditos={creditos}
      />
    </main>
  );
}

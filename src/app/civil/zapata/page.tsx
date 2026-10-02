import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosZapata } from "@/lib/servidor/tipos";
import DisenoZapata from "./DisenoZapata";

export const metadata: Metadata = { title: "Zapata aislada" };

export default async function Page({
  searchParams,
}: PageProps<"/civil/zapata">) {
  const { folio } = await searchParams;
  const sesion = await sesionActual();
  const alm = almacen();
  const creditos = sesion ? await alm.saldo(sesion.id) : null;

  // ?folio=… corrige una memoria propia que aún se puede cambiar.
  let editar: { folio: string; datos: DatosZapata } | undefined;
  if (typeof folio === "string") {
    const m =
      sesion && FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
    if (
      !m ||
      m.estudio !== "zapata" ||
      m.usuarioId !== sesion?.id ||
      m.estado === "aprobada" ||
      m.estado === "en_revision"
    ) {
      notFound();
    }
    editar = { folio, datos: m.datos as DatosZapata };
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
        Zapata aislada
      </h1>
      <p className="intro mt-3">
        Zapata cuadrada bajo una columna, de concreto reforzado, según las NTC
        de Concreto: tamaño por la capacidad del suelo, revisión de penetración
        y de cortante como viga ancha, y armado por flexión. Toma las cargas de
        tu bajada de cargas.
      </p>
      <AvisoValidacion estudio="zapata" />
      <DisenoZapata
        folio={editar?.folio}
        inicial={editar?.datos.formulario}
        creditos={creditos}
      />
    </main>
  );
}

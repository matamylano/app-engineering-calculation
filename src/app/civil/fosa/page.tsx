import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosFosa } from "@/lib/servidor/tipos";
import DisenoFosa from "./DisenoFosa";

export const metadata: Metadata = { title: "Fosa séptica" };

export default async function Page({
  searchParams,
}: PageProps<"/civil/fosa">) {
  const { folio } = await searchParams;
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link
        href={editar ? `/memorias/${editar.folio}` : "/civil"}
        className="text-sm text-zinc-500 hover:underline"
      >
        ← {editar ? `Memoria ${editar.folio}` : "Ingeniería civil"}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Fosa séptica
      </h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Fosa séptica de una vivienda sin drenaje municipal: volumen, medidas, biodigestor equivalente y campo
        de infiltración para el agua tratada.
      </p>
      <AvisoValidacion estudio="fosa" />
      <DisenoFosa
        folio={editar?.folio}
        inicial={editar?.datos.formulario}
        creditos={creditos}
      />
    </main>
  );
}

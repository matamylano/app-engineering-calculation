import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosSuelos } from "@/lib/servidor/tipos";
import SoilStudy from "./SoilStudy";

export const metadata: Metadata = { title: "Estudio de mecánica de suelos" };

export default async function Page({ searchParams }: PageProps<"/civil/suelos">) {
  const { folio } = await searchParams;
  const sesion = await sesionActual();
  const alm = almacen();
  const creditos = sesion ? await alm.saldo(sesion.id) : null;

  // ?folio=… corrige una memoria propia que aún se puede cambiar.
  let editar: { folio: string; inicial: Awaited<ReturnType<typeof alm.memoria>> } | undefined;
  if (typeof folio === "string") {
    const m = sesion && FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
    if (!m || m.estudio !== "suelos" || m.usuarioId !== sesion?.id || m.estado === "aprobada" || m.estado === "en_revision") notFound();
    editar = { folio, inicial: m };
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="no-print">
        <Link href={editar ? `/memorias/${editar.folio}` : "/civil"} className="text-sm text-zinc-500 hover:underline">
          ← {editar ? `Memoria ${editar.folio}` : "Ingeniería civil"}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Estudio de mecánica de suelos</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Captura los resultados de laboratorio y de campo. Los cálculos se actualizan al escribir; al final genera
          la memoria lista para firma.
        </p>
        <AvisoValidacion estudio="suelos" />
      </div>
      <SoilStudy folio={editar?.folio} inicial={(editar?.inicial?.datos as DatosSuelos | undefined)?.formulario} creditos={creditos} />
    </main>
  );
}

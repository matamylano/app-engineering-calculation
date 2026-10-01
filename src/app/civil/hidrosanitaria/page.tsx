import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosHidrosanitaria } from "@/lib/servidor/tipos";
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link
        href={editar ? `/memorias/${editar.folio}` : "/civil"}
        className="text-sm text-zinc-500 hover:underline"
      >
        ← {editar ? `Memoria ${editar.folio}` : "Ingeniería civil"}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Instalación hidráulica y sanitaria
      </h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Instalación de una casa: demanda diaria, cisterna y tinaco, gasto probable por el método de Hunter,
        diámetro de la alimentación desde el tinaco con su presión, bomba de la cisterna al tinaco y diámetros del
        drenaje.
      </p>
      <AvisoValidacion estudio="hidrosanitaria" />
      <DisenoHidrosanitaria
        folio={editar?.folio}
        inicial={editar?.datos.formulario}
        creditos={creditos}
      />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import AvisoValidacion from "@/components/AvisoValidacion";
import { notFound } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import type { DatosLosa } from "@/lib/servidor/tipos";
import DisenoLosa from "./DisenoLosa";

export const metadata: Metadata = { title: "Losa maciza en una dirección" };

export default async function Page({
  searchParams,
}: PageProps<"/civil/losa">) {
  const { folio } = await searchParams;
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

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link
        href={editar ? `/memorias/${editar.folio}` : "/civil"}
        className="text-sm text-zinc-500 hover:underline"
      >
        ← {editar ? `Memoria ${editar.folio}` : "Ingeniería civil"}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Losa maciza en una dirección
      </h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Losa maciza de concreto que trabaja en una dirección (apoyada en dos bordes, o con el lado largo de al
        menos el doble del corto), diseñada como franja de 1 m según las NTC de Concreto: acero por metro arriba y
        abajo, acero por temperatura, cortante y espesor mínimo.
      </p>
      <AvisoValidacion estudio="losa" />
      <DisenoLosa
        folio={editar?.folio}
        inicial={editar?.datos.formulario}
        creditos={creditos}
      />
    </main>
  );
}

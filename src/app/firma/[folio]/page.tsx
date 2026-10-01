import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Memoria, { snapshotDe } from "@/app/civil/suelos/Memoria";
import { EstadoPill } from "@/components/ui";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import Revision from "./Revision";

export async function generateMetadata({ params }: PageProps<"/firma/[folio]">): Promise<Metadata> {
  return { title: `Revisar ${(await params).folio}` };
}

export default async function Page({ params }: PageProps<"/firma/[folio]">) {
  const { folio } = await params;
  const sesion = await sesionActual();
  if (!sesion) redirect(`/entrar?siguiente=${encodeURIComponent(`/firma/${folio}`)}`);
  if (!sesion.firmante) notFound();
  const m = FOLIO_VALIDO.test(folio) ? await almacen().memoria(folio) : null;
  if (!m) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="no-print grid gap-4">
        <Link href="/firma" className="text-sm text-zinc-500 hover:underline">
          ← Panel de firma
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{m.folio}</h1>
          <EstadoPill estado={m.estado} />
        </div>
        {m.estado === "en_revision" ? (
          <Revision folio={m.folio} />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Esta memoria no está en revisión.</p>
        )}
      </div>
      <div className="mt-6">
        <Memoria snapshot={snapshotDe(m)} />
      </div>
    </main>
  );
}

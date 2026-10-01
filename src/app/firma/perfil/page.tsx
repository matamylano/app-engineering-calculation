import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { almacen } from "@/lib/servidor/config";
import { sesionActual } from "@/lib/servidor/sesion";
import FormPerfil from "./FormPerfil";

export const metadata: Metadata = { title: "Mi firma y sello" };

export default async function Page() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar?siguiente=/firma/perfil");
  if (!sesion.firmante) notFound();
  const perfil = await almacen().perfilFirmante(sesion.id);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link href="/firma" className="text-sm text-zinc-500 hover:underline">
        ← Panel de firma
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Mi firma y sello</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Se ponen solos en cada memoria que apruebes, junto con tu nombre, cédula y registro. Las memorias que ya
        aprobaste no cambian.
      </p>
      <FormPerfil perfil={perfil} />
    </main>
  );
}

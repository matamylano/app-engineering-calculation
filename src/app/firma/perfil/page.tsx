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
    <main className="pagina">
      <Link href="/firma" className="volver">
        ← Panel de firma
      </Link>
      <h1 className="titulo mt-3">Mi firma y sello</h1>
      <p className="intro mt-3">
        Se ponen solos en cada memoria que apruebes, junto con tu nombre, cédula y registro. Las memorias que ya
        aprobaste no cambian.
      </p>
      <FormPerfil perfil={perfil} />
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FREE_CREDITS } from "@/lib/creditos";
import { sesionActual } from "@/lib/servidor/sesion";
import FormEntrar from "./FormEntrar";

export const metadata: Metadata = { title: "Entrar" };

export default async function Page({ searchParams }: PageProps<"/entrar">) {
  const { siguiente } = await searchParams;
  const destino = typeof siguiente === "string" && siguiente.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/cuenta";
  if (await sesionActual()) redirect(destino);

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Entra con tu correo</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Te mandamos un código, sin contraseñas. Las cuentas nuevas traen {FREE_CREDITS} memorias gratis.
      </p>
      <FormEntrar siguiente={destino} />
    </main>
  );
}

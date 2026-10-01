import type { Metadata } from "next";
import Link from "next/link";
import BearingCapacityForm from "./BearingCapacityForm";

export const metadata: Metadata = {
  title: "Capacidad de carga de suelos",
};

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Módulos
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Capacidad de carga de suelos</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Método de Terzaghi para cimentaciones superficiales. Unidades: kPa, kN/m³, m.
      </p>
      <BearingCapacityForm />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import SoilStudy from "./SoilStudy";

export const metadata: Metadata = { title: "Estudio de mecánica de suelos" };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="no-print">
        <Link href="/civil" className="text-sm text-zinc-500 hover:underline">
          ← Ingeniería civil
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Estudio de mecánica de suelos</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Captura los resultados de laboratorio y de campo. Los cálculos se actualizan al escribir; al final genera
          la memoria lista para firma.
        </p>
      </div>
      <SoilStudy />
    </main>
  );
}

import Link from "next/link";
import { CALC_MODULES } from "@/calc/modules";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Cálculos de ingeniería civil</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Elige un módulo para empezar. Todos los cálculos usan unidades SI.
      </p>
      <ul className="mt-8 grid gap-4">
        {CALC_MODULES.map((m) => (
          <li key={m.slug}>
            <Link
              href={m.href}
              className="block rounded-lg border border-zinc-200 p-5 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{m.area}</span>
              <h2 className="mt-1 text-lg font-semibold">{m.title}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{m.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

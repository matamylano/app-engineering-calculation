import Link from "next/link";
import { almacen, modoDemo } from "@/lib/servidor/config";
import { sesionActual } from "@/lib/servidor/sesion";

export default async function Cabecera() {
  const sesion = await sesionActual();
  const saldo = sesion ? await almacen().saldo(sesion.id) : null;

  return (
    <header className="no-print border-b border-zinc-200 dark:border-zinc-800">
      {modoDemo() && (
        <p className="bg-amber-100 px-4 py-1 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Modo demostración: las cuentas y memorias no se guardan y los pagos son simulados.
        </p>
      )}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Suite de Ingeniería
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {sesion?.firmante && (
            <Link href="/firma" className="hover:underline">
              Panel de firma
            </Link>
          )}
          {sesion ? (
            <Link
              href="/cuenta"
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300"
              title="Cada memoria generada usa un crédito"
            >
              {saldo} {saldo === 1 ? "crédito" : "créditos"} · Mi cuenta
            </Link>
          ) : (
            <Link href="/entrar" className="font-medium hover:underline">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

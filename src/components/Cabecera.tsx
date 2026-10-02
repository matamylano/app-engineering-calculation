import Link from "next/link";
import { almacen, modoDemo } from "@/lib/servidor/config";
import { sesionActual } from "@/lib/servidor/sesion";
import Icono from "./Icono";

const enlaceNav =
  "rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white";

export default async function Cabecera() {
  const sesion = await sesionActual();
  const saldo = sesion ? await almacen().saldo(sesion.id) : null;

  return (
    <header className="no-print sticky top-0 z-30 border-b border-linea bg-superficie/80 backdrop-blur-xl">
      {modoDemo() && (
        <p className="bg-amber-400 px-4 py-1 text-center text-xs font-medium text-amber-950">
          Modo demostración: las cuentas y memorias no se guardan y los pagos son simulados.
        </p>
      )}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-marca-500 to-marca-800 text-white shadow-sm shadow-marca-900/30">
            <Icono nombre="regla" className="size-5" />
          </span>
          <span className="hidden leading-tight sm:block">
            Suite de Ingeniería
            <span className="block text-[11px] font-medium text-zinc-500">Memorias de cálculo</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/civil" className={enlaceNav}>
            Estudios
          </Link>
          {sesion?.firmante && (
            <Link href="/firma" className={enlaceNav}>
              Firma
            </Link>
          )}
          {sesion ? (
            <Link
              href="/cuenta"
              className="ml-1 inline-flex items-center gap-2 rounded-xl border border-linea bg-superficie py-1.5 pr-3 pl-1.5 text-sm font-medium shadow-xs transition hover:border-marca-300"
              title="Cada memoria generada usa un crédito"
            >
              <span className="grid min-w-7 place-items-center rounded-lg bg-marca-600 px-1.5 py-0.5 text-xs font-bold text-white tabular-nums">
                {saldo}
              </span>
              <span className="hidden sm:inline">{saldo === 1 ? "crédito" : "créditos"} ·</span> Mi cuenta
            </Link>
          ) : (
            <Link href="/entrar" className="btn-primario ml-1 py-2">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

"use client";

import { useState, type ReactNode } from "react";

/**
 * El procedimiento de la memoria con los valores que el usuario va
 * capturando. Es una vista previa: sin folio ni hoja de firma, y no se imprime.
 * Se dibuja solo al abrirla, para no cargar la página de inicio.
 */
export default function PasoAPaso({ children }: { children: () => ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <details
      className="tarjeta group no-print overflow-hidden"
      onToggle={(e) => setAbierto(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-base font-semibold tracking-tight">
            Ver el cálculo paso a paso
          </span>
          <span className="block text-sm text-zinc-600 dark:text-zinc-400">
            Las fórmulas con tus valores, como saldrán en la memoria. Se
            actualiza al cambiar cualquier dato.
          </span>
        </span>
        <span
          className="text-zinc-400 transition group-open:rotate-180"
          aria-hidden
        >
          ▾
        </span>
      </summary>
      <div className="vista-previa relative border-t border-linea p-3 sm:p-5">
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Vista previa sin folio ni firma. Genera la memoria para obtener el
          documento oficial.
        </p>
        {abierto && children()}
      </div>
    </details>
  );
}

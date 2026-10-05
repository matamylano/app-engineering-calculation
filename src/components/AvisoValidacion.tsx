import { ESTUDIOS } from "@/lib/estudios/registro";
import type { Estudio } from "@/lib/servidor/tipos";

/** Aviso en pantalla (no se imprime) mientras las fórmulas del estudio no estén validadas. */
export default function AvisoValidacion({ estudio }: { estudio: Estudio }) {
  if (!ESTUDIOS[estudio].enValidacion) return null;
  return (
    <p className="no-print mt-5 flex max-w-3xl gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
      <span>
        Este cálculo está en validación: el ingeniero responsable todavía revisa
        sus fórmulas. Úsalo como apoyo y haz que un ingeniero revise la memoria
        antes de firmarla.
      </span>
    </p>
  );
}

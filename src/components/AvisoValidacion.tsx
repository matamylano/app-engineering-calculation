import { ESTUDIOS } from "@/lib/estudios/registro";
import type { Estudio } from "@/lib/servidor/tipos";

/** Aviso en pantalla (no se imprime) mientras las fórmulas del estudio no estén validadas. */
export default function AvisoValidacion({ estudio }: { estudio: Estudio }) {
  if (!ESTUDIOS[estudio].enValidacion) return null;
  return (
    <p className="no-print mt-4 max-w-2xl rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      Este cálculo está en validación: el ingeniero responsable todavía revisa
      sus fórmulas. Úsalo como apoyo y haz que un ingeniero revise la memoria
      antes de firmarla.
    </p>
  );
}

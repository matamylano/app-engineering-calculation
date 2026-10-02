import { fmt } from "@/components/form";
import {
  cumpleRevision,
  usoRevision,
  type Ejemplo,
  type Revision,
} from "@/lib/revision/tipos";

/** Sello grande de cumple o no cumple. */
export function Sello({ cumple, chico }: { cumple: boolean; chico?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset ${
        chico ? "px-2.5 py-0.5 text-xs" : "px-3.5 py-1 text-sm"
      } ${
        cumple
          ? "bg-emerald-50 text-emerald-800 ring-emerald-600/25 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "bg-red-50 text-red-700 ring-red-600/25 dark:bg-red-950/50 dark:text-red-300"
      }`}
    >
      <span aria-hidden>{cumple ? "✓" : "✗"}</span>
      {cumple ? "Cumple" : "No cumple"}
    </span>
  );
}

/**
 * Tabla de revisiones con barra de uso: cada fila compara lo que actúa con
 * lo que se permite y se pinta en verde o rojo al momento.
 */
export function PanelRevision({
  revisiones,
  titulo = "Revisión",
}: {
  revisiones: Revision[];
  titulo?: string;
}) {
  if (revisiones.length === 0) return null;
  const cumple = revisiones.every(cumpleRevision);
  const fallan = revisiones.filter((r) => !cumpleRevision(r)).length;
  return (
    <section id="revision" className="tarjeta scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea bg-zinc-50/70 px-5 py-3.5 sm:px-6 dark:bg-white/[0.02]">
        <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          {!cumple && (
            <span>
              {fallan === 1
                ? "1 revisión no pasa"
                : `${fallan} revisiones no pasan`}
            </span>
          )}
          <Sello cumple={cumple} />
        </div>
      </div>
      <ul className="divide-y divide-linea">
        {revisiones.map((r) => {
          const ok = cumpleRevision(r);
          const uso = usoRevision(r);
          const d = r.decimales ?? 2;
          return (
            <li key={r.nombre} className="px-5 py-3 sm:px-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-sm font-medium">{r.nombre}</span>
                <span className="font-mono text-[13px] tabular-nums">
                  {fmt(r.actuante, d)} {r.tipo === "maximo" ? "≤" : "≥"}{" "}
                  {fmt(r.limite, d)} {r.unidad}
                  <span
                    className={`ml-2 font-sans font-semibold ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {ok ? "✓" : "✗"}
                  </span>
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                  aria-hidden
                >
                  <div
                    className={`h-full rounded-full ${ok ? (uso > 0.9 ? "bg-amber-500" : "bg-emerald-500") : "bg-red-500"}`}
                    style={{
                      width: `${Math.min(100, Math.max(2, (Number.isFinite(uso) ? uso : 1) * 100))}%`,
                    }}
                  />
                </div>
                <span className="w-24 text-right text-xs text-zinc-500 tabular-nums">
                  {Number.isFinite(uso) ? `${fmt(uso * 100, 0)} % usado` : "—"}
                </span>
              </div>
              {r.nota && <p className="mt-1 text-xs text-zinc-500">{r.nota}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Botones para cargar datos de ejemplo y ver cómo cambia el resultado. */
export function EjemplosPrueba<F>({
  ejemplos,
  onUsar,
}: {
  ejemplos: Ejemplo<F>[];
  onUsar: (valores: Partial<F>) => void;
}) {
  if (ejemplos.length === 0) return null;
  return (
    <section className="tarjeta p-5 sm:p-6">
      <h2 className="text-base font-semibold tracking-tight">
        Prueba con un ejemplo
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Carga unos datos y luego cambia lo que quieras: la revisión dice al
        momento si cumple o no.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ejemplos.map((e) => (
          <button
            key={e.nombre}
            type="button"
            onClick={() => onUsar(e.valores)}
            className="group flex flex-col items-start gap-1.5 rounded-xl border border-linea p-3.5 text-left transition hover:border-marca-300 hover:bg-marca-50/50 focus-visible:ring-4 focus-visible:ring-marca-500/30 focus-visible:outline-none dark:hover:border-marca-700 dark:hover:bg-marca-950/30"
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="text-sm font-semibold group-hover:text-marca-700 dark:group-hover:text-marca-300">
                {e.nombre}
              </span>
              <Sello cumple={e.cumple} chico />
            </span>
            <span className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {e.descripcion}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

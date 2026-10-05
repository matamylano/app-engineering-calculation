import type { TablaDiseno } from "@/calc/soils/tabla-diseno";
import { fromKPa, type StressUnit } from "@/calc/units";
import { fmt } from "@/components/form";

interface Props {
  tabla: TablaDiseno;
  /** Unidad de esfuerzo que eligió el usuario. */
  unidad: StressUnit;
  /** Ancho y profundidad capturados, para resaltar la celda del estudio. */
  ancho: number;
  profundidad: number;
  circular?: boolean;
  /** true en la memoria (hoja blanca); false en pantalla. */
  papel?: boolean;
}

const igual = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** Tabla de qa por ancho (columnas) y profundidad de desplante (filas). */
export default function TablaDisenoSuelos({ tabla, unidad, ancho, profundidad, circular, papel }: Props) {
  const borde = papel ? "border-zinc-300" : "border-linea";
  const resaltado = papel ? "font-bold underline" : "font-semibold text-marca-600 dark:text-marca-300";
  return (
    <div className="overflow-x-auto">
      <table className="mt-2 w-full min-w-[34rem] text-sm">
        <thead>
          <tr className={`border-b ${papel ? "border-zinc-400" : borde} text-left`}>
            <th className="py-1.5 pr-2 font-semibold">Df \ {circular ? "D" : "B"} (m)</th>
            {tabla.anchos.map((b) => (
              <th key={b} className="py-1.5 pr-2 text-right font-semibold">
                {fmt(b, 1)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabla.profundidades.map((df, i) => (
            <tr key={df} className={`border-b ${borde}`}>
              <td className="py-1.5 pr-2">{fmt(df)} m</td>
              {tabla.anchos.map((b, j) => {
                const q = tabla.qa[i]?.[j];
                const actual = igual(b, ancho) && igual(df, profundidad);
                return (
                  <td key={b} className={`py-1.5 pr-2 text-right font-mono tabular-nums ${actual ? resaltado : ""}`}>
                    {q === null || q === undefined ? "—" : fmt(fromKPa(q, unidad))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`mt-1 text-xs ${papel ? "" : "text-zinc-500"}`}>
        Capacidad de carga admisible qa en {unidad}, con los mismos parámetros del suelo, forma, tipo de falla, nivel
        freático y factor de seguridad del estudio.
      </p>
    </div>
  );
}

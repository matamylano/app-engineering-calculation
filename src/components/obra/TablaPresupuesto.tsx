import type { Presupuesto } from "@/calc/obra/cuantificacion";
import { fmt } from "@/components/form";

const pesos = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/**
 * Tabla de cantidades e importes. Sirve en pantalla y en la memoria (`papel`
 * usa los colores de la hoja impresa).
 */
export default function TablaPresupuesto({ p, papel }: { p: Presupuesto; papel?: boolean }) {
  const linea = papel ? "border-zinc-300" : "border-linea";
  const tenue = papel ? "text-zinc-600" : "text-zinc-500 dark:text-zinc-400";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className={`border-b ${linea} text-left ${tenue}`}>
            <th className="py-1.5 pr-3 font-medium">Concepto</th>
            <th className="py-1.5 pr-3 text-right font-medium">Cantidad</th>
            <th className="py-1.5 pr-3 font-medium">Unidad</th>
            <th className="py-1.5 pr-3 text-right font-medium">P. U.</th>
            <th className="py-1.5 text-right font-medium">Importe</th>
          </tr>
        </thead>
        <tbody>
          {p.renglones.map((r) => (
            <tr key={r.concepto} className={`border-b ${linea}`}>
              <td className="py-1.5 pr-3">{r.concepto}</td>
              <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{fmt(r.cantidadConDesperdicio, r.material === "acero" ? 1 : 2)}</td>
              <td className="py-1.5 pr-3">{r.unidad}</td>
              <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{r.precioUnitario === null ? "—" : pesos(r.precioUnitario)}</td>
              <td className="py-1.5 text-right font-mono tabular-nums">{r.importe === null ? "—" : pesos(r.importe)}</td>
            </tr>
          ))}
        </tbody>
        {p.total !== null && (
          <tfoot>
            <tr>
              <td className="pt-2 pr-3 font-semibold" colSpan={4}>
                Total estimado{p.piezas > 1 ? ` (${p.piezas} piezas)` : ""}
              </td>
              <td className="pt-2 text-right font-mono font-semibold tabular-nums">{pesos(p.total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      <p className={`mt-2 text-xs ${tenue}`}>
        Cantidades{p.piezas > 1 ? ` de ${p.piezas} piezas` : ""} con desperdicio (5 % concreto, 7 % acero). Los precios son los que
        capturó el usuario, sin IVA ni mano de obra; sirven de referencia, no son una cotización.
      </p>
    </div>
  );
}

import type { PartidaCasa, ResultadoCalentador } from "@/calc/hidrosanitaria/casa";
import { fmt } from "@/components/form";

/** Calentador en una línea: capacidad comercial y, si es solar, tubos o área. */
export function textoCalentador(c: ResultadoCalentador) {
  const piezas = c.piezas > 1 ? `${c.piezas} de ` : "";
  const capacidad = `${piezas}${fmt(c.comercial, 0)} ${c.unidad}`;
  return c.tipo === "solar" ? `${capacidad} · ${c.tubos} tubos o ${fmt(c.areaColector ?? 0, 1)} m²` : capacidad;
}

/**
 * Equipos y piezas principales de la instalación, agrupados, para cotizar.
 * Sirve en pantalla y en la memoria (papel: hoja blanca de impresión).
 */
export default function TablaMaterialesHidrosanitaria({ partidas, papel }: { partidas: PartidaCasa[]; papel?: boolean }) {
  const grupos = [...new Set(partidas.map((p) => p.grupo))];
  const linea = papel ? "border-zinc-200" : "border-linea";
  const tenue = papel ? "" : "text-zinc-600 dark:text-zinc-400";
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className={`border-b text-left ${papel ? "border-zinc-400" : "border-linea"}`}>
            <th className="py-1.5 pr-3 font-semibold">Concepto</th>
            <th className="py-1.5 pr-3 font-semibold">Especificación</th>
            <th className="py-1.5 text-right font-semibold">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <GrupoFilas key={g} grupo={g} partidas={partidas.filter((p) => p.grupo === g)} linea={linea} tenue={tenue} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GrupoFilas({ grupo, partidas, linea, tenue }: { grupo: string; partidas: PartidaCasa[]; linea: string; tenue: string }) {
  return (
    <>
      <tr className={`border-b ${linea}`}>
        <td colSpan={3} className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wide">
          {grupo}
        </td>
      </tr>
      {partidas.map((p) => (
        <tr key={p.concepto} className={`border-b ${linea}`}>
          <td className="py-1 pr-3">{p.concepto}</td>
          <td className={`py-1 pr-3 ${tenue}`}>{p.especificacion}</td>
          <td className="py-1 text-right font-mono whitespace-nowrap">
            {p.cantidad === null ? "según planos" : `${p.cantidad} ${p.unidad === "salida" && p.cantidad !== 1 ? "salidas" : p.unidad}`}
          </td>
        </tr>
      ))}
    </>
  );
}

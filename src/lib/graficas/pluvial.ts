/** Gráficas de la captación de agua de lluvia del estudio pluvial. */
import type { EntradaPluvial, ResultadoPluvial } from "@/calc/drenaje/pluvial";
import { MESES } from "@/calc/drenaje/tablas";
import type { EspecGrafica } from "./tipos";

export function graficasPluvialExtra(_e: EntradaPluvial, r: ResultadoPluvial): EspecGrafica[] {
  const c = r.captacion;
  if (!c?.meses) return [];
  const m = c.meses;
  return [
    {
      tipo: "barras",
      titulo: "Agua de lluvia captada contra demanda, por mes",
      subtitulo: `Se captan ${c.captacionAnual.toFixed(1)} m³ al año para una demanda de ${c.demandaAnual.toFixed(1)} m³.`,
      categorias: MESES,
      series: [
        { nombre: "Captación", valores: m.map((x) => x.captacion), color: 1 },
        { nombre: "Demanda", valores: m.map((x) => x.demanda), color: 2 },
      ],
      y: { etiqueta: "Volumen (m³)", min: 0 },
    },
    {
      tipo: "barras",
      titulo: "Agua en la cisterna al final de cada mes",
      subtitulo: `Cisterna de ${c.cisterna!.toFixed(1)} m³; cubre el ${Math.round(c.cobertura * 100)} % de la demanda del año.`,
      categorias: MESES,
      series: [{ nombre: "Almacenamiento", valores: m.map((x) => x.almacenamiento), color: 3 }],
      y: { etiqueta: "Volumen (m³)", min: 0 },
      referencia: { valor: c.cisterna!, texto: `Capacidad ${c.cisterna!.toFixed(1)} m³` },
    },
  ];
}

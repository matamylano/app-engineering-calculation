/** Gráficas adicionales del pozo: curva del sistema y extracción contra la concesión. */
import { cargaSistema, type EntradaPozo, type ResultadoPozo } from "@/calc/pozos/pozo";
import type { EspecGrafica } from "./tipos";

export function graficasPozoExtra(e: EntradaPozo, r: ResultadoPozo): EspecGrafica[] {
  const hasta = e.gastoDiseno * 1.5;
  const puntos: [number, number][] = [];
  for (let i = 0; i <= 30; i++) {
    const q = (hasta * i) / 30;
    puntos.push([q, cargaSistema(e, r, q)]);
  }
  const especs: EspecGrafica[] = [
    {
      tipo: "xy",
      titulo: "Curva del sistema del pozo",
      subtitulo:
        "Carga que pide el pozo según el gasto: nivel estático, abatimiento, pérdidas en la columna y carga en la descarga. La bomba se escoge con su curva pasando por el punto de operación.",
      x: { etiqueta: "Gasto (L/s)", min: 0, max: hasta },
      y: { etiqueta: "Carga dinámica total (m)", min: 0 },
      series: [{ nombre: "Curva del sistema", puntos, estilo: "linea", color: 1 }],
      notas: [{ x: e.gastoDiseno, y: r.carga, texto: `Operación: ${e.gastoDiseno} L/s a ${r.carga.toFixed(1)} m` }],
    },
  ];
  // Las memorias anteriores no traen la extracción.
  const x = r.extraccion;
  if (x?.concesionado !== undefined) {
    especs.push({
      tipo: "barras",
      titulo: "Extracción anual contra el volumen concesionado",
      subtitulo: `Con ${e.gastoDiseno} L/s, ${r.energia.horasDia} h al día y ${r.energia.diasAno} días al año.`,
      categorias: ["Extracción anual"],
      series: [{ nombre: "Extracción", valores: [x.anual], color: x.anual > x.concesionado ? 2 : 1 }],
      y: { etiqueta: "Volumen (m³/año)", min: 0 },
      referencia: { valor: x.concesionado, texto: `Concesión ${Math.round(x.concesionado).toLocaleString("es-MX")} m³/año` },
    });
  }
  return especs;
}

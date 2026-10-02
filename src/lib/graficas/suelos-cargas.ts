/** Gráficas del estudio de suelos y de la bajada de cargas. */
import type { EntradaBajada, ResultadoBajada } from "@/calc/cargas/bajada";
import type { SoilStudyInput, SoilStudyResult } from "@/calc/soils/study";
import { terzaghiBearingCapacity } from "@/calc/soils/terzaghi";
import { fromKPa, type UnitSystem } from "@/calc/units";
import type { EspecGrafica } from "./tipos";

const FORMA = { corrida: "corrido", cuadrada: "cuadrado", circular: "circular" } as const;

export function graficasSuelos(e: SoilStudyInput, r: SoilStudyResult, u: UnitSystem): EspecGrafica[] {
  if (!r.bearing.ok) return [];
  const b = r.bearing.value;
  const S = u.stress;
  const B = e.bearing.width;
  const hasta = Math.max(3, Math.ceil(B * 2.5));
  const curva: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const w = 0.3 + ((hasta - 0.3) * i) / 40;
    try {
      curva.push([w, fromKPa(terzaghiBearingCapacity({ ...e.bearing, width: w }).allowable, S)]);
    } catch {
      // Fuera del alcance del motor para ese ancho: se omite el punto.
    }
  }
  const t = b.terms;
  return [
    {
      tipo: "xy",
      titulo: "Capacidad de carga admisible según el ancho del cimiento",
      subtitulo: `Cimiento ${FORMA[e.bearing.shape]} desplantado a ${e.bearing.depth} m, FS = ${b.safetyFactor}.`,
      x: { etiqueta: "Ancho del cimiento B (m)", min: 0, max: hasta },
      y: { etiqueta: `qa (${S})`, min: 0 },
      series: [{ nombre: "Capacidad admisible", puntos: curva, estilo: "linea", color: 1 }],
      notas: [
        { x: B, y: fromKPa(b.allowable, S), texto: `B = ${B} m → qa = ${fromKPa(b.allowable, S).toFixed(2)} ${S}` },
      ],
    },
    {
      tipo: "barras",
      titulo: "De dónde sale la capacidad última",
      subtitulo: `Términos de la ecuación de Terzaghi; suman qu = ${fromKPa(b.ultimate, S).toFixed(2)} ${S}.`,
      categorias: ["Cohesión", "Sobrecarga", "Peso del suelo"],
      series: [
        { nombre: "Aporte", valores: [t.cohesion, t.surcharge, t.selfWeight].map((v) => fromKPa(v, S)), color: 1 },
      ],
      y: { etiqueta: `Aporte a qu (${S})` },
    },
  ];
}

export function graficasCargas(_e: EntradaBajada, r: ResultadoBajada): EspecGrafica[] {
  if (r.elementos.length === 0) return [];
  return [
    {
      tipo: "barras",
      titulo: "Carga en la base de cada elemento",
      subtitulo: "La carga última ya trae los factores de carga; con ella se diseña.",
      categorias: r.elementos.map((x) => x.nombre || "Sin nombre"),
      series: [
        { nombre: "Servicio", valores: r.elementos.map((x) => x.servicio), color: 1 },
        { nombre: "Última", valores: r.elementos.map((x) => x.ultima), color: 2 },
      ],
      y: { etiqueta: "Carga (t)" },
    },
  ];
}

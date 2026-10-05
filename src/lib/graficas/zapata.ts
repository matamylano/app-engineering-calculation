/**
 * Gráficas de la zapata rectangular o con momento. La zapata cuadrada sin
 * momento sigue usando la de src/lib/graficas/concreto.ts.
 */
import type { EntradaZapata, ResultadoZapata } from "@/calc/concreto/zapata";
import { graficasZapata } from "./concreto";
import type { EspecGrafica } from "./tipos";

const N = 40;
const rango = (a: number, b: number, n = N) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/** La zapata usa las opciones nuevas: rectangular o con momento (las memorias viejas no tienen estos datos). */
export const zapataExtendida = (e: EntradaZapata) => e.largo !== undefined || (e.momento ?? 0) > 0;

/** Todas las gráficas de la zapata: la de siempre o las de rectangular y presiones. */
export function graficasZapataCompletas(e: EntradaZapata, r: ResultadoZapata): EspecGrafica[] {
  if (!zapataExtendida(e) || r.largo === undefined) return graficasZapata(e, r);
  return [graficaDimension(e, r), ...(r.presiones ? [graficaPresiones(e, r)] : [])];
}

/** Presión máxima de servicio según el ancho B (con L fijo) o el lado de la cuadrada. */
function graficaDimension(e: EntradaZapata, r: ResultadoZapata): EspecGrafica {
  const p = e.carga * (1 + e.incremento);
  const M = e.momento ?? 0;
  const qmax = (x: number) => (r.cuadrada ? p / (x * x) + (6 * M) / x ** 3 : p / (x * r.largo) + (6 * M) / (x * r.largo ** 2));
  const desde = Math.max(0.3, Math.min(r.ladoMinimo, r.lado) * 0.6);
  const hasta = Math.max(r.lado, r.ladoMinimo) * 1.6;
  const q = qmax(r.lado);
  return {
    tipo: "xy",
    titulo: r.cuadrada ? "Presión máxima según el lado de la zapata" : `Presión máxima según el ancho B (L = ${r.largo.toFixed(2)} m)`,
    subtitulo: "Con medidas a la derecha de donde la curva cruza qa, el suelo resiste.",
    x: { etiqueta: r.cuadrada ? "Lado de la zapata (m)" : "Ancho de la zapata B (m)", min: desde, max: hasta },
    y: { etiqueta: "Presión máxima de servicio (t/m²)", min: 0 },
    series: [
      { nombre: M > 0 ? "P (1 + i) / A + 6 M / (B L²)" : "P (1 + i) / (B L)", puntos: rango(desde, hasta).map((x) => [x, qmax(x)]), estilo: "linea", color: 1 },
      {
        nombre: `Capacidad admisible qa = ${e.qa.toFixed(1)} t/m²`,
        puntos: [
          [desde, e.qa],
          [hasta, e.qa],
        ],
        estilo: "limite",
      },
    ],
    notas: [{ x: r.lado, y: q, texto: `B = ${r.lado.toFixed(2)} m, ${q.toFixed(2)} t/m²` }],
  };
}

/** Diagrama de presiones de servicio bajo la zapata, a lo largo de L. */
function graficaPresiones(e: EntradaZapata, r: ResultadoZapata): EspecGrafica {
  const p = r.presiones!;
  const L = r.largo;
  return {
    tipo: "xy",
    titulo: "Presiones bajo la zapata",
    subtitulo: `A lo largo de L, con e = M/P = ${p.excentricidad.toFixed(3)} m. No debe pasar de qa ni bajar de cero.`,
    x: { etiqueta: "Posición a lo largo de L (m)", min: 0, max: L },
    y: { etiqueta: "Presión de servicio (t/m²)", min: Math.min(0, p.minima) },
    series: [
      {
        nombre: "Presión de servicio",
        puntos: [
          [0, p.minima],
          [L, p.maxima],
        ],
        estilo: "area",
        color: 1,
      },
      {
        nombre: `Capacidad admisible qa = ${e.qa.toFixed(1)} t/m²`,
        puntos: [
          [0, e.qa],
          [L, e.qa],
        ],
        estilo: "limite",
      },
    ],
    notas: [
      { x: L, y: p.maxima, texto: `qmáx = ${p.maxima.toFixed(2)} t/m²` },
      { x: 0, y: p.minima, texto: `qmín = ${p.minima.toFixed(2)} t/m²` },
    ],
  };
}

/**
 * Gráficas de la columna con flexión biaxial (acero en las cuatro caras). Con
 * momento en una dirección se usa la de src/lib/graficas/concreto.ts.
 */
import {
  resistenciaCapas,
  seccionesCuatroCaras,
  type Capa,
  type EntradaColumna,
  type ResultadoColumna,
} from "@/calc/concreto/columna";
import { FR_COMPRESION } from "@/calc/concreto/ntc";
import { graficasColumna } from "./concreto";
import type { EspecGrafica } from "./tipos";

const rango = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/** Curva de interacción ya con FR, con el tope de carga axial (t, t·m). */
function curva(sec: { s: { b: number; h: number; fc: number; fy: number }; capas: Capa[] }, tope: number): [number, number][] {
  const h = sec.s.h;
  const puntos: [number, number][] = [];
  for (const c of [...rango(0.02 * h, h, 30), ...rango(1.05 * h, 4 * h, 12)]) {
    const n = resistenciaCapas(c, sec.s, sec.capas);
    const p = Math.min((FR_COMPRESION * n.p) / 1000, tope);
    const m = (FR_COMPRESION * n.m) / 1e5;
    if (m >= 0 && p >= 0) puntos.push([m, p]);
  }
  puntos.push([0, tope]);
  return puntos;
}

export function graficasColumnaCompletas(e: EntradaColumna, r: ResultadoColumna): EspecGrafica[] {
  const x = r.biaxial;
  if (!x || r.armado.porCaraB === undefined || r.armado.porCaraH === undefined) return graficasColumna(e, r);
  const s = seccionesCuatroCaras(e, r.armado.porCaraB, r.armado.porCaraH);
  return [
    {
      tipo: "xy",
      titulo: "Diagramas de interacción en cada dirección",
      subtitulo: `${r.armado.cantidad} varillas #${r.armado.varilla} en las cuatro caras. Cada punto debe quedar dentro de su curva; la revisión conjunta es la de Bresler.`,
      x: { etiqueta: "Momento resistente FR·Mn (t·m)", min: 0 },
      y: { etiqueta: "Carga axial FR·Pn (t)", min: 0 },
      series: [
        { nombre: `Momento en la dirección de h (${e.b} × ${e.h} cm)`, puntos: curva(s.h, r.cargaResistente), estilo: "linea", color: 1 },
        { nombre: "Momento en la dirección de b", puntos: curva(s.b, r.cargaResistente), estilo: "linea", color: 2 },
      ],
      notas: [
        { x: r.momentoDiseno, y: e.carga, texto: `Mx = ${r.momentoDiseno.toFixed(2)} t·m`, color: 1 },
        { x: x.momentoDiseno, y: e.carga, texto: `My = ${x.momentoDiseno.toFixed(2)} t·m`, color: 2 },
      ],
    },
  ];
}

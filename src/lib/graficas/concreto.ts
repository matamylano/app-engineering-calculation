/** Gráficas de los estudios de concreto: viga, losa, columna y zapata. */
import { resistenciaNominal, type EntradaColumna, type ResultadoColumna } from "@/calc/concreto/columna";
import { FR_COMPRESION, varilla } from "@/calc/concreto/ntc";
import { APOYOS, type Apoyo, type EntradaViga, type ResultadoViga } from "@/calc/concreto/viga";
import type { EntradaLosa, ResultadoLosa } from "@/calc/concreto/losa";
import type { EntradaZapata, ResultadoZapata } from "@/calc/concreto/zapata";
import type { EspecGrafica, EspecXY } from "./tipos";

const N = 40;
const rango = (a: number, b: number, n = N) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/**
 * Momento a lo largo del claro con carga uniforme: una parábola que pasa por
 * los momentos negativos de los apoyos y llega al positivo de diseño, para
 * que el diagrama coincida con los valores de la memoria. El cortante es su
 * derivada. Momentos en las unidades de `mNeg`/`mPos`; x de 0 a L.
 */
export function diagramas(apoyo: Apoyo, L: number, mNeg: number, mPos: number, wu: number) {
  const a = APOYOS[apoyo];
  if (apoyo === "voladizo") {
    // Empotrado en x = 0.
    return {
      momento: rango(0, L).map((x) => [x, -(wu * (L - x) ** 2) / 2] as [number, number]),
      cortante: rango(0, L).map((x) => [x, wu * (L - x)] as [number, number]),
    };
  }
  // Momento negativo en cada extremo según el tipo de apoyo.
  const mi = apoyo === "ambos-continuos" ? mNeg : 0;
  const md = a.negativo ? mNeg : 0;
  // M(ξ) = −mi(1−ξ) − md ξ + k ξ(1−ξ); k tal que el máximo sea mPos.
  const maximo = (k: number) => {
    const xi = Math.min(1, Math.max(0, 0.5 + (mi - md) / (2 * k)));
    return -mi * (1 - xi) - md * xi + k * xi * (1 - xi);
  };
  let lo = 0;
  let hi = 8 * (mPos + mi + md) + 1;
  for (let i = 0; i < 80; i++) {
    const k = (lo + hi) / 2;
    if (maximo(k) < mPos) lo = k;
    else hi = k;
  }
  const k = (lo + hi) / 2;
  return {
    momento: rango(0, L).map((x) => {
      const xi = x / L;
      return [x, -mi * (1 - xi) - md * xi + k * xi * (1 - xi)] as [number, number];
    }),
    cortante: rango(0, L).map((x) => {
      const xi = x / L;
      return [x, (mi - md + k * (1 - 2 * xi)) / L] as [number, number];
    }),
  };
}

export function graficasViga(e: EntradaViga, r: ResultadoViga): EspecGrafica[] {
  const d = diagramas(e.apoyo, e.claro, r.superior.momento, r.inferior.momento, r.cargaUltima);
  const vcr = r.cortante.concreto;
  return [
    {
      tipo: "xy",
      titulo: "Diagrama de momento flexionante",
      subtitulo: `Carga última wu = ${r.cargaUltima.toFixed(2)} t/m. Positivo: tensión abajo.`,
      x: { etiqueta: "Posición en el claro (m)", min: 0, max: e.claro },
      y: { etiqueta: "Momento (t·m)" },
      series: [{ nombre: "Momento último", puntos: d.momento, estilo: "area", color: 1 }],
      notas: notasExtremos(d.momento, "t·m"),
    },
    {
      tipo: "xy",
      titulo: "Diagrama de fuerza cortante",
      subtitulo: "La línea punteada es lo que resiste el concreto; el resto lo toman los estribos.",
      x: { etiqueta: "Posición en el claro (m)", min: 0, max: e.claro },
      y: { etiqueta: "Cortante (t)" },
      series: [
        { nombre: "Cortante último", puntos: d.cortante, estilo: "area", color: 1 },
        {
          nombre: `Resistencia del concreto ${e.apoyo === "voladizo" ? "" : "±"}VcR = ${vcr.toFixed(2)} t`,
          puntos: [
            [0, vcr],
            [e.claro, vcr],
          ],
          estilo: "limite",
        },
        ...(e.apoyo === "voladizo"
          ? []
          : [
              {
                nombre: "−VcR",
                puntos: [
                  [0, -vcr],
                  [e.claro, -vcr],
                ] as [number, number][],
                estilo: "limite" as const,
                sinLeyenda: true,
              },
            ]),
      ],
    },
  ];
}

export function graficasLosa(e: EntradaLosa, r: ResultadoLosa): EspecGrafica[] {
  const wu = r.cargaUltima / 1000; // t/m² = t/m en la franja de 1 m
  const d = diagramas(e.apoyo, e.claro, r.negativo.momento, r.positivo.momento, wu);
  return [
    {
      tipo: "xy",
      titulo: "Momento en una franja de 1 m",
      subtitulo: `Carga última ${r.cargaUltima.toFixed(0)} kg/m². Positivo: tensión abajo.`,
      x: { etiqueta: "Posición en el claro (m)", min: 0, max: e.claro },
      y: { etiqueta: "Momento (t·m/m)" },
      series: [{ nombre: "Momento último", puntos: d.momento, estilo: "area", color: 1 }],
      notas: notasExtremos(d.momento, "t·m/m"),
    },
    {
      tipo: "xy",
      titulo: "Cortante en una franja de 1 m",
      subtitulo: "La línea punteada es lo que resiste el concreto (la losa no lleva estribos).",
      x: { etiqueta: "Posición en el claro (m)", min: 0, max: e.claro },
      y: { etiqueta: "Cortante (t/m)" },
      series: [
        { nombre: "Cortante último", puntos: d.cortante, estilo: "area", color: 1 },
        {
          nombre: `Resistencia del concreto = ${r.cortante.resistente.toFixed(2)} t/m`,
          puntos: [
            [0, r.cortante.resistente],
            [e.claro, r.cortante.resistente],
          ],
          estilo: "limite",
        },
      ],
    },
  ];
}

/** Etiqueta el máximo positivo y el negativo de un diagrama. */
function notasExtremos(p: [number, number][], unidad: string) {
  const max = p.reduce((a, b) => (b[1] > a[1] ? b : a));
  const min = p.reduce((a, b) => (b[1] < a[1] ? b : a));
  const notas = [];
  if (max[1] > 1e-6) notas.push({ x: max[0], y: max[1], texto: `${max[1].toFixed(2)} ${unidad}` });
  if (min[1] < -1e-6) notas.push({ x: min[0], y: min[1], texto: `${min[1].toFixed(2)} ${unidad}` });
  return notas;
}

/** Diagrama de interacción carga axial–momento de la columna, ya con FR. */
export function curvaInteraccion(e: EntradaColumna, r: ResultadoColumna): [number, number][] {
  const v = varilla(e.varilla)!;
  const est = varilla(e.estribo)!;
  const dp = e.recubrimiento + est.diametro + v.diametro / 2;
  const s = { b: e.b, h: e.h, dp, area: r.armado.area, fc: e.fc, fy: e.fy };
  const tope = r.cargaResistente; // t, ya con FR y el límite de compresión
  const puntos: [number, number][] = [];
  // Del eje neutro casi en la cara (tensión pura) a muy afuera (compresión pura).
  for (const c of [...rango(0.02 * e.h, e.h, 30), ...rango(1.05 * e.h, 4 * e.h, 12)]) {
    const n = resistenciaNominal(c, s);
    const p = Math.min((FR_COMPRESION * n.p) / 1000, tope);
    const m = (FR_COMPRESION * n.m) / 1e5;
    if (m >= 0 && p >= 0) puntos.push([m, p]);
  }
  puntos.push([0, tope]);
  return puntos;
}

export function graficasColumna(e: EntradaColumna, r: ResultadoColumna): EspecGrafica[] {
  const curva = curvaInteraccion(e, r);
  const g: EspecXY = {
    tipo: "xy",
    titulo: "Diagrama de interacción",
    subtitulo: `${r.armado.cantidad} varillas #${r.armado.varilla}. El punto de diseño debe quedar dentro de la curva.`,
    x: { etiqueta: "Momento resistente FR·Mn (t·m)", min: 0 },
    y: { etiqueta: "Carga axial FR·Pn (t)", min: 0 },
    series: [{ nombre: "Resistencia de la sección", puntos: curva, estilo: "area", color: 1 }],
    notas: [
      { x: r.momentoDiseno, y: e.carga, texto: `Pu = ${e.carga.toFixed(1)} t, Mu = ${r.momentoDiseno.toFixed(2)} t·m` },
    ],
  };
  return [g];
}

export function graficasZapata(e: EntradaZapata, r: ResultadoZapata): EspecGrafica[] {
  const p = e.carga * (1 + e.incremento);
  const desde = Math.max(0.5, Math.min(r.ladoMinimo, r.lado) * 0.6);
  const hasta = Math.max(r.lado, r.ladoMinimo) * 1.6;
  return [
    {
      tipo: "xy",
      titulo: "Presión sobre el suelo según el lado de la zapata",
      subtitulo: "Con lados a la derecha de donde la curva cruza qa, el suelo resiste.",
      x: { etiqueta: "Lado de la zapata B (m)", min: desde, max: hasta },
      y: { etiqueta: "Presión de servicio (t/m²)", min: 0 },
      series: [
        {
          nombre: "Presión P (1 + incremento) / B²",
          puntos: rango(desde, hasta).map((b) => [b, p / (b * b)]),
          estilo: "linea",
          color: 1,
        },
        {
          nombre: `Capacidad admisible qa = ${e.qa.toFixed(1)} t/m²`,
          puntos: [
            [desde, e.qa],
            [hasta, e.qa],
          ],
          estilo: "limite",
        },
      ],
      notas: [
        { x: r.lado, y: r.presionServicio, texto: `B = ${r.lado.toFixed(2)} m, ${r.presionServicio.toFixed(2)} t/m²` },
      ],
    },
  ];
}

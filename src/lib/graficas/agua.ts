/** Gráficas de los estudios de agua: hidrosanitaria, pozo, pluvial y fosa. */
import { disenarFosa, type EntradaFosa, type ResultadoFosa } from "@/calc/drenaje/fosa";
import { tuboLleno, type EntradaPluvial, type ResultadoPluvial } from "@/calc/drenaje/pluvial";
import { DIAMETROS_PLUVIAL, LLENADO_MAXIMO } from "@/calc/drenaje/tablas";
import type { EntradaCasa, ResultadoCasa } from "@/calc/hidrosanitaria/casa";
import { HUNTER_TANQUE, LPS_POR_GPM } from "@/calc/hidrosanitaria/tablas";
import type { EntradaPozo, ResultadoPozo } from "@/calc/pozos/pozo";
import type { EspecGrafica } from "./tipos";

export function graficasHidrosanitaria(_e: EntradaCasa, r: ResultadoCasa): EspecGrafica[] {
  const hasta = Math.min(100, Math.max(30, Math.ceil((r.unidadesMueble * 1.6) / 10) * 10));
  const curva = HUNTER_TANQUE.filter(([u]) => u <= hasta).map(([u, g]) => [u, g * LPS_POR_GPM] as [number, number]);
  return [
    {
      tipo: "xy",
      titulo: "Gasto probable por el método de Hunter",
      subtitulo: "Curva para muebles con tanque. Con más muebles, no todos se usan a la vez.",
      x: { etiqueta: "Unidades mueble", min: 0, max: hasta },
      y: { etiqueta: "Gasto probable (L/s)", min: 0 },
      series: [{ nombre: "Curva de Hunter", puntos: curva, estilo: "linea", color: 1 }],
      notas: [
        {
          x: r.unidadesMueble,
          y: r.gastoProbable,
          texto: `${r.unidadesMueble.toFixed(1)} UM → ${r.gastoProbable.toFixed(2)} L/s`,
        },
      ],
    },
  ];
}

export function graficasPozo(e: EntradaPozo, r: ResultadoPozo): EspecGrafica[] {
  const usadas = e.lecturas.filter((l) => l.t >= e.desde);
  const fuera = e.lecturas.filter((l) => l.t < e.desde);
  const ultima = e.lecturas.reduce((a, b) => (b.t > a.t ? b : a));
  const minutos = Math.max(e.horasBombeo * 60, ultima.t);
  const tMin = Math.min(...e.lecturas.map((l) => l.t));
  const recta = (t: number) => r.recta.ordenada + r.recta.pendiente * Math.log10(t);
  const sDiseno = recta(minutos);
  return [
    {
      tipo: "xy",
      titulo: "Prueba de bombeo (Cooper-Jacob)",
      subtitulo: `Δs = ${r.recta.pendiente.toFixed(2)} m por ciclo logarítmico; T = ${r.transmisividad.toFixed(1)} m²/día.`,
      x: { etiqueta: "Tiempo desde que arrancó la bomba (min)", log: true },
      y: { etiqueta: "Abatimiento (m)", invertido: true, min: 0 },
      series: [
        {
          nombre: "Recta ajustada",
          puntos: [
            [tMin, recta(tMin)],
            [minutos, sDiseno],
          ],
          estilo: "linea",
          color: 1,
        },
        { nombre: "Lecturas en el tramo recto", puntos: usadas.map((l) => [l.t, l.s]), estilo: "puntos", color: 1 },
        ...(fuera.length
          ? [
              {
                nombre: "Lecturas sin usar",
                puntos: fuera.map((l) => [l.t, l.s] as [number, number]),
                estilo: "puntos" as const,
                color: 3 as const,
              },
            ]
          : []),
      ],
      notas:
        minutos > ultima.t
          ? [{ x: minutos, y: sDiseno, texto: `${e.horasBombeo} h: ${sDiseno.toFixed(2)} m con el gasto de la prueba` }]
          : [],
    },
  ];
}

export function graficasPluvial(e: EntradaPluvial, r: ResultadoPluvial): EspecGrafica[] {
  // El diámetro escogido, uno más chico y dos más grandes, para que se lea la comparación.
  const i = Math.max(0, DIAMETROS_PLUVIAL.indexOf(r.tuberia.diametro));
  const diametros = DIAMETROS_PLUVIAL.slice(Math.max(0, i - 1), i + 3);
  return [
    {
      tipo: "barras",
      titulo: "Capacidad de la tubería contra el gasto de lluvia",
      subtitulo: `Al ${Math.round(LLENADO_MAXIMO * 100)} % del tubo lleno, con pendiente de ${e.pendiente} %. Se escoge el primer diámetro que supera el gasto.`,
      categorias: diametros.map((d) => `${d} mm`),
      series: [
        {
          nombre: "Capacidad",
          valores: diametros.map((d) => LLENADO_MAXIMO * tuboLleno(d, e.pendiente).capacidad),
          color: 1,
        },
      ],
      y: { etiqueta: "Gasto (L/s)" },
      referencia: { valor: r.gasto, texto: `Gasto de diseño ${r.gasto.toFixed(2)} L/s` },
    },
  ];
}

export function graficasFosa(e: EntradaFosa, r: ResultadoFosa): EspecGrafica[] {
  const hasta = Math.min(100, Math.max(10, Math.ceil((e.habitantes * 2) / 5) * 5));
  const puntos: [number, number][] = [];
  for (let n = 1; n <= hasta; n++) puntos.push([n, disenarFosa({ ...e, habitantes: n }).volumen / 1000]);
  return [
    {
      tipo: "xy",
      titulo: "Volumen útil de la fosa según los habitantes",
      subtitulo: "Crece con los habitantes; la pendiente cambia donde cambia el tiempo de retención.",
      x: { etiqueta: "Habitantes", min: 0, max: hasta },
      y: { etiqueta: "Volumen útil (m³)", min: 0 },
      series: [{ nombre: "Volumen útil", puntos, estilo: "area", color: 1 }],
      notas: [
        { x: e.habitantes, y: r.volumen / 1000, texto: `${e.habitantes} hab. → ${(r.volumen / 1000).toFixed(2)} m³` },
      ],
    },
  ];
}

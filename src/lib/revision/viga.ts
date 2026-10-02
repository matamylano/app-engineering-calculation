import { FR_CORTANTE, varilla } from "@/calc/concreto/ntc";
import {
  APOYOS,
  type EntradaViga,
  type ResultadoViga,
} from "@/calc/concreto/viga";
import type { FormularioViga } from "@/lib/estudios/viga";
import type { Ejemplo, Revision } from "./tipos";

/**
 * Las revisiones de la viga, con los mismos criterios de `disenarViga`: todas
 * pasan exactamente cuando `r.cumple` (lo comprueban las pruebas).
 */
export function revisionesViga(e: EntradaViga, r: ResultadoViga): Revision[] {
  const v = varilla(e.varilla)!;
  const est = varilla(e.estribo)!;
  const raiz = (Math.sqrt(e.fc) * e.b * r.d) / 1000; // t
  const vs = r.cortante.actuante - r.cortante.concreto;
  const porCalculo =
    vs > 0 ? (FR_CORTANTE * 2 * est.area * e.fy * r.d) / (vs * 1000) : Infinity;
  const anchoLibre = e.b - 2 * (e.recubrimiento + est.diametro);
  const anchoLecho = (n: number) =>
    n * v.diametro + (n - 1) * Math.max(2.5, v.diametro);
  const rev: Revision[] = [
    {
      nombre: "Cortante que admite la sección",
      actuante: r.cortante.actuante,
      limite: r.cortante.concreto + 2 * FR_CORTANTE * raiz,
      unidad: "t",
      tipo: "maximo",
      nota: "Vu a d del apoyo contra VcR + 2 FR √f'c b d. Si no pasa, aumenta el ancho o el peralte.",
    },
  ];
  if (Number.isFinite(porCalculo) && vs <= 2 * FR_CORTANTE * raiz)
    rev.push({
      nombre: "Separación de estribos por cálculo",
      actuante: porCalculo,
      limite: 5,
      unidad: "cm",
      tipo: "minimo",
      decimales: 1,
      nota: "Con menos de 5 cm no se pueden colar; usa estribo más grueso o una sección mayor.",
    });
  for (const [nombre, l] of [
    ["arriba", r.superior],
    ["abajo", r.inferior],
  ] as const) {
    if (l.momento === 0) continue;
    rev.push({
      nombre: `Acero ${nombre} contra el máximo`,
      actuante: l.areaColocada,
      limite: r.aceroMaximo,
      unidad: "cm²",
      tipo: "maximo",
      nota: "75 % del acero balanceado; si se pasa, aumenta el peralte.",
    });
    rev.push({
      nombre: `Varillas ${nombre} en una capa`,
      actuante: anchoLecho(l.cantidad),
      limite: anchoLibre,
      unidad: "cm",
      tipo: "maximo",
      decimales: 1,
      nota: `${l.cantidad} varillas #${e.varilla} con 2.5 cm libres entre ellas, dentro de los estribos.`,
    });
  }
  const fl = r.deflexion;
  if (e.h >= r.peralteMinimo - 1e-9 || !fl) {
    rev.push({
      nombre: "Peralte mínimo para omitir flechas",
      actuante: e.h,
      limite: r.peralteMinimo,
      unidad: "cm",
      tipo: "minimo",
      decimales: 1,
      nota: fl
        ? `L / ${APOYOS[e.apoyo].peralte}. Flecha calculada ${fl.total.toFixed(2)} cm contra ${fl.limite.toFixed(2)} cm, como referencia.`
        : `L / ${APOYOS[e.apoyo].peralte}.`,
    });
  } else {
    rev.push({
      nombre: "Flecha total contra el límite",
      actuante: fl.total,
      limite: fl.limite,
      unidad: "cm",
      tipo: "maximo",
      nota: "El peralte es menor que el mínimo, así que la flecha calculada rige. Si no pasa, aumenta el peralte.",
    });
  }
  return rev;
}

export const EJEMPLOS_VIGA: Ejemplo<FormularioViga>[] = [
  {
    nombre: "Viga de casa",
    descripcion:
      "5 m simplemente apoyada, 25 × 40 cm, carga de losa de vivienda.",
    cumple: true,
    valores: {
      apoyo: "simple",
      claro: "5",
      muerta: "1.5",
      viva: "0.5",
      b: "25",
      h: "40",
      tributaria: false,
      varilla: "5",
      estribo: "3",
    },
  },
  {
    nombre: "Viga continua de 6 m",
    descripcion: "Ambos extremos continuos, 25 × 45 cm, más carga.",
    cumple: true,
    valores: {
      apoyo: "ambos-continuos",
      claro: "6",
      muerta: "2.2",
      viva: "0.8",
      b: "25",
      h: "45",
      tributaria: false,
      varilla: "6",
      estribo: "3",
    },
  },
  {
    nombre: "Peralte muy chico",
    descripcion:
      "6 m con 20 × 35 cm: no pasa. Sube el peralte hasta que cumpla.",
    cumple: false,
    valores: {
      apoyo: "simple",
      claro: "6",
      muerta: "1.5",
      viva: "0.7",
      b: "20",
      h: "35",
      tributaria: false,
      varilla: "6",
      estribo: "3",
    },
  },
];

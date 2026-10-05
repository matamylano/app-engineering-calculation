import type {
  DireccionZapata,
  EntradaZapata,
  ResultadoZapata,
} from "@/calc/concreto/zapata";
import type { FormularioZapata } from "@/lib/estudios/zapata";
import type { Ejemplo, Revision } from "./tipos";

/**
 * Las revisiones de la zapata, con los mismos criterios de `disenarZapata`:
 * todas pasan exactamente cuando `r.cumple` (lo comprueban las pruebas).
 */
export function revisionesZapata(
  e: EntradaZapata,
  r: ResultadoZapata,
): Revision[] {
  const rev: Revision[] = [];
  const p = r.presiones;
  if (p) {
    rev.push(
      {
        nombre: "Presión máxima sobre el suelo",
        actuante: p.maxima,
        limite: e.qa,
        unidad: "t/m²",
        tipo: "maximo",
        nota: "P (1 + i) / (B L) + 6 M / (B L²) contra qa. Si no pasa, agranda la zapata.",
      },
      {
        nombre: "Excentricidad dentro del tercio medio",
        actuante: p.excentricidad,
        limite: p.limite,
        unidad: "m",
        tipo: "maximo",
        decimales: 3,
        nota: "e = M / P contra L/6, para que no haya tensión bajo la zapata. Si no pasa, alárgala en la dirección del momento.",
      },
    );
  } else {
    rev.push({
      nombre: "Presión sobre el suelo",
      actuante: r.presionServicio,
      limite: e.qa,
      unidad: "t/m²",
      tipo: "maximo",
      nota: "P (1 + i) / (B L) contra qa. Si no pasa, agranda la zapata.",
    });
  }
  rev.push({
    nombre: "Cortante por penetración",
    actuante: r.penetracion.actuante,
    limite: r.penetracion.resistente,
    unidad: "kg/cm²",
    tipo: "maximo",
    nota: p
      ? "A d/2 de la columna, con el cortante por el momento que se transmite. Si no pasa, aumenta el peralte."
      : "A d/2 de la columna. Si no pasa, aumenta el peralte.",
  });

  const { largo: l, ancho: a } = r.direcciones;
  const direcciones: [string, DireccionZapata][] =
    r.cuadrada && !p
      ? [["", l]]
      : [
          [", varillas paralelas a L", l],
          [", varillas paralelas a B", a],
        ];
  for (const [sufijo, x] of direcciones)
    rev.push({
      nombre: `Cortante como viga ancha${sufijo}`,
      actuante: x.vigaAncha.actuante,
      limite: x.vigaAncha.resistente,
      unidad: "t",
      tipo: "maximo",
      nota: "A d de la cara de la columna. Si no pasa, aumenta el peralte.",
    });
  for (const [sufijo, x] of direcciones)
    rev.push({
      nombre: `Acero colocado${sufijo}`,
      actuante: x.armado.areaColocada,
      limite: x.aceroDiseno * x.factorFranja,
      unidad: "cm²",
      tipo: "minimo",
      nota: `${x.armado.cantidad} #${x.armado.varilla} @ ${x.armado.separacion.toFixed(1)} cm. El mayor entre el de flexión (Mu = ${x.momento.toFixed(2)} t·m) y el mínimo${x.factorFranja > 1 ? ", con la franja central" : ""}.`,
    });
  return rev;
}

const MATERIALES = {
  recubrimiento: "5",
  fc: "250",
  fy: "4200",
  incremento: "10",
} satisfies Partial<FormularioZapata>;

export const EJEMPLOS_ZAPATA: Ejemplo<FormularioZapata>[] = [
  {
    nombre: "Zapata de casa",
    descripcion:
      "Columna de 30 × 30 con 20 t sobre suelo de 10 t/m². Cuadrada, del lado mínimo.",
    cumple: true,
    valores: {
      ...MATERIALES,
      carga: "20",
      cargaUltima: "28",
      qa: "10",
      c1: "30",
      c2: "30",
      h: "30",
      varilla: "4",
      lado: "",
      largo: "",
      momento: "",
    },
  },
  {
    nombre: "Zapata con momento",
    descripcion: "45 t y 6 t·m en la base, 2.0 × 2.6 m sobre suelo de 15 t/m².",
    cumple: true,
    valores: {
      ...MATERIALES,
      carga: "45",
      cargaUltima: "63",
      qa: "15",
      c1: "40",
      c2: "40",
      h: "40",
      varilla: "5",
      lado: "2",
      largo: "2.6",
      momento: "6",
    },
  },
  {
    nombre: "Peralte muy delgado",
    descripcion:
      "60 t con 20 cm de peralte: no pasa por penetración ni por viga ancha. Sube el peralte hasta que cumpla.",
    cumple: false,
    valores: {
      ...MATERIALES,
      carga: "60",
      cargaUltima: "84",
      qa: "12",
      c1: "35",
      c2: "35",
      h: "20",
      varilla: "4",
      lado: "",
      largo: "",
      momento: "",
    },
  },
];

import type { EntradaColumna, ResultadoColumna } from "@/calc/concreto/columna";
import { CUANTIA_MIN_COLUMNA, varilla } from "@/calc/concreto/ntc";
import type { FormularioColumna } from "@/lib/estudios/columna";
import type { Ejemplo, Revision } from "./tipos";

/**
 * Las revisiones de la columna, con los mismos criterios de `disenarColumna`:
 * todas pasan exactamente cuando `r.cumple` (lo comprueban las pruebas).
 */
export function revisionesColumna(
  e: EntradaColumna,
  r: ResultadoColumna,
): Revision[] {
  const v = varilla(e.varilla)!;
  const est = varilla(e.estribo)!;
  const bx = r.biaxial;
  const amplificacion = bx
    ? Math.max(r.amplificacion, bx.amplificacion)
    : r.amplificacion;
  const rev: Revision[] = [
    {
      nombre: "Esbeltez, kL/r",
      actuante: r.esbeltez,
      limite: 100,
      unidad: "",
      tipo: "maximo",
      decimales: 1,
      nota: "Con k = 1 y r = 0.3 del lado menor. Si no pasa, aumenta la sección.",
    },
    {
      nombre: "Amplificación de momentos",
      actuante: amplificacion,
      limite: 1.4,
      unidad: "",
      tipo: "maximo",
      decimales: 3,
      nota: Number.isFinite(amplificacion)
        ? "δ = 1 / (1 − Pu / 0.75 Pc). Si pasa de 1.4, la columna es muy esbelta para la carga: aumenta la sección."
        : "Pu pasa de 0.75 Pc: la columna se pandearía. Aumenta la sección.",
    },
    {
      nombre: "Carga axial contra la resistente",
      actuante: e.carga,
      limite: r.cargaResistente,
      unidad: "t",
      tipo: "maximo",
      decimales: 1,
      nota: "0.8 FR Po con el acero colocado. Si no pasa, aumenta la sección o f'c.",
    },
  ];
  const resiste = e.carga <= r.cargaResistente + 1e-9;
  if (resiste && bx) {
    rev.push(
      bx.metodo === "bresler"
        ? {
            nombre: "Flexión biaxial (Bresler)",
            actuante: e.carga,
            limite: bx.cargaBresler,
            unidad: "t",
            tipo: "maximo",
            decimales: 1,
            nota: `1/PR = 1/PRx + 1/PRy − 1/PR0, con Mx = ${r.momentoDiseno.toFixed(2)} y My = ${bx.momentoDiseno.toFixed(2)} t·m. Si no pasa, aumenta la sección.`,
          }
        : {
            nombre: "Flexión biaxial, Mx/MRx + My/MRy",
            actuante: bx.indice,
            limite: 1,
            unidad: "",
            tipo: "maximo",
            decimales: 3,
            nota: "Pu < 0.1 PR0, así que se suman las razones de momento. Si no pasa, aumenta la sección.",
          },
    );
  } else if (resiste) {
    rev.push({
      nombre: "Momento de diseño contra el resistente",
      actuante: r.momentoDiseno,
      limite: r.momentoResistente,
      unidad: "t·m",
      tipo: "maximo",
      nota: "Momento amplificado (o el de la excentricidad mínima) contra MR con Pu. Si no pasa, aumenta la sección.",
    });
  }
  rev.push({
    nombre: "Cuantía de acero",
    actuante: r.armado.cuantia * 100,
    limite: CUANTIA_MIN_COLUMNA * 100,
    unidad: "%",
    tipo: "minimo",
    nota: `${r.armado.cantidad} #${r.armado.varilla} (${r.armado.area.toFixed(2)} cm²). Se agregan varillas hasta que resista, sin pasar del 4 %.`,
  });

  // Las varillas de cada cara caben con la separación libre mínima.
  const espacio = Math.max(2.5, 1.5 * v.diametro);
  const libre = (lado: number) => lado - 2 * (e.recubrimiento + est.diametro);
  const caras: [string, number, number][] = bx
    ? [
        ["b", libre(e.b), r.armado.porCaraB ?? 2],
        ["h", libre(e.h), r.armado.porCaraH ?? 2],
      ]
    : [["b", libre(e.b), r.armado.cantidad / 2]];
  for (const [lado, ancho, n] of caras)
    rev.push(
      bx
        ? {
            nombre: `Separación libre en las caras de ${lado}`,
            actuante: (ancho - n * v.diametro) / (n - 1),
            limite: espacio,
            unidad: "cm",
            tipo: "minimo",
            decimales: 1,
            nota: `${n} varillas #${e.varilla} por cara; mínimo 2.5 cm y 1.5 diámetros. Si no caben, usa varilla más gruesa o una sección más grande.`,
          }
        : {
            nombre: "Varillas en cada cara de b",
            actuante: n * v.diametro + (n - 1) * espacio,
            limite: ancho,
            unidad: "cm",
            tipo: "maximo",
            decimales: 1,
            nota: `${n} varillas #${e.varilla} con ${espacio.toFixed(1)} cm libres entre ellas, dentro de los estribos. Si no caben, usa varilla más gruesa o una sección más ancha.`,
          },
    );
  return rev;
}

const MATERIALES = {
  recubrimiento: "4",
  fc: "250",
  fy: "4200",
  estribo: "3",
} satisfies Partial<FormularioColumna>;

export const EJEMPLOS_COLUMNA: Ejemplo<FormularioColumna>[] = [
  {
    nombre: "Columna de casa",
    descripcion: "30 × 30 cm, 2.7 m de altura, 28 t y 1 t·m en planta baja.",
    cumple: true,
    valores: {
      ...MATERIALES,
      carga: "28",
      momento: "1",
      momentoB: "",
      altura: "2.7",
      b: "30",
      h: "30",
      varilla: "5",
    },
  },
  {
    nombre: "Columna de esquina",
    descripcion:
      "40 × 40 cm con momento en las dos direcciones: flexión biaxial con Bresler.",
    cumple: true,
    valores: {
      ...MATERIALES,
      carga: "120",
      momento: "8",
      momentoB: "5",
      altura: "3",
      b: "40",
      h: "40",
      varilla: "6",
    },
  },
  {
    nombre: "Columna muy esbelta",
    descripcion:
      "25 × 25 cm y 4.5 m de altura con 90 t: no pasa. Aumenta la sección.",
    cumple: false,
    valores: {
      ...MATERIALES,
      carga: "90",
      momento: "3",
      momentoB: "",
      altura: "4.5",
      b: "25",
      h: "25",
      varilla: "5",
    },
  },
];

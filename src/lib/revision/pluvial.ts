import type { EntradaPluvial, ResultadoPluvial } from "@/calc/drenaje/pluvial";
import {
  AREA_MAXIMA_POR_BAJADA,
  DIAMETROS_PLUVIAL,
  LLENADO_MAXIMO,
  VACIADO_MAXIMO,
} from "@/calc/drenaje/tablas";
import type { FormularioPluvial } from "@/lib/estudios/pluvial";
import type { Ejemplo, Revision } from "./tipos";

const MAYOR = DIAMETROS_PLUVIAL[DIAMETROS_PLUVIAL.length - 1];

/**
 * Las revisiones del drenaje pluvial, con los mismos criterios de
 * `disenarPluvial`: todas pasan exactamente cuando `r.cumple` (lo comprueban
 * las pruebas). Las de bajadas y número de pozos las dimensiona el programa,
 * así que siempre pasan; se muestran para ver con qué holgura.
 */
export function revisionesPluvial(
  e: EntradaPluvial,
  r: ResultadoPluvial,
): Revision[] {
  const t = r.tuberia;
  const rev: Revision[] = [
    {
      nombre: `Tubería de ${t.diametro} mm al ${LLENADO_MAXIMO * 100} % de su capacidad`,
      actuante: r.gasto,
      limite: LLENADO_MAXIMO * t.capacidad,
      unidad: "L/s",
      tipo: "maximo",
      decimales: 1,
      nota:
        `Q = Σ C·A · i / 3 600 contra ${LLENADO_MAXIMO} Q lleno (Manning, n de PVC); velocidad a tubo lleno ${t.velocidad.toFixed(2)} m/s` +
        (t.velocidad < 0.6 ? ", menor de 0.6 m/s: puede azolvarse." : ".") +
        ` Si no pasa con ${MAYOR} mm, sube la pendiente o divide el predio en dos salidas.`,
    },
  ];
  const b = r.bajadas;
  if (b)
    rev.push(
      {
        nombre: `Gasto de la azotea en ${b.cantidad} bajada${b.cantidad === 1 ? "" : "s"} de ${b.diametro} mm`,
        actuante: b.gasto,
        limite: b.cantidad * b.capacidad,
        unidad: "L/s",
        tipo: "maximo",
        decimales: 1,
        nota: "Wyly-Eaton para tubo vertical. El número de bajadas lo da el programa; con otro diámetro cambia la cantidad.",
      },
      {
        nombre: "Área de azotea por bajada",
        actuante: b.area / b.cantidad,
        limite: AREA_MAXIMA_POR_BAJADA,
        unidad: "m²",
        tipo: "maximo",
        decimales: 1,
        nota: "Una bajada por cada 100 m², para que el agua salga aunque se tape una coladera.",
      },
    );
  const p = r.pozos;
  if (p && e.infiltracion !== undefined)
    rev.push(
      {
        nombre: "Tiempo de vaciado de cada pozo",
        actuante: p.vaciado,
        limite: VACIADO_MAXIMO,
        unidad: "h",
        tipo: "maximo",
        decimales: 1,
        nota: "Volumen del pozo entre lo que infiltran paredes y fondo. Si no pasa, el suelo infiltra poco: usa un pozo más angosto y profundo, o descarga a la calle o a una cisterna.",
      },
      {
        nombre: `Volumen de la tormenta en ${p.cantidad} pozo${p.cantidad === 1 ? "" : "s"}`,
        actuante: r.volumen,
        limite: p.cantidad * p.capacidad,
        unidad: "m³",
        tipo: "maximo",
        decimales: 1,
        nota: "Lo que guarda cada pozo más lo que infiltra durante la tormenta. El número de pozos lo da el programa.",
      },
    );
  return rev;
}

const SIN_CAPTACION = {
  captacion: "",
  lluviaMensual: Array(12).fill(""),
  lluviaAnual: "",
  areaCaptacion: "",
  demandaDiaria: "",
  cisterna: "",
} satisfies Partial<FormularioPluvial>;

export const EJEMPLOS_PLUVIAL: Ejemplo<FormularioPluvial>[] = [
  {
    nombre: "Casa con pozo de absorción",
    descripcion:
      "Azotea de 120 m², patio y jardín, 100 mm/h, suelo arenoso que infiltra 25 mm/h.",
    cumple: true,
    valores: {
      ...SIN_CAPTACION,
      areas: { azotea: "120", pavimento: "40", jardin: "60" },
      intensidad: "100",
      duracion: "60",
      pendiente: "1",
      infiltracion: "25",
      diametroPozo: "1.5",
      profundidadPozo: "3",
      diametroBajada: "100",
    },
  },
  {
    nombre: "Casa en Cuernavaca con captación",
    descripcion:
      "Azotea de 150 m² a la calle, lluvia mensual de Cuernavaca y cisterna de 10 m³ para excusados y riego de 5 personas.",
    cumple: true,
    valores: {
      ...SIN_CAPTACION,
      areas: { azotea: "150", pavimento: "30", jardin: "40" },
      intensidad: "120",
      duracion: "30",
      pendiente: "1.5",
      infiltracion: "",
      diametroBajada: "100",
      captacion: "si",
      lluviaMensual: [
        "10",
        "5",
        "5",
        "15",
        "75",
        "245",
        "255",
        "240",
        "230",
        "90",
        "15",
        "5",
      ],
      coeficienteTecho: "0.85",
      personas: "5",
      dotacion: "50",
      cisterna: "10",
    },
  },
  {
    nombre: "Suelo arcilloso",
    descripcion:
      "Lo mismo que la casa, pero el suelo infiltra 3 mm/h: el pozo tarda días en vaciarse. Manda el agua a la calle (deja vacía la infiltración) o busca un estrato más permeable.",
    cumple: false,
    valores: {
      ...SIN_CAPTACION,
      areas: { azotea: "120", pavimento: "40", jardin: "60" },
      intensidad: "100",
      duracion: "60",
      pendiente: "1",
      infiltracion: "3",
      diametroPozo: "1.5",
      profundidadPozo: "3",
      diametroBajada: "100",
    },
  },
];

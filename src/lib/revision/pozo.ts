import type { EntradaPozo, ResultadoPozo } from "@/calc/pozos/pozo";
import {
  ADEMES,
  BOMBAS_HP,
  VELOCIDAD_COLUMNA,
  VELOCIDAD_ENTRADA,
} from "@/calc/pozos/tablas";
import type { FormularioPozo } from "@/lib/estudios/pozo";
import type { Ejemplo, Revision } from "./tipos";

const GASTO_MAXIMO = ADEMES[ADEMES.length - 1].hasta;
const BOMBA_MAXIMA = BOMBAS_HP[BOMBAS_HP.length - 1];

/**
 * Las revisiones del pozo, con los mismos criterios de `disenarPozo`: todas
 * pasan exactamente cuando `r.cumple` (lo comprueban las pruebas).
 */
export function revisionesPozo(e: EntradaPozo, r: ResultadoPozo): Revision[] {
  const rev: Revision[] = [
    {
      nombre: "Bomba arriba del fondo del pozo",
      actuante: r.colocacion,
      // La bomba se coloca en metros enteros: el más hondo que queda arriba del fondo.
      limite: Math.ceil(e.profundidad) - 1,
      unidad: "m",
      tipo: "maximo",
      decimales: 0,
      nota: `Nivel dinámico de ${r.nivelDinamico.toFixed(2)} m (estático ${e.nivelEstatico} m + abatimiento de ${r.abatimientoDiseno.toFixed(2)} m a ${e.horasBombeo} h) más ${e.sumergencia} m de sumergencia, contra el último metro entero arriba del fondo (${e.profundidad} m). Si no pasa, baja el gasto de diseño o las horas de bombeo continuo.`,
    },
    {
      nombre: "Gasto de diseño contra la tabla de ademes",
      actuante: e.gastoDiseno,
      limite: GASTO_MAXIMO,
      unidad: "L/s",
      tipo: "maximo",
      nota: `La tabla llega a ${GASTO_MAXIMO} L/s con ademe de ${ADEMES[ADEMES.length - 1].pulgadas}". La rejilla necesita al menos ${r.rejilla.longitudMinima.toFixed(2)} m para que el agua entre a ${VELOCIDAD_ENTRADA} m/s o menos.`,
    },
    {
      nombre: "Velocidad en la columna",
      actuante: r.columna.velocidad,
      limite: VELOCIDAD_COLUMNA,
      unidad: "m/s",
      tipo: "maximo",
      nota: `Gasto de diseño en columna de ${r.columna.nominal}. Si no pasa, baja el gasto: la tabla llega a 6".`,
    },
    {
      nombre: "Potencia de la bomba sumergible",
      actuante: r.potencia,
      limite: BOMBA_MAXIMA,
      unidad: "HP",
      tipo: "maximo",
      decimales: 1,
      nota: `Q · H / (76 η) con ${r.carga.toFixed(1)} m de carga dinámica total.`,
    },
  ];
  const x = r.extraccion;
  if (x.concesionado !== undefined)
    rev.push({
      nombre: "Extracción anual contra el título de concesión",
      actuante: x.anual,
      limite: x.concesionado,
      unidad: "m³/año",
      tipo: "maximo",
      decimales: 0,
      nota: `${r.energia.horasDia} h/día por ${r.energia.diasAno} días al año. Si no pasa, baja el gasto, las horas o los días de bombeo.`,
    });
  return rev;
}

const lecturas = (pares: [number, number][]) =>
  pares.map(([t, s]) => ({ t: String(t), s: s.toFixed(2) }));

export const EJEMPLOS_POZO: Ejemplo<FormularioPozo>[] = [
  {
    nombre: "Pozo para agua potable",
    descripcion:
      "Prueba a 10 L/s, nivel estático a 30 m y 120 m de profundidad; se diseña para 8 L/s.",
    cumple: true,
    valores: {
      gastoPrueba: "10",
      lecturas: lecturas([
        [1, 1.2],
        [2, 1.6],
        [5, 2.3],
        [10, 2.8],
        [20, 3.04],
        [50, 3.36],
        [100, 3.6],
        [200, 3.84],
        [500, 4.16],
        [1000, 4.4],
      ]),
      desde: "10",
      radioObservacion: "",
      nivelEstatico: "30",
      profundidad: "120",
      gastoDiseno: "8",
      horasBombeo: "24",
      sumergencia: "3",
      longitudDescarga: "20",
      cargaDescarga: "5",
      aberturaRejilla: "15",
      horasDia: "",
      diasAno: "",
      eficienciaMotor: "",
      tarifa: "2.5",
      volumenConcesionado: "",
    },
  },
  {
    nombre: "Pozo agrícola con concesión",
    descripcion:
      "Riego con 30 L/s, 12 h al día y 240 días al año, dentro de un título de 350,000 m³/año.",
    cumple: true,
    valores: {
      gastoPrueba: "32",
      lecturas: lecturas([
        [1, 2.1],
        [3, 3.0],
        [10, 3.9],
        [30, 4.5],
        [60, 4.85],
        [120, 5.2],
        [240, 5.55],
        [480, 5.9],
        [960, 6.25],
        [1440, 6.45],
      ]),
      desde: "30",
      radioObservacion: "",
      nivelEstatico: "60",
      profundidad: "200",
      gastoDiseno: "30",
      horasBombeo: "12",
      sumergencia: "6",
      longitudDescarga: "80",
      cargaDescarga: "3",
      aberturaRejilla: "12",
      horasDia: "12",
      diasAno: "240",
      eficienciaMotor: "",
      tarifa: "0.9",
      volumenConcesionado: "350000",
    },
  },
  {
    nombre: "Pozo somero sobreexplotado",
    descripcion:
      "Se piden 15 L/s de un acuífero pobre en un pozo de 45 m: la bomba quedaría en el fondo. Baja el gasto de diseño.",
    cumple: false,
    valores: {
      gastoPrueba: "6",
      lecturas: lecturas([
        [1, 2.5],
        [2, 3.6],
        [5, 5.0],
        [10, 6.0],
        [20, 6.9],
        [50, 8.1],
        [100, 9.0],
        [200, 9.9],
        [500, 11.1],
      ]),
      desde: "10",
      radioObservacion: "",
      nivelEstatico: "18",
      profundidad: "45",
      gastoDiseno: "15",
      horasBombeo: "24",
      sumergencia: "3",
      longitudDescarga: "30",
      cargaDescarga: "4",
      aberturaRejilla: "15",
      horasDia: "",
      diasAno: "",
      eficienciaMotor: "",
      tarifa: "2.5",
      volumenConcesionado: "",
    },
  },
];

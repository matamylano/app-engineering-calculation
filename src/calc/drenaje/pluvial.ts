/**
 * Drenaje pluvial de un predio: gasto por el método racional, diámetro de
 * la tubería con Manning y, si el agua se infiltra, pozos de absorción.
 */
import {
  DIAMETROS_PLUVIAL,
  LLENADO_MAXIMO,
  MANNING_PVC,
  SUPERFICIES,
  VACIADO_MAXIMO,
  type Superficie,
} from "./tablas";

export interface EntradaPluvial {
  /** Áreas por tipo de superficie (m²). */
  areas: Record<Superficie, number>;
  /** Intensidad de lluvia de diseño (mm/h) y duración de la tormenta (min). */
  intensidad: number;
  duracion: number;
  /** Pendiente de la tubería (%). */
  pendiente: number;
  /** Pozos de absorción: sin tasa de infiltración no se calculan. */
  infiltracion?: number; // mm/h
  diametroPozo: number; // m
  profundidadPozo: number; // m
}

export interface ResultadoPluvial {
  areaEfectiva: number;
  /** L/s */
  gasto: number;
  tuberia: { diametro: number; capacidad: number; velocidad: number };
  /** m³ */
  volumen: number;
  pozos?: { almacenamiento: number; infiltracion: number; capacidad: number; cantidad: number; vaciado: number };
  problemas: string[];
  advertencias: string[];
  cumple: boolean;
}

function revisar(valor: number, nombre: string, min = 0, max = Infinity) {
  if (!Number.isFinite(valor) || valor <= min) throw new RangeError(`${nombre} debe ser mayor que ${min}.`);
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

/** Capacidad a tubo lleno (L/s) y velocidad (m/s) con Manning. */
export function tuboLleno(diametroMm: number, pendiente: number, n = MANNING_PVC) {
  const d = diametroMm / 1000;
  const area = (Math.PI * d * d) / 4;
  const velocidad = (1 / n) * (d / 4) ** (2 / 3) * Math.sqrt(pendiente / 100);
  return { capacidad: velocidad * area * 1000, velocidad };
}

export function disenarPluvial(e: EntradaPluvial): ResultadoPluvial {
  for (const [k, a] of Object.entries(e.areas)) {
    if (!(k in SUPERFICIES) || !(a >= 0) || a > 100_000) throw new RangeError("Revisa las áreas.");
  }
  revisar(e.intensidad, "La intensidad de lluvia", 0, 500);
  revisar(e.duracion, "La duración de la tormenta", 0, 1440);
  revisar(e.pendiente, "La pendiente", 0, 20);
  const problemas: string[] = [];
  const advertencias: string[] = [];

  const areaEfectiva = (Object.keys(SUPERFICIES) as Superficie[]).reduce((s, k) => s + SUPERFICIES[k].c * e.areas[k], 0);
  if (!(areaEfectiva > 0)) throw new RangeError("Captura al menos un área.");
  const gasto = (areaEfectiva * e.intensidad) / 3600;

  const opciones = DIAMETROS_PLUVIAL.map((d) => ({ diametro: d, ...tuboLleno(d, e.pendiente) }));
  const tuberia = opciones.find((t) => LLENADO_MAXIMO * t.capacidad >= gasto) ?? opciones[opciones.length - 1];
  if (LLENADO_MAXIMO * tuberia.capacidad < gasto) problemas.push("el gasto pasa de lo que lleva un tubo de 450 mm");
  if (tuberia.velocidad < 0.6) advertencias.push("la velocidad a tubo lleno es menor de 0.6 m/s; puede azolvarse");

  const volumen = (gasto * e.duracion * 60) / 1000;

  let pozos: ResultadoPluvial["pozos"];
  if (e.infiltracion !== undefined) {
    revisar(e.infiltracion, "La tasa de infiltración", 0, 5000);
    revisar(e.diametroPozo, "El diámetro del pozo", 0.3, 5);
    revisar(e.profundidadPozo, "La profundidad útil del pozo", 0.5, 30);
    const fondo = (Math.PI * e.diametroPozo ** 2) / 4;
    const almacenamiento = fondo * e.profundidadPozo;
    const infiltracion = (e.infiltracion / 1000) * (Math.PI * e.diametroPozo * e.profundidadPozo + fondo); // m³/h
    const capacidad = almacenamiento + (infiltracion * e.duracion) / 60;
    const vaciado = almacenamiento / infiltracion;
    pozos = { almacenamiento, infiltracion, capacidad, cantidad: Math.ceil(volumen / capacidad - 1e-9), vaciado };
    if (vaciado > VACIADO_MAXIMO) problemas.push(`cada pozo tarda más de ${VACIADO_MAXIMO} h en vaciarse; el suelo infiltra poco`);
  }

  return { areaEfectiva, gasto, tuberia, volumen, pozos, problemas, advertencias, cumple: problemas.length === 0 };
}

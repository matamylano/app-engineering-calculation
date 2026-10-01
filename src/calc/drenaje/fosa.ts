/**
 * Fosa séptica de una vivienda con el método de la NBR 7229, sus medidas
 * y el campo de infiltración del efluente.
 */
import {
  ACUMULACION,
  ANCHO_ZANJA,
  BIODIGESTORES,
  LARGO_MAXIMO_ZANJA,
  LODO_FRESCO,
  PROFUNDIDADES,
  RETENCION,
} from "./tablas";

export interface EntradaFosa {
  habitantes: number;
  /** Aportación de aguas negras (L/hab/día). */
  aportacion: number;
  /** Años entre limpiezas (1 a 5). */
  limpieza: number;
  /** Temperatura media del mes más frío (°C). */
  temperatura: number;
  /** Profundidad útil propuesta (m). */
  profundidad: number;
  /** Tasa de aplicación del suelo según la prueba de percolación (L/m²/día). */
  tasaAplicacion: number;
}

export interface ResultadoFosa {
  contribucion: number;
  retencion: number;
  acumulacion: number;
  /** L */
  volumen: number;
  profundidades: { minima: number; maxima: number };
  medidas: { ancho: number; largo: number; volumenConstruido: number };
  biodigestor: number | null;
  campo: { area: number; longitud: number; zanjas: number };
  problemas: string[];
  cumple: boolean;
}

function revisar(valor: number, nombre: string, min = 0, max = Infinity) {
  if (!Number.isFinite(valor) || valor <= min) throw new RangeError(`${nombre} debe ser mayor que ${min}.`);
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

const arriba5cm = (m: number) => Math.ceil(m * 20 - 1e-9) / 20;

export function disenarFosa(e: EntradaFosa): ResultadoFosa {
  revisar(e.habitantes, "El número de habitantes", 0, 100);
  revisar(e.aportacion, "La aportación", 0, 500);
  if (!Number.isInteger(e.limpieza) || !ACUMULACION[e.limpieza]) throw new RangeError("La limpieza debe ser de 1 a 5 años.");
  if (!Number.isFinite(e.temperatura) || e.temperatura < -10 || e.temperatura > 45)
    throw new RangeError("Revisa la temperatura media.");
  revisar(e.profundidad, "La profundidad útil", 0.5, 4);
  revisar(e.tasaAplicacion, "La tasa de aplicación", 0, 500);
  const problemas: string[] = [];

  const contribucion = e.habitantes * e.aportacion;
  const retencion = RETENCION.find((r) => contribucion <= r.hasta)!.dias;
  const k = ACUMULACION[e.limpieza];
  const acumulacion = e.temperatura <= 10 ? k.frio : e.temperatura <= 20 ? k.templado : k.calido;
  const volumen = 1000 + e.habitantes * (e.aportacion * retencion + acumulacion * LODO_FRESCO);

  const profundidades = PROFUNDIDADES.find((p) => volumen / 1000 <= p.hasta)!;
  if (e.profundidad < profundidades.minima || e.profundidad > profundidades.maxima)
    problemas.push(
      `la profundidad útil debe estar entre ${profundidades.minima} y ${profundidades.maxima} m para este volumen`,
    );

  // Planta rectangular con el largo del doble del ancho.
  const area = volumen / 1000 / e.profundidad;
  const ancho = arriba5cm(Math.sqrt(area / 2));
  const largo = arriba5cm(area / ancho);
  const biodigestor = BIODIGESTORES.find((b) => b >= volumen) ?? null;

  const areaCampo = contribucion / e.tasaAplicacion;
  const longitud = areaCampo / ANCHO_ZANJA;

  return {
    contribucion,
    retencion,
    acumulacion,
    volumen,
    profundidades: { minima: profundidades.minima, maxima: profundidades.maxima },
    medidas: { ancho, largo, volumenConstruido: ancho * largo * e.profundidad * 1000 },
    biodigestor,
    campo: { area: areaCampo, longitud, zanjas: Math.ceil(longitud / LARGO_MAXIMO_ZANJA - 1e-9) },
    problemas,
    cumple: problemas.length === 0,
  };
}

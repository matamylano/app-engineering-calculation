/**
 * Losa maciza en una dirección, diseñada como franja de 1 m de ancho.
 *
 * Unidades de captura: claro en m, espesor y recubrimiento en cm, cargas en
 * kg/m², f'c y fy en kg/cm². Por dentro se trabaja en kg y cm. Sirve cuando
 * el lado largo es al menos el doble del corto o la losa apoya en dos bordes.
 */
import { INCREMENTO_COLADO, INCREMENTO_MORTERO } from "@/calc/cargas/bajada";
import {
  aceroPorFlexion,
  aceroTemperatura,
  cortanteVigaAncha,
  cuantiaMinima,
  separacionMaxima,
  varilla,
} from "./ntc";
import { APOYOS, FACTOR_MUERTA, FACTOR_VIVA, PESO_CONCRETO, type Apoyo } from "./viga";

/** Espesor mínimo para no revisar deflexiones, como L / n, en losas en una dirección. */
export const ESPESOR_MINIMO: Record<Apoyo, number> = {
  simple: 20,
  "un-extremo-continuo": 24,
  "ambos-continuos": 28,
  voladizo: 10,
};

export interface EntradaLosa {
  /** Claro libre en la dirección corta (m). */
  claro: number;
  apoyo: Apoyo;
  /** Espesor (cm). */
  h: number;
  /** Recubrimiento libre (cm). */
  recubrimiento: number;
  /** Carga muerta sin el peso de la losa (acabados, muros, instalaciones) y carga viva (kg/m²). */
  muerta: number;
  viva: number;
  /** La losa se cuela en el lugar con capa de mortero: suma los incrementos de las NTC. */
  incrementos: boolean;
  fc: number;
  fy: number;
  varilla: number;
}

export interface Armado {
  /** Momento último por metro (t·m/m). */
  momento: number;
  /** Acero requerido y de diseño (cm²/m). */
  requerido: number;
  diseno: number;
  /** Separación (cm) y área colocada (cm²/m). */
  separacion: number;
  areaColocada: number;
}

export interface ResultadoLosa {
  pesoPropio: number;
  /** Carga muerta total, de servicio y última (kg/m²). */
  muertaTotal: number;
  cargaUltima: number;
  d: number;
  aceroMinimo: number;
  separacionMaxima: number;
  negativo: Armado;
  positivo: Armado;
  /** Acero por temperatura en la dirección larga. */
  temperatura: Armado;
  cortante: { actuante: number; resistente: number; cumple: boolean };
  espesorMinimo: number;
  cumple: boolean;
}

function revisar(valor: number, nombre: string, min = 0, max = Infinity) {
  if (!Number.isFinite(valor) || valor <= min) throw new RangeError(`${nombre} debe ser mayor que ${min}.`);
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

const redondearAbajo = (x: number, paso: number) => Math.floor(x / paso + 1e-9) * paso;

export function disenarLosa(e: EntradaLosa): ResultadoLosa {
  const apoyo = APOYOS[e.apoyo];
  if (!apoyo) throw new RangeError("Tipo de apoyo desconocido.");
  revisar(e.claro, "El claro", 0, 8);
  revisar(e.h, "El espesor de la losa", 5, 40);
  revisar(e.recubrimiento, "El recubrimiento", 1, 5);
  if (!(e.muerta >= 0) || !(e.viva >= 0)) throw new RangeError("Las cargas no pueden ser negativas.");
  revisar(e.fc, "f'c", 140, 700);
  revisar(e.fy, "fy", 2000, 6000);
  const v = varilla(e.varilla);
  if (!v) throw new RangeError("Varilla no disponible.");

  const pesoPropio = (e.h / 100) * PESO_CONCRETO * 1000; // kg/m²
  const incrementos = e.incrementos ? INCREMENTO_COLADO + INCREMENTO_MORTERO : 0;
  const muertaTotal = pesoPropio + incrementos + e.muerta;
  const cargaUltima = FACTOR_MUERTA * muertaTotal + FACTOR_VIVA * e.viva; // kg/m²
  const wu = cargaUltima / 100; // kg/cm en una franja de 100 cm
  const L = e.claro * 100;
  const b = 100;

  const d = e.h - e.recubrimiento - v.diametro / 2;
  if (d <= 0) throw new RangeError("El espesor no alcanza para el recubrimiento.");

  const aceroMinimo = Math.max(cuantiaMinima(e.fc, e.fy) * b * d, aceroTemperatura(e.h, e.fy) * b);
  const sMax = separacionMaxima(e.h);

  const armar = (requerido: number, minimo: number, momento: number): Armado => {
    const diseno = Math.max(requerido, minimo);
    const separacion = redondearAbajo(Math.min((b * v.area) / diseno, sMax), 2.5);
    if (separacion < 7.5) throw new RangeError("El acero queda muy junto: aumenta el espesor o usa varilla más gruesa.");
    return { momento, requerido, diseno, separacion, areaColocada: (b * v.area) / separacion };
  };
  const flexion = (coef: number) => {
    const mu = coef ? (wu * L * L) / coef : 0; // kg·cm por metro
    const requerido = aceroPorFlexion(mu, b, d, e.fc, e.fy);
    if (requerido === null) throw new RangeError("La losa no resiste el momento: aumenta el espesor.");
    return armar(requerido, aceroMinimo, mu / 1e5);
  };
  const negativo = flexion(apoyo.negativo);
  const positivo = flexion(apoyo.positivo);
  const temperatura = armar(0, aceroTemperatura(e.h, e.fy) * b, 0);

  const vu = Math.max((apoyo.cortante * wu * L) / 2 - wu * d, 0); // kg
  const vr = cortanteVigaAncha(e.fc) * b * d;
  const cortante = { actuante: vu / 1000, resistente: vr / 1000, cumple: vu <= vr };

  return {
    pesoPropio,
    muertaTotal,
    cargaUltima,
    d,
    aceroMinimo,
    separacionMaxima: sMax,
    negativo,
    positivo,
    temperatura,
    cortante,
    espesorMinimo: L / ESPESOR_MINIMO[e.apoyo],
    cumple: cortante.cumple,
  };
}

/**
 * Losa maciza en una dirección, diseñada como franja de 1 m de ancho.
 *
 * Unidades de captura: claro en m, espesor y recubrimiento en cm, cargas en
 * kg/m², f'c y fy en kg/cm². Por dentro se trabaja en kg y cm. Sirve cuando
 * el lado largo es al menos el doble del corto o la losa apoya en dos bordes.
 */
import { INCREMENTO_COLADO, INCREMENTO_MORTERO } from "@/calc/cargas/bajada";
import { kgPorMetro, type Partida } from "@/calc/obra/cuantificacion";
import { calcularFlecha, FRACCION_VIVA_SOSTENIDA, type ResultadoFlecha } from "./deflexiones";
import {
  aceroPorFlexion,
  aceroTemperatura,
  cortanteVigaAncha,
  cuantiaMinima,
  separacionMaxima,
  varilla,
} from "./ntc";
import {
  anclajeGancho,
  APOYOS,
  EXTREMOS_CONTINUOS,
  FACTOR_MUERTA,
  FACTOR_VIVA,
  flechaObligatoria,
  PESO_CONCRETO,
  type Apoyo,
} from "./viga";

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
  /** Fracción de la carga viva que actúa de forma sostenida, para la flecha diferida (0 a 1). */
  vivaSostenida?: number;
  /** La flecha puede dañar muros o acabados frágiles: límite L / 480 + 0.3 cm. */
  elementosFragiles?: boolean;
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
  /** Flechas de la franja de 1 m con cargas de servicio (no está en memorias anteriores). */
  deflexion?: ResultadoFlecha;
  /** La flecha excede el límite y el espesor es menor que el mínimo: no pasa. */
  flechaExcedida?: boolean;
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

  // Flechas de la franja de 1 m, solo con el acero de tensión de cada sección.
  const fraccion = e.vivaSostenida ?? FRACCION_VIVA_SOSTENIDA;
  if (!(fraccion >= 0 && fraccion <= 1)) throw new RangeError("La parte sostenida de la carga viva debe estar entre 0 y 100 %.");
  const w = (muertaTotal + e.viva) / 100; // kg/cm
  const seccion = (As: number) => ({ b, h: e.h, d, dc: e.recubrimiento, As, Asc: 0 });
  const deflexion = calcularFlecha({
    caso: e.apoyo === "voladizo" ? "voladizo" : "tramo",
    extremosContinuos: EXTREMOS_CONTINUOS[e.apoyo],
    L,
    w,
    wSostenida: (muertaTotal + fraccion * e.viva) / 100,
    mCentro: apoyo.positivo ? (w * L * L) / apoyo.positivo : 0,
    mApoyo: apoyo.negativo ? (w * L * L) / apoyo.negativo : 0,
    fc: e.fc,
    centro: seccion(positivo.areaColocada),
    apoyo: seccion(negativo.areaColocada),
    elementosFragiles: e.elementosFragiles ?? false,
  });
  const espesorMinimo = L / ESPESOR_MINIMO[e.apoyo];
  const flechaExcedida = flechaObligatoria(e.h, espesorMinimo, deflexion);

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
    espesorMinimo,
    deflexion,
    flechaExcedida,
    cumple: cortante.cumple && !flechaExcedida,
  };
}

/** Por qué no pasa la losa, en palabras para el usuario. */
export function problemasLosa(r: ResultadoLosa): string[] {
  const p: string[] = [];
  if (!r.cortante.cumple) p.push("el cortante excede lo que resiste el concreto; aumenta el espesor");
  if (r.flechaExcedida) p.push("la flecha excede el límite de las NTC; aumenta el espesor");
  return p;
}

/** Longitud de los bastones de acero negativo dentro del tablero, como fracción del claro. */
export const BASTON = 0.25;

/**
 * Cuantificación de un tablero de claro L × largo (sin desperdicio): concreto,
 * acero principal abajo corrido con gancho en cada apoyo, bastones arriba en
 * los dos apoyos (L / 4 dentro del tablero más el gancho; en voladizo corren
 * todo el claro), acero por temperatura en la dirección larga sin ganchos,
 * y cimbra de fondo. No incluye traslapes. `largo` en m.
 */
export function partidasLosa(e: EntradaLosa, r: ResultadoLosa, largo: number): Partida[] {
  if (!(largo > 0) || largo > 50) throw new RangeError("El largo del tablero debe ser mayor que 0 y no pasar de 50 m.");
  const L = e.claro;
  const gancho = anclajeGancho(e.varilla, e.fy, e.fc) / 100; // m
  const kg = kgPorMetro(e.varilla);
  const piezas = (ancho: number, s: number) => Math.ceil((ancho * 100) / s - 1e-9) + 1;
  const abajo = piezas(largo, r.positivo.separacion);
  const arriba = piezas(largo, r.negativo.separacion);
  const temp = piezas(L, r.temperatura.separacion);
  const voladizo = e.apoyo === "voladizo";
  const partidas: Partida[] = [
    { concepto: `Concreto f'c = ${e.fc} kg/cm²`, material: "concreto", cantidad: L * largo * (e.h / 100) },
    { concepto: `Acero abajo #${e.varilla} @ ${r.positivo.separacion} cm`, material: "acero", cantidad: abajo * (L + 2 * gancho) * kg },
    {
      concepto: `Acero arriba #${e.varilla} @ ${r.negativo.separacion} cm`,
      material: "acero",
      cantidad: voladizo ? arriba * (L + gancho) * kg : 2 * arriba * (BASTON * L + gancho) * kg,
    },
    { concepto: `Temperatura #${e.varilla} @ ${r.temperatura.separacion} cm`, material: "acero", cantidad: temp * largo * kg },
    { concepto: "Cimbra de fondo", material: "cimbra", cantidad: L * largo },
  ];
  return partidas;
}

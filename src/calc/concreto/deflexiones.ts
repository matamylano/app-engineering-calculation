/**
 * Deflexiones de vigas y losas en una dirección de concreto reforzado con
 * carga uniforme. Todo en kg y cm.
 *
 * Criterio (NTC para Diseño y Construcción de Estructuras de Concreto, CDMX,
 * sección de deflexiones; es el mismo método del ACI 318):
 * - Flecha inmediata con el momento de inercia efectivo de Branson:
 *   Ie = (Mag / Ma)³ Ig + [1 − (Mag / Ma)³] Iag ≤ Ig, con Mag = ff Ig / (h / 2),
 *   ff = 2 √f'c (concreto clase 1) e Iag el de la sección agrietada transformada.
 * - En tramos continuos se promedia Ie = (Ie1 + Ie2 + 2 Iec) / 4 con los de los
 *   extremos y el del centro; en el extremo discontinuo de un claro extremo se
 *   toma el del centro (más conservador que tomar Ig, donde casi no hay momento).
 * - Flecha diferida = flecha inmediata bajo la carga sostenida × 2 / (1 + 50 p'),
 *   con p' la cuantía del acero de compresión (concreto clase 1).
 * - Límite (NTC Criterios y Acciones, estado límite de servicio): L / 240 + 0.5 cm,
 *   o L / 480 + 0.3 cm si la flecha daña elementos no estructurales (muros,
 *   acabados frágiles); en voladizos los límites se duplican.
 */
import { ES, moduloConcreto } from "./ntc";

/** Módulo de rotura para calcular el momento de agrietamiento (clase 1): ff = 2 √f'c. */
export const moduloRotura = (fc: number) => 2 * Math.sqrt(fc);

/** Factor de flecha diferida, concreto clase 1: 2 / (1 + 50 p'). */
export const factorDiferido = (cuantiaCompresion: number) => 2 / (1 + 50 * Math.max(0, cuantiaCompresion));

/** Límite de flecha total (cm) para un claro L en cm. */
export function limiteFlecha(L: number, voladizo: boolean, elementosFragiles: boolean) {
  const base = elementosFragiles ? L / 480 + 0.3 : L / 240 + 0.5;
  return voladizo ? 2 * base : base;
}

export interface SeccionFlecha {
  /** Ancho y peralte total (cm). */
  b: number;
  h: number;
  /** Peralte efectivo al acero de tensión y profundidad del acero de compresión (cm). */
  d: number;
  dc: number;
  /** Acero de tensión y de compresión (cm²). */
  As: number;
  Asc: number;
}

/**
 * Sección agrietada transformada: profundidad del eje neutro c (cm) e
 * inercia Iag (cm⁴). El acero de compresión entra con (n − 1).
 * b c² / 2 + (n − 1) As' (c − d') = n As (d − c).
 */
export function inerciaAgrietada(s: SeccionFlecha, n: number) {
  const a = s.b / 2;
  const bq = (n - 1) * s.Asc + n * s.As;
  const cq = -((n - 1) * s.Asc * s.dc + n * s.As * s.d);
  const c = (-bq + Math.sqrt(bq * bq - 4 * a * cq)) / (2 * a);
  const I = (s.b * c ** 3) / 3 + (n - 1) * s.Asc * (c - s.dc) ** 2 + n * s.As * (s.d - c) ** 2;
  return { c, I };
}

/** Inercia efectiva de Branson; Ma en kg·cm. */
export function inerciaEfectiva(Ig: number, Iag: number, Mag: number, Ma: number) {
  if (Ma <= Mag) return Ig;
  const r = (Mag / Ma) ** 3;
  return Math.min(Ig, r * Ig + (1 - r) * Iag);
}

export interface EntradaFlecha {
  /** "tramo" (apoyado en sus dos extremos) o "voladizo". */
  caso: "tramo" | "voladizo";
  /** Extremos continuos del tramo (0, 1 o 2); no aplica al voladizo. */
  extremosContinuos: 0 | 1 | 2;
  /** Claro libre (cm). */
  L: number;
  /** Carga de servicio total y la parte sostenida (kg/cm). */
  w: number;
  wSostenida: number;
  /** Momentos de servicio al centro del claro y en el apoyo continuo o empotrado (kg·cm, positivos). */
  mCentro: number;
  mApoyo: number;
  fc: number;
  /** Sección al centro (acero de tensión abajo) y en el apoyo (tensión arriba). */
  centro: SeccionFlecha;
  apoyo: SeccionFlecha;
  elementosFragiles: boolean;
}

export interface ResultadoFlecha {
  /** Módulo del concreto (kg/cm²) y relación modular. */
  ec: number;
  n: number;
  /** Inercias (cm⁴). */
  ig: number;
  iagCentro: number;
  iagApoyo: number;
  ieCentro: number;
  ieApoyo: number;
  ie: number;
  /** Momento de agrietamiento (t·m). */
  mag: number;
  /** Flechas (cm). */
  inmediata: number;
  inmediataSostenida: number;
  factorDiferido: number;
  diferida: number;
  total: number;
  limite: number;
  cumple: boolean;
}

export function calcularFlecha(e: EntradaFlecha): ResultadoFlecha {
  const ec = moduloConcreto(e.fc);
  const n = ES / ec;
  const { b, h } = e.centro;
  const ig = (b * h ** 3) / 12;
  const mag = (moduloRotura(e.fc) * ig) / (h / 2);

  const iagCentro = inerciaAgrietada(e.centro, n).I;
  const iagApoyo = inerciaAgrietada(e.apoyo, n).I;
  const ieCentro = inerciaEfectiva(ig, iagCentro, mag, e.mCentro);
  const ieApoyo = inerciaEfectiva(ig, iagApoyo, mag, e.mApoyo);

  let ie: number;
  let inmediata: number;
  let compresion: SeccionFlecha;
  if (e.caso === "voladizo") {
    // Flecha en la punta: w L⁴ / (8 E I).
    ie = ieApoyo;
    inmediata = (e.w * e.L ** 4) / (8 * ec * ie);
    compresion = e.apoyo;
  } else {
    ie = e.extremosContinuos === 0 ? ieCentro : e.extremosContinuos === 1 ? (ieApoyo + 3 * ieCentro) / 4 : (ieApoyo + ieCentro) / 2;
    // Tramo con momentos en los extremos (diagrama parabólico):
    // δ = 5 L² / (48 E I) · [Mc − 0.1 (M1 + M2)]; sin continuidad es 5 w L⁴ / 384 E I.
    const extremos = e.extremosContinuos * e.mApoyo;
    inmediata = ((5 * e.L ** 2) / (48 * ec * ie)) * Math.max(e.mCentro - 0.1 * extremos, 0);
    compresion = e.centro;
  }
  // La flecha bajo la carga sostenida se toma proporcional a la carga, con la misma Ie.
  const inmediataSostenida = e.w > 0 ? (inmediata * e.wSostenida) / e.w : 0;
  const fd = factorDiferido(compresion.Asc / (compresion.b * compresion.d));
  const diferida = fd * inmediataSostenida;
  const total = inmediata + diferida;
  const limite = limiteFlecha(e.L, e.caso === "voladizo", e.elementosFragiles);
  return {
    ec,
    n,
    ig,
    iagCentro,
    iagApoyo,
    ieCentro,
    ieApoyo,
    ie,
    mag: mag / 1e5,
    inmediata,
    inmediataSostenida,
    factorDiferido: fd,
    diferida,
    total,
    limite,
    cumple: total <= limite + 1e-9,
  };
}

/** Fracción de la carga viva que se considera sostenida si no se dice otra cosa: W / Wm ≈ 80 / 190 (habitación). */
export const FRACCION_VIVA_SOSTENIDA = 0.4;

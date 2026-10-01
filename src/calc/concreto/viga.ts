/**
 * Viga rectangular de concreto reforzado con carga uniforme.
 *
 * Unidades de captura: claro en m, cargas en t/m, sección y recubrimiento en
 * cm, f'c y fy en kg/cm². Por dentro se trabaja en kg y cm. Los momentos y
 * cortantes salen de coeficientes según cómo se apoya la viga; da el acero
 * de tensión arriba y abajo, y los estribos.
 */
import {
  aceroPorFlexion,
  cuantiaMaxima,
  cuantiaMinima,
  FR_CORTANTE,
  varilla,
} from "./ntc";

export type Apoyo = "simple" | "un-extremo-continuo" | "ambos-continuos" | "voladizo";

/**
 * Coeficientes de momento (wu L² / c) y de cortante (V = k wu L / 2), y
 * peralte mínimo para no revisar deflexiones (L / h). 0 = sin momento.
 */
export const APOYOS: Record<Apoyo, { nombre: string; negativo: number; positivo: number; cortante: number; peralte: number }> = {
  simple: { nombre: "Simplemente apoyada", negativo: 0, positivo: 8, cortante: 1, peralte: 16 },
  "un-extremo-continuo": { nombre: "Claro extremo (un extremo continuo)", negativo: 10, positivo: 14, cortante: 1.15, peralte: 18.5 },
  "ambos-continuos": { nombre: "Claro interior (ambos extremos continuos)", negativo: 11, positivo: 16, cortante: 1, peralte: 21 },
  voladizo: { nombre: "Voladizo", negativo: 2, positivo: 0, cortante: 2, peralte: 8 },
};

/** Peso volumétrico del concreto reforzado (t/m³). */
export const PESO_CONCRETO = 2.4;
/** Factores de carga para estructuras del grupo B. */
export const FACTOR_MUERTA = 1.3;
export const FACTOR_VIVA = 1.5;

export interface EntradaViga {
  /** Claro libre (m). */
  claro: number;
  apoyo: Apoyo;
  /** Carga muerta y viva de servicio, sin el peso propio (t/m). */
  muerta: number;
  viva: number;
  /** Sección (cm). */
  b: number;
  h: number;
  /** Recubrimiento libre al estribo (cm). */
  recubrimiento: number;
  fc: number;
  fy: number;
  /** Número de la varilla longitudinal y del estribo. */
  varilla: number;
  estribo: number;
}

export interface Lecho {
  /** Momento último (t·m). */
  momento: number;
  /** Acero requerido por flexión y el de diseño (cm²). */
  requerido: number;
  diseno: number;
  cantidad: number;
  areaColocada: number;
  /** Cabe en una capa con separación libre de al menos 2.5 cm o una varilla. */
  cabe: boolean;
}

export interface ResultadoViga {
  pesoPropio: number;
  /** Carga última por metro (t/m). */
  cargaUltima: number;
  d: number;
  aceroMinimo: number;
  aceroMaximo: number;
  superior: Lecho;
  inferior: Lecho;
  cortante: {
    /** A d de la cara del apoyo (t). */
    actuante: number;
    /** Que toma el concreto (t). */
    concreto: number;
    /** Separación de estribos (cm) y la máxima que permite la norma. */
    separacion: number;
    separacionMaxima: number;
    /** El cortante no pasa del límite de la sección y los estribos caben a 5 cm o más. */
    cumple: boolean;
  };
  /** Peralte mínimo para omitir la revisión de deflexiones (cm). */
  peralteMinimo: number;
  cumple: boolean;
}

function revisar(valor: number, nombre: string, min = 0, max = Infinity) {
  if (!Number.isFinite(valor) || valor <= min) throw new RangeError(`${nombre} debe ser mayor que ${min}.`);
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

const redondearAbajo = (x: number, paso: number) => Math.floor(x / paso + 1e-9) * paso;

export function disenarViga(e: EntradaViga): ResultadoViga {
  const apoyo = APOYOS[e.apoyo];
  if (!apoyo) throw new RangeError("Tipo de apoyo desconocido.");
  revisar(e.claro, "El claro", 0, 15);
  if (!(e.muerta >= 0) || !(e.viva >= 0)) throw new RangeError("Las cargas no pueden ser negativas.");
  revisar(e.b, "El ancho de la viga", 10, 150);
  revisar(e.h, "El peralte de la viga", 15, 300);
  revisar(e.recubrimiento, "El recubrimiento", 1, 10);
  revisar(e.fc, "f'c", 140, 700);
  revisar(e.fy, "fy", 2000, 6000);
  const v = varilla(e.varilla);
  const est = varilla(e.estribo);
  if (!v || !est) throw new RangeError("Varilla no disponible.");

  const pesoPropio = (e.b / 100) * (e.h / 100) * PESO_CONCRETO;
  const cargaUltima = FACTOR_MUERTA * (e.muerta + pesoPropio) + FACTOR_VIVA * e.viva; // t/m
  const wu = cargaUltima * 10; // kg/cm
  const L = e.claro * 100; // cm

  const d = e.h - e.recubrimiento - est.diametro - v.diametro / 2;
  if (d <= 0) throw new RangeError("El peralte no alcanza para el recubrimiento y las varillas.");

  const aceroMinimo = cuantiaMinima(e.fc, e.fy) * e.b * d;
  const aceroMaximo = cuantiaMaxima(e.fc, e.fy) * e.b * d;
  const anchoLibre = e.b - 2 * (e.recubrimiento + est.diametro);

  const lecho = (coef: number): Lecho => {
    const mu = coef ? (wu * L * L) / coef : 0; // kg·cm
    const requerido = aceroPorFlexion(mu, e.b, d, e.fc, e.fy);
    if (requerido === null) throw new RangeError("La sección no resiste el momento: aumenta el peralte o el ancho.");
    const diseno = Math.max(requerido, aceroMinimo);
    const cantidad = Math.max(2, Math.ceil(diseno / v.area - 1e-9));
    const libre = Math.max(2.5, v.diametro);
    return {
      momento: mu / 1e5,
      requerido,
      diseno,
      cantidad,
      areaColocada: cantidad * v.area,
      cabe: cantidad * v.diametro + (cantidad - 1) * libre <= anchoLibre + 1e-9,
    };
  };
  const superior = lecho(apoyo.negativo);
  const inferior = lecho(apoyo.positivo);

  // Cortante a d de la cara del apoyo.
  const vMax = (apoyo.cortante * wu * L) / 2; // kg
  const vu = Math.max(vMax - wu * d, 0);
  const raiz = Math.sqrt(e.fc) * e.b * d;
  const vcr = 0.5 * FR_CORTANTE * raiz;
  const vs = vu - vcr; // lo que toman los estribos, ya con FR
  const av = 2 * est.area;
  const cumpleCortante = vs <= 2 * FR_CORTANTE * raiz;
  const separacionMaxima = vs > FR_CORTANTE * raiz ? d / 4 : d / 2;
  const porCalculo = vs > 0 ? (FR_CORTANTE * av * e.fy * d) / vs : Infinity;
  // Estribo mínimo: Av ≥ 0.3 √f'c b s / fy.
  const porMinimo = (av * e.fy) / (0.3 * Math.sqrt(e.fc) * e.b);
  const separacion = Math.max(5, redondearAbajo(Math.min(porCalculo, porMinimo, separacionMaxima), 2.5));
  const cumpleEstribos = cumpleCortante && porCalculo >= 5;

  const sobreMaximo = Math.max(superior.areaColocada, inferior.areaColocada) > aceroMaximo;

  return {
    pesoPropio,
    cargaUltima,
    d,
    aceroMinimo,
    aceroMaximo,
    superior,
    inferior,
    cortante: {
      actuante: vu / 1000,
      concreto: vcr / 1000,
      separacion,
      separacionMaxima,
      cumple: cumpleEstribos,
    },
    peralteMinimo: L / apoyo.peralte,
    cumple: cumpleEstribos && !sobreMaximo && superior.cabe && inferior.cabe,
  };
}

/** Por qué no pasa la viga, en palabras para el usuario. */
export function problemasViga(r: ResultadoViga): string[] {
  const p: string[] = [];
  if (!r.cortante.cumple) p.push("el cortante excede lo que permite la sección; aumenta el ancho o el peralte");
  if (Math.max(r.superior.areaColocada, r.inferior.areaColocada) > r.aceroMaximo)
    p.push("el acero pasa del máximo; aumenta el peralte");
  if (!r.superior.cabe || !r.inferior.cabe) p.push("las varillas no caben en una capa; aumenta el ancho o usa varilla más gruesa");
  return p;
}

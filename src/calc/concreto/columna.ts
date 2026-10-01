/**
 * Columna rectangular corta o moderadamente esbelta, con estribos, en un
 * marco sin desplazamiento lateral: carga axial y momento en una dirección.
 *
 * Unidades de captura: carga en t, momento en t·m, altura en m, sección y
 * recubrimiento en cm, f'c y fy en kg/cm². Por dentro se trabaja en kg y cm.
 * El acero va repartido en las dos caras perpendiculares a la flexión.
 */
import {
  beta1,
  CUANTIA_MAX_COLUMNA,
  CUANTIA_MIN_COLUMNA,
  EPSILON_CU,
  ES,
  fppc,
  FR_COMPRESION,
  moduloConcreto,
  separacionEstribosColumna,
  varilla,
} from "./ntc";

export interface EntradaColumna {
  /** Carga axial última (t). */
  carga: number;
  /** Momento último mayor en los extremos (t·m), en la dirección de h. */
  momento: number;
  /** Altura libre (m). */
  altura: number;
  /** b: lado paralelo al eje de flexión; h: lado en la dirección del momento (cm). */
  b: number;
  h: number;
  recubrimiento: number;
  fc: number;
  fy: number;
  varilla: number;
  estribo: number;
}

export interface ResultadoColumna {
  /** Excentricidad mínima (cm) y momento de diseño antes de amplificar (t·m). */
  excentricidadMinima: number;
  momentoMinimo: number;
  esbeltez: number;
  /** Carga crítica (t) y factor de amplificación. */
  cargaCritica: number;
  amplificacion: number;
  /** Momento de diseño amplificado (t·m). */
  momentoDiseno: number;
  d: number;
  /** Carga axial resistente máxima (t). */
  cargaResistente: number;
  /** Momento resistente con la carga axial actuante (t·m). */
  momentoResistente: number;
  armado: { cantidad: number; varilla: number; area: number; cuantia: number; cabe: boolean };
  estribos: { varilla: number; separacion: number };
  problemas: string[];
  cumple: boolean;
}

function revisar(valor: number, nombre: string, min = 0, max = Infinity) {
  if (!Number.isFinite(valor) || valor <= min) throw new RangeError(`${nombre} debe ser mayor que ${min}.`);
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

const redondearAbajo = (x: number, paso: number) => Math.floor(x / paso + 1e-9) * paso;

/** Esfuerzo en el acero a una profundidad y con el eje neutro en c (positivo en compresión). */
const esfuerzo = (c: number, y: number, fy: number) => Math.max(-fy, Math.min(fy, (ES * EPSILON_CU * (c - y)) / c));

/**
 * Resistencias nominales (kg, kg·cm respecto al centroide) con el eje neutro a
 * c desde la cara más comprimida y la mitad del acero en cada cara.
 */
export function resistenciaNominal(
  c: number,
  s: { b: number; h: number; dp: number; area: number; fc: number; fy: number },
) {
  const f = fppc(s.fc);
  const a = Math.min(beta1(s.fc) * c, s.h);
  const cc = f * a * s.b;
  const mitad = s.area / 2;
  const capa = (y: number) => {
    const fs = esfuerzo(c, y, s.fy);
    // Si la capa queda dentro del bloque, descuenta el concreto que desplaza.
    return mitad * (y <= a ? fs - f : fs);
  };
  const superior = capa(s.dp);
  const inferior = capa(s.h - s.dp);
  const brazo = s.h / 2 - s.dp;
  return {
    p: cc + superior + inferior,
    m: cc * (s.h / 2 - a / 2) + superior * brazo - inferior * brazo,
  };
}

export function disenarColumna(e: EntradaColumna): ResultadoColumna {
  revisar(e.carga, "La carga axial");
  if (!(e.momento >= 0)) throw new RangeError("El momento no puede ser negativo.");
  revisar(e.altura, "La altura", 0, 10);
  revisar(e.b, "El lado b", 15, 150);
  revisar(e.h, "El lado h", 15, 150);
  revisar(e.recubrimiento, "El recubrimiento", 1, 10);
  revisar(e.fc, "f'c", 140, 700);
  revisar(e.fy, "fy", 2000, 6000);
  const v = varilla(e.varilla);
  const est = varilla(e.estribo);
  if (!v || !est) throw new RangeError("Varilla no disponible.");

  const pu = e.carga * 1000;
  const dp = e.recubrimiento + est.diametro + v.diametro / 2;
  const d = e.h - dp;
  if (d <= dp) throw new RangeError("La sección es muy chica para el recubrimiento y las varillas.");
  const ag = e.b * e.h;
  const problemas: string[] = [];

  // Excentricidad mínima.
  const excentricidadMinima = Math.max(0.05 * e.h, 2);
  const momentoMinimo = (pu * excentricidadMinima) / 1e5;
  const m2 = Math.max(e.momento, momentoMinimo);

  // Esbeltez con k = 1 (sin desplazamiento lateral) y amplificación con Cm = 1.
  const largo = e.altura * 100;
  const esbeltez = largo / (0.3 * Math.min(e.b, e.h));
  const ei = (0.4 * moduloConcreto(e.fc) * ((e.b * e.h ** 3) / 12)) / (1 + 0.6);
  const pc = (Math.PI ** 2 * ei) / (largo * largo);
  const denominador = 1 - pu / (0.75 * pc);
  const amplificacion = denominador > 0 ? Math.max(1, 1 / denominador) : Infinity;
  if (esbeltez > 100) problemas.push("la columna es demasiado esbelta (kL/r > 100); aumenta la sección");
  else if (!Number.isFinite(amplificacion) || amplificacion > 1.4)
    problemas.push("la columna es muy esbelta para la carga; aumenta la sección");
  const momentoDiseno = m2 * (Number.isFinite(amplificacion) ? amplificacion : 1);

  // Refuerzo: desde la cuantía mínima, de dos en dos, hasta que resista.
  const libre = e.b - 2 * (e.recubrimiento + est.diametro);
  const espacio = Math.max(2.5, 1.5 * v.diametro);
  let cantidad = Math.max(4, 2 * Math.ceil((CUANTIA_MIN_COLUMNA * ag) / v.area / 2 - 1e-9));
  const capacidad = (n: number) => {
    const area = n * v.area;
    const s = { b: e.b, h: e.h, dp, area, fc: e.fc, fy: e.fy };
    const po = fppc(e.fc) * (ag - area) + e.fy * area;
    const pr = 0.8 * FR_COMPRESION * po;
    if (pu > pr) return { area, pr, mr: 0 };
    // Eje neutro que equilibra la carga: P(c) crece con c.
    let lo = 0.01;
    let hi = 10 * e.h;
    for (let i = 0; i < 100; i++) {
      const c = (lo + hi) / 2;
      if (FR_COMPRESION * resistenciaNominal(c, s).p < pu) lo = c;
      else hi = c;
    }
    return { area, pr, mr: (FR_COMPRESION * resistenciaNominal(hi, s).m) / 1e5 };
  };
  let cap = capacidad(cantidad);
  while ((cap.mr < momentoDiseno || pu > cap.pr) && ((cantidad + 2) * v.area) / ag <= CUANTIA_MAX_COLUMNA) {
    cantidad += 2;
    cap = capacidad(cantidad);
  }
  if (pu > cap.pr) problemas.push("la carga axial pasa de la resistencia de la sección; aumenta la sección o f'c");
  else if (cap.mr < momentoDiseno) problemas.push("no resiste el momento ni con la cuantía máxima; aumenta la sección");
  const porCara = cantidad / 2;
  const cabe = porCara * v.diametro + (porCara - 1) * espacio <= libre + 1e-9;
  if (!cabe && problemas.length === 0) problemas.push("las varillas no caben en las caras; usa varilla más gruesa o una sección más ancha");

  const separacion = redondearAbajo(separacionEstribosColumna(v.diametro, est.diametro, e.fy, Math.min(e.b, e.h)), 2.5);

  return {
    excentricidadMinima,
    momentoMinimo,
    esbeltez,
    cargaCritica: pc / 1000,
    amplificacion,
    momentoDiseno,
    d,
    cargaResistente: cap.pr / 1000,
    momentoResistente: cap.mr,
    armado: { cantidad, varilla: v.numero, area: cap.area, cuantia: cap.area / ag, cabe },
    estribos: { varilla: est.numero, separacion },
    problemas,
    cumple: problemas.length === 0,
  };
}

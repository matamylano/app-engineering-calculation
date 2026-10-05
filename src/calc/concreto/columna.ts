/**
 * Columna rectangular corta o moderadamente esbelta, con estribos, en un
 * marco sin desplazamiento lateral: carga axial y momento en una dirección o,
 * si se da el segundo momento, flexión biaxial (fórmula de Bresler).
 *
 * Unidades de captura: carga en t, momento en t·m, altura en m, sección y
 * recubrimiento en cm, f'c y fy en kg/cm². Por dentro se trabaja en kg y cm.
 * Con momento en una dirección el acero va repartido en las dos caras
 * perpendiculares a la flexión; con flexión biaxial, en las cuatro caras.
 */
import type { Partida } from "@/calc/obra/cuantificacion";
import { kgPorMetro } from "@/calc/obra/cuantificacion";
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
  type Varilla,
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
  /** Segundo momento último (t·m), en la dirección del lado b. Sin él (o en cero), flexión en una dirección. */
  momentoB?: number;
}

/** Revisión de flexión biaxial (solo si hay segundo momento). */
export interface BiaxialColumna {
  /** Excentricidad mínima en la dirección de b (cm), amplificación y momento de diseño en esa dirección (t·m). */
  excentricidadMinima: number;
  cargaCritica: number;
  amplificacion: number;
  momentoDiseno: number;
  /** Momento resistente con Pu en la dirección de b (t·m). */
  momentoResistente: number;
  /** Cargas resistentes (t): con la excentricidad en h (PRx), en b (PRy), sin excentricidad (PR0) y la de Bresler (PR). */
  cargaX: number;
  cargaY: number;
  carga0: number;
  cargaBresler: number;
  /** "bresler" si Pu ≥ 0.1 PR0; si no, Mx/MRx + My/MRy ≤ 1. */
  metodo: "bresler" | "lineal";
  /** Pu / PR o Mx/MRx + My/MRy: debe ser ≤ 1. */
  indice: number;
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
  armado: {
    cantidad: number;
    varilla: number;
    area: number;
    cuantia: number;
    cabe: boolean;
    /** 2: dos caras perpendiculares a h; 4: las cuatro caras. Falta en memorias viejas (dos caras). */
    caras?: 2 | 4;
    /** Varillas en cada cara de ancho b y en cada cara de ancho h, con las esquinas. */
    porCaraB?: number;
    porCaraH?: number;
  };
  estribos: { varilla: number; separacion: number };
  /** Solo con segundo momento. */
  biaxial?: BiaxialColumna | null;
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

/** Capa de acero a la profundidad y (cm) desde la cara más comprimida, con su área (cm²). */
export interface Capa {
  y: number;
  area: number;
}

/**
 * Resistencias nominales (kg, kg·cm respecto al centroide) de una sección de
 * ancho b y peralte h con el acero en capas, con el eje neutro a c.
 */
export function resistenciaCapas(c: number, s: { b: number; h: number; fc: number; fy: number }, capas: Capa[]) {
  const f = fppc(s.fc);
  const a = Math.min(beta1(s.fc) * c, s.h);
  const cc = f * a * s.b;
  let p = cc;
  let m = cc * (s.h / 2 - a / 2);
  for (const k of capas) {
    const fs = esfuerzo(c, k.y, s.fy);
    const fuerza = k.area * (k.y <= a ? fs - f : fs);
    p += fuerza;
    m += fuerza * (s.h / 2 - k.y);
  }
  return { p, m };
}

/**
 * Capas del acero repartido en las cuatro caras para flexión en la dirección
 * de `peralte`: `nCara` varillas en cada cara de ancho `ancho` (con las
 * esquinas) y `nLado` en cada cara lateral; las intermedias de las caras
 * laterales quedan en capas de dos varillas.
 */
export function capasCuatroCaras(peralte: number, dp: number, nCara: number, nLado: number, areaVarilla: number): Capa[] {
  const capas: Capa[] = [{ y: dp, area: nCara * areaVarilla }];
  for (let i = 1; i < nLado - 1; i++) capas.push({ y: dp + ((peralte - 2 * dp) * i) / (nLado - 1), area: 2 * areaVarilla });
  capas.push({ y: peralte - dp, area: nCara * areaVarilla });
  return capas;
}

/** Datos de una dirección para el método de Bresler. */
interface SeccionDireccion {
  s: { b: number; h: number; fc: number; fy: number };
  capas: Capa[];
}

/** Eje neutro c con el que la sección equilibra la carga p (kg); P(c) crece con c. */
function ejeNeutroPorCarga(d: SeccionDireccion, p: number) {
  let lo = 0.01;
  let hi = 10 * d.s.h;
  for (let i = 0; i < 100; i++) {
    const c = (lo + hi) / 2;
    if (FR_COMPRESION * resistenciaCapas(c, d.s, d.capas).p < p) lo = c;
    else hi = c;
  }
  return hi;
}

/** Carga nominal (kg) con la excentricidad ex (cm) respecto al centroide. */
function cargaConExcentricidad(d: SeccionDireccion, ex: number) {
  const c0 = ejeNeutroPorCarga(d, 0);
  let lo = c0;
  let hi = 10 * d.s.h;
  for (let i = 0; i < 100; i++) {
    const c = (lo + hi) / 2;
    const n = resistenciaCapas(c, d.s, d.capas);
    if (n.m - ex * n.p > 0) lo = c;
    else hi = c;
  }
  return resistenciaCapas(hi, d.s, d.capas).p;
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
  const momentoB = e.momentoB ?? 0;
  if (!(momentoB >= 0)) throw new RangeError("El segundo momento no puede ser negativo.");
  if (momentoB > 0) return disenarBiaxial(e, v, est);

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
    armado: { cantidad, varilla: v.numero, area: cap.area, cuantia: cap.area / ag, cabe, caras: 2, porCaraB: porCara, porCaraH: 2 },
    estribos: { varilla: est.numero, separacion },
    biaxial: null,
    problemas,
    cumple: problemas.length === 0,
  };
}

/** Amplificación de momentos con k = 1 y Cm = 1 en una dirección: ancho × peralte en la dirección del momento. */
function amplificar(e: EntradaColumna, ancho: number, peralte: number) {
  const largo = e.altura * 100;
  const ei = (0.4 * moduloConcreto(e.fc) * ((ancho * peralte ** 3) / 12)) / (1 + 0.6);
  const pc = (Math.PI ** 2 * ei) / (largo * largo);
  const denominador = 1 - (e.carga * 1000) / (0.75 * pc);
  return { pc, delta: denominador > 0 ? Math.max(1, 1 / denominador) : Infinity };
}

/**
 * Flexión biaxial: acero en las cuatro caras y fórmula de Bresler (carga
 * recíproca) de las NTC-Concreto, 1/PR = 1/PRx + 1/PRy − 1/PR0, válida si
 * Pu ≥ 0.1 PR0; con menos carga, Mx/MRx + My/MRy ≤ 1. PR0 = FR Po (sin el
 * 0.8, que haría la fórmula menos conservadora); PR no pasa de 0.8 FR Po.
 */
function disenarBiaxial(e: EntradaColumna, v: Varilla, est: Varilla): ResultadoColumna {
  const pu = e.carga * 1000;
  const dp = e.recubrimiento + est.diametro + v.diametro / 2;
  if (Math.min(e.b, e.h) - dp <= dp) throw new RangeError("La sección es muy chica para el recubrimiento y las varillas.");
  const d = e.h - dp;
  const ag = e.b * e.h;
  const problemas: string[] = [];

  // Esbeltez (r = 0.3 del lado menor) y amplificación en cada dirección.
  const esbeltez = (e.altura * 100) / (0.3 * Math.min(e.b, e.h));
  const ax = amplificar(e, e.b, e.h);
  const ay = amplificar(e, e.h, e.b);
  if (esbeltez > 100) problemas.push("la columna es demasiado esbelta (kL/r > 100); aumenta la sección");
  else if (!Number.isFinite(ax.delta) || !Number.isFinite(ay.delta) || Math.max(ax.delta, ay.delta) > 1.4)
    problemas.push("la columna es muy esbelta para la carga; aumenta la sección");
  const finito = (x: number) => (Number.isFinite(x) ? x : 1);

  // Excentricidad mínima en cada dirección, aplicada en las dos a la vez (conservador).
  const eminX = Math.max(0.05 * e.h, 2);
  const eminY = Math.max(0.05 * e.b, 2);
  const mx = Math.max(e.momento, (pu * eminX) / 1e5) * finito(ax.delta);
  const my = Math.max(e.momentoB ?? 0, (pu * eminY) / 1e5) * finito(ay.delta);

  // Acero: nb varillas en cada cara de ancho b y nh en cada cara de ancho h (con las esquinas).
  const libreB = e.b - 2 * (e.recubrimiento + est.diametro);
  const libreH = e.h - 2 * (e.recubrimiento + est.diametro);
  const espacio = Math.max(2.5, 1.5 * v.diametro);
  const separacionLibre = (libre: number, n: number) => (libre - n * v.diametro) / (n - 1);
  let nb = 2;
  let nh = 2;
  const total = () => 2 * nb + 2 * nh - 4;
  // Cada paso agrega una varilla a cada una de dos caras opuestas: las que trabajan en la dirección más
  // exigida si caben (las de ancho b para el momento en h; las de ancho h para el de b) o, si no, las de más espacio.
  const agregar = (preferirH?: boolean) => {
    const cabeB = separacionLibre(libreB, nb + 1) >= espacio;
    const cabeH = separacionLibre(libreH, nh + 1) >= espacio;
    const masEspacioEnB = separacionLibre(libreB, nb) >= separacionLibre(libreH, nh);
    if (preferirH === undefined || cabeB === cabeH ? (preferirH === undefined ? masEspacioEnB : !preferirH) : cabeB) nb++;
    else nh++;
  };
  while (total() * v.area < CUANTIA_MIN_COLUMNA * ag - 1e-9) agregar();

  const revisarArmado = () => {
    const area = total() * v.area;
    const po = fppc(e.fc) * (ag - area) + e.fy * area;
    const prMax = 0.8 * FR_COMPRESION * po;
    const pr0 = FR_COMPRESION * po;
    const x: SeccionDireccion = { s: { b: e.b, h: e.h, fc: e.fc, fy: e.fy }, capas: capasCuatroCaras(e.h, dp, nb, nh, v.area) };
    const y: SeccionDireccion = { s: { b: e.h, h: e.b, fc: e.fc, fy: e.fy }, capas: capasCuatroCaras(e.b, dp, nh, nb, v.area) };
    if (pu > prMax) return { area, prMax, pr0, prx: 0, pry: 0, pr: 0, mrx: 0, mry: 0, metodo: "bresler" as const, indice: Infinity };
    const mr = (s: SeccionDireccion) => (FR_COMPRESION * resistenciaCapas(ejeNeutroPorCarga(s, pu), s.s, s.capas).m) / 1e5;
    const mrx = mr(x);
    const mry = mr(y);
    const prx = Math.min(FR_COMPRESION * cargaConExcentricidad(x, (mx * 1e5) / pu), prMax);
    const pry = Math.min(FR_COMPRESION * cargaConExcentricidad(y, (my * 1e5) / pu), prMax);
    const reciproco = 1 / prx + 1 / pry - 1 / pr0;
    const pr = reciproco > 0 ? Math.min(1 / reciproco, prMax) : prMax;
    const metodo = pu >= 0.1 * pr0 ? ("bresler" as const) : ("lineal" as const);
    const indice = metodo === "bresler" ? pu / pr : mx / mrx + my / mry;
    return { area, prMax, pr0, prx, pry, pr, mrx, mry, metodo, indice };
  };
  let cap = revisarArmado();
  while (cap.indice > 1 && ((total() + 2) * v.area) / ag <= CUANTIA_MAX_COLUMNA) {
    agregar(cap.mry > 0 && cap.mrx > 0 ? my / cap.mry > mx / cap.mrx : undefined);
    cap = revisarArmado();
  }
  if (pu > cap.prMax) problemas.push("la carga axial pasa de la resistencia de la sección; aumenta la sección o f'c");
  else if (cap.indice > 1) problemas.push("no resiste la flexión biaxial ni con la cuantía máxima; aumenta la sección");
  const cabe = separacionLibre(libreB, nb) >= espacio - 1e-9 && separacionLibre(libreH, nh) >= espacio - 1e-9;
  if (!cabe && problemas.length === 0) problemas.push("las varillas no caben en las caras; usa varilla más gruesa o una sección más grande");

  const separacion = redondearAbajo(separacionEstribosColumna(v.diametro, est.diametro, e.fy, Math.min(e.b, e.h)), 2.5);
  const cantidad = total();

  return {
    excentricidadMinima: eminX,
    momentoMinimo: (pu * eminX) / 1e5,
    esbeltez,
    cargaCritica: ax.pc / 1000,
    amplificacion: ax.delta,
    momentoDiseno: mx,
    d,
    cargaResistente: cap.prMax / 1000,
    momentoResistente: cap.mrx,
    armado: { cantidad, varilla: v.numero, area: cap.area, cuantia: cap.area / ag, cabe, caras: 4, porCaraB: nb, porCaraH: nh },
    estribos: { varilla: est.numero, separacion },
    biaxial: {
      excentricidadMinima: eminY,
      cargaCritica: ay.pc / 1000,
      amplificacion: ay.delta,
      momentoDiseno: my,
      momentoResistente: cap.mry,
      cargaX: cap.prx / 1000,
      cargaY: cap.pry / 1000,
      carga0: cap.pr0 / 1000,
      cargaBresler: cap.pr / 1000,
      metodo: cap.metodo,
      indice: cap.indice,
    },
    problemas,
    cumple: problemas.length === 0,
  };
}

/** Secciones de las dos direcciones con el acero en las cuatro caras, para las gráficas. */
export function seccionesCuatroCaras(e: EntradaColumna, porCaraB: number, porCaraH: number) {
  const v = varilla(e.varilla)!;
  const est = varilla(e.estribo)!;
  const dp = e.recubrimiento + est.diametro + v.diametro / 2;
  return {
    h: { s: { b: e.b, h: e.h, fc: e.fc, fy: e.fy }, capas: capasCuatroCaras(e.h, dp, porCaraB, porCaraH, v.area) },
    b: { s: { b: e.h, h: e.b, fc: e.fc, fy: e.fy }, capas: capasCuatroCaras(e.b, dp, porCaraH, porCaraB, v.area) },
  };
}

/**
 * Traslape del acero longitudinal para cuantificar: 40 diámetros, uno por
 * tramo de columna (criterio práctico; el ingeniero lo ajusta a la longitud
 * de desarrollo de las NTC-Concreto).
 */
export const TRASLAPE_COLUMNA_DB = 40;

/** Gancho a 135° de cada extremo del estribo, para cuantificar: 10 diámetros del estribo. */
export const GANCHO_ESTRIBO_DB = 10;

/** Número de estribos en la altura libre: uno en cada extremo y a la separación de diseño. */
export const estribosEnAltura = (alturaM: number, separacion: number) => Math.floor((alturaM * 100) / separacion + 1e-9) + 1;

/**
 * Cantidades de una columna: concreto en la altura libre (el nudo se cuantifica
 * con la losa o la trabe), acero longitudinal con su traslape, estribos con
 * dos ganchos y cimbra en las cuatro caras.
 */
export function cuantificarColumna(e: EntradaColumna, r: ResultadoColumna): Partida[] {
  const v = varilla(r.armado.varilla)!;
  const est = varilla(r.estribos.varilla)!;
  const largoVarilla = e.altura + (TRASLAPE_COLUMNA_DB * v.diametro) / 100; // m
  const perimetro = 2 * (e.b - 2 * e.recubrimiento) + 2 * (e.h - 2 * e.recubrimiento); // cm, por fuera del estribo
  const largoEstribo = (perimetro + 2 * GANCHO_ESTRIBO_DB * est.diametro) / 100; // m
  const nEstribos = estribosEnAltura(e.altura, r.estribos.separacion);
  return [
    { concepto: `Concreto f'c = ${e.fc} kg/cm² en columna`, material: "concreto", cantidad: (e.b * e.h * e.altura) / 10000 },
    { concepto: `Acero longitudinal #${v.numero}`, material: "acero", cantidad: r.armado.cantidad * largoVarilla * kgPorMetro(v.numero) },
    { concepto: `Estribos #${est.numero} (${nEstribos} por columna)`, material: "acero", cantidad: nEstribos * largoEstribo * kgPorMetro(est.numero) },
    { concepto: "Cimbra de columna (cuatro caras)", material: "cimbra", cantidad: (2 * (e.b + e.h) * e.altura) / 100 },
  ];
}

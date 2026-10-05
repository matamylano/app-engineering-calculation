/**
 * Zapata aislada de concreto reforzado, cuadrada o rectangular, con carga
 * axial y, si se pide, momento en la base en la dirección del largo L.
 *
 * Unidades de captura: t, t·m, t/m², m para la zapata y cm para la columna,
 * el peralte y el recubrimiento; f'c y fy en kg/cm². Por dentro se trabaja en
 * kg y cm. Revisa presiones sobre el suelo, penetración, cortante como viga
 * ancha y flexión en la cara de la columna en las dos direcciones.
 *
 * Orientación: B es el ancho y L el largo (dirección del momento); c1 es el
 * lado de la columna paralelo a B y c2 el paralelo a L. En la zapata
 * cuadrada se toma el volado mayor en las dos direcciones, como si la
 * columna pudiera quedar girada.
 */
import type { Partida } from "@/calc/obra/cuantificacion";
import { kgPorMetro } from "@/calc/obra/cuantificacion";
import {
  aceroPorFlexion,
  aceroTemperatura,
  cortantePenetracion,
  cortanteVigaAncha,
  cuantiaMinima,
  separacionMaxima,
  varilla,
} from "./ntc";

export interface EntradaZapata {
  /** Carga de servicio de la columna (t). */
  carga: number;
  /** Carga última de la columna (t). */
  cargaUltima: number;
  /** Capacidad de carga admisible del suelo (t/m²). */
  qa: number;
  /** Incremento por peso de la zapata y el relleno (fracción). */
  incremento: number;
  /** Lados de la columna (cm): c1 paralelo a B, c2 paralelo a L. */
  c1: number;
  c2: number;
  /** Peralte total de la zapata (cm). */
  h: number;
  /** Recubrimiento libre al acero (cm). */
  recubrimiento: number;
  /** Resistencia del concreto y del acero (kg/cm²). */
  fc: number;
  fy: number;
  /** Número de la varilla (3, 4, 5, 6, 8). */
  varilla: number;
  /** Ancho B de la zapata (m). Si se omite, el mínimo por qa redondeado a 5 cm. */
  lado?: number;
  /** Largo L (m), en la dirección del momento. Si se omite, la zapata es cuadrada. */
  largo?: number;
  /** Momento de servicio en la base de la columna, en la dirección de L (t·m). */
  momento?: number;
}

export interface Revision {
  /** Esfuerzo o fuerza actuante y resistente, en las unidades indicadas. */
  actuante: number;
  resistente: number;
  cumple: boolean;
}

export interface Armado {
  varilla: number;
  cantidad: number;
  separacion: number;
  areaColocada: number;
}

/** Revisión de una dirección: el volado que trabaja como viga en voladizo. */
export interface DireccionZapata {
  /** Volado desde la cara de la columna (cm) y ancho que lo resiste (m). */
  volado: number;
  ancho: number;
  /** Presión última en la cara de la columna y en el borde (t/m²). */
  presionCara: number;
  presionBorde: number;
  /** Viga ancha: fuerzas en t. */
  vigaAncha: Revision;
  /** Momento último en la cara de la columna (t·m), en todo el ancho. */
  momento: number;
  /** Acero por flexión, mínimo y de diseño (cm², en todo el ancho). */
  aceroFlexion: number;
  aceroMinimo: number;
  aceroDiseno: number;
  /**
   * Factor por la franja central del lado corto (zapata rectangular): el
   * acero se reparte uniforme con la densidad que pide la franja, 2β/(β+1).
   */
  factorFranja: number;
  armado: Armado;
}

export interface PresionesZapata {
  /** Excentricidad de servicio e = M / (P (1 + i)) (m) y límite L/6. */
  excentricidad: number;
  limite: number;
  /** Presiones de servicio en los bordes (t/m²). */
  maxima: number;
  minima: number;
  /** Momento último Mu = M · Pu / P (t·m) y presiones últimas en los bordes (t/m²). */
  momentoUltimo: number;
  maximaUltima: number;
  minimaUltima: number;
}

export interface ResultadoZapata {
  /** Ancho mínimo por capacidad del suelo (m); en la cuadrada, el lado. */
  ladoMinimo: number;
  /** Ancho B usado (m). */
  lado: number;
  /** Largo L usado (m); igual a B en la cuadrada. Falta en memorias viejas. */
  largo: number;
  cuadrada: boolean;
  /** Presión media de servicio sobre el suelo, con el incremento (t/m²). */
  presionServicio: number;
  /** Presión neta última media para diseño (t/m²). */
  presionUltima: number;
  /** Solo si hay momento. */
  presiones: PresionesZapata | null;
  /** Peralte efectivo (cm). */
  d: number;
  /** Penetración: esfuerzos en kg/cm²; con momento, incluye el cortante por el momento que se transmite. */
  penetracion: Revision & { perimetro: number; gamma: number; directo: number; porMomento: number; alfa: number };
  /** Revisión y armado de cada dirección: "largo" son las varillas paralelas a L; "ancho", las paralelas a B. */
  direcciones: { largo: DireccionZapata; ancho: DireccionZapata };
  /** Los campos siguientes repiten la dirección del largo (o la más desfavorable en viga ancha), como en las memorias viejas. */
  vigaAncha: Revision;
  momento: number;
  aceroFlexion: number;
  aceroMinimo: number;
  aceroDiseno: number;
  armado: Armado;
  problemas: string[];
  cumple: boolean;
}

function revisar(valor: number, nombre: string, min = 0, max = Infinity) {
  if (!Number.isFinite(valor) || valor <= min) throw new RangeError(`${nombre} debe ser mayor que ${min}.`);
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

const redondearArriba5cm = (m: number) => Math.ceil(m * 20 - 1e-9) / 20;
const redondearAbajo = (x: number, paso: number) => Math.floor(x / paso + 1e-9) * paso;

/** Lado máximo que se dimensiona (m). */
const LADO_MAXIMO = 10;

/**
 * Coeficiente α de la fracción del momento que se transmite por cortante
 * excéntrico: α = 1 − 1 / (1 + 0.67 √((c1 + d)/(c2 + d))), con c1 + d en la
 * dirección del momento (NTC-Concreto, transmisión de momento entre losa o
 * zapata y columna).
 */
const alfaTransmision = (enMomento: number, transversal: number) => 1 - 1 / (1 + 0.67 * Math.sqrt(enMomento / transversal));

export function disenarZapata(e: EntradaZapata): ResultadoZapata {
  revisar(e.carga, "La carga de servicio");
  revisar(e.cargaUltima, "La carga última");
  if (e.cargaUltima < e.carga) throw new RangeError("La carga última no puede ser menor que la de servicio.");
  revisar(e.qa, "La capacidad del suelo", 0, 500);
  if (!(e.incremento >= 0 && e.incremento <= 1)) throw new RangeError("El incremento debe estar entre 0 y 100 %.");
  revisar(e.c1, "El lado de la columna", 10, 200);
  revisar(e.c2, "El lado de la columna", 10, 200);
  revisar(e.h, "El peralte de la zapata", 15, 200);
  revisar(e.recubrimiento, "El recubrimiento", 2, 15);
  revisar(e.fc, "f'c", 140, 700);
  revisar(e.fy, "fy", 2000, 6000);
  const v = varilla(e.varilla);
  if (!v) throw new RangeError("Varilla no disponible.");
  const M = e.momento ?? 0;
  if (!(Number.isFinite(M) && M >= 0)) throw new RangeError("El momento no puede ser negativo.");
  if (M > 500) throw new RangeError("El momento no debe pasar de 500 t·m.");
  const cuadrada = e.largo === undefined;
  if (!cuadrada) revisar(e.largo!, "El largo de la zapata", 0.3, LADO_MAXIMO);

  // Dimensiones: presión máxima de servicio ≤ qa y sin tensión bajo la zapata (e ≤ L/6).
  const pServ = e.carga * (1 + e.incremento);
  const excentricidad = M / pServ; // m
  const qMaxDe = (B: number, L: number) => pServ / (B * L) + (6 * M) / (B * L * L);
  let ladoMinimo: number;
  let lado: number;
  let largo: number;
  if (cuadrada) {
    let veinteavos = Math.ceil(Math.sqrt(pServ / e.qa) * 20 - 1e-9);
    if (M > 0) {
      const ok = (s: number) => qMaxDe(s, s) <= e.qa + 1e-9 && excentricidad <= s / 6 + 1e-9;
      while (veinteavos < LADO_MAXIMO * 20 && !ok(veinteavos / 20)) veinteavos++;
    }
    ladoMinimo = veinteavos / 20;
    lado = e.lado ?? ladoMinimo;
    largo = lado;
  } else {
    largo = e.largo!;
    ladoMinimo = redondearArriba5cm((pServ / largo + (6 * M) / (largo * largo)) / e.qa);
    lado = e.lado ?? ladoMinimo;
  }
  revisar(lado, cuadrada ? "El lado de la zapata" : "El ancho de la zapata", 0.3, LADO_MAXIMO);
  // Sin momento, la zapata cuadrada chica es un dato equivocado, como siempre.
  if (cuadrada && M === 0 && lado + 1e-9 < ladoMinimo)
    throw new RangeError(`La zapata debe medir al menos ${ladoMinimo.toFixed(2)} m por lado.`);
  const B = lado * 100; // cm
  const L = largo * 100; // cm
  if (cuadrada ? B <= Math.max(e.c1, e.c2) : B <= e.c1 || L <= e.c2)
    throw new RangeError("La zapata debe ser más grande que la columna.");

  const problemas: string[] = [];
  const area = lado * largo; // m²
  const presionServicio = pServ / area;
  const presionUltima = e.cargaUltima / area; // t/m²
  let presiones: PresionesZapata | null = null;
  if (M > 0) {
    const flexion = (6 * M) / (lado * largo * largo);
    const momentoUltimo = (M * e.cargaUltima) / e.carga;
    const flexionUltima = (6 * momentoUltimo) / (lado * largo * largo);
    presiones = {
      excentricidad,
      limite: largo / 6,
      maxima: presionServicio + flexion,
      minima: presionServicio - flexion,
      momentoUltimo,
      maximaUltima: presionUltima + flexionUltima,
      minimaUltima: presionUltima - flexionUltima,
    };
    if (presiones.maxima > e.qa + 1e-9)
      problemas.push(
        `la presión máxima sobre el suelo (${presiones.maxima.toFixed(2)} t/m²) pasa de qa = ${e.qa.toFixed(2)} t/m²; agranda la zapata`,
      );
    if (excentricidad > largo / 6 + 1e-9)
      problemas.push(
        `la excentricidad M/P = ${excentricidad.toFixed(2)} m pasa de L/6 = ${(largo / 6).toFixed(2)} m y habría tensión bajo la zapata; alárgala en la dirección del momento`,
      );
  } else if (presionServicio > e.qa + 1e-9) {
    problemas.push(
      `la presión sobre el suelo (${presionServicio.toFixed(2)} t/m²) pasa de qa = ${e.qa.toFixed(2)} t/m²; agranda la zapata`,
    );
  }

  // Presiones últimas en kg/cm² (1 t/m² = 0.1 kg/cm²): media y variación lineal a lo largo de L.
  const qu = presionUltima / 10;
  const dq = presiones ? (presiones.maximaUltima - presionUltima) / 10 : 0;

  // Peralte efectivo al centroide del lecho superior (dos lechos cruzados), conservador para los dos.
  const d = e.h - e.recubrimiento - 1.5 * v.diametro;
  if (d <= 0) throw new RangeError("El peralte no alcanza para el recubrimiento y las varillas.");

  // Penetración: sección crítica a d/2 de la columna. La parte lineal de la presión no suma fuerza.
  const a1 = e.c1 + d; // paralelo a B
  const a2 = e.c2 + d; // paralelo a L, la dirección del momento
  const perimetro = 2 * (a1 + a2);
  const vuPen = qu * (B * L - a1 * a2); // kg
  const gamma = Math.min(e.c1, e.c2) / Math.max(e.c1, e.c2);
  const directo = vuPen / (perimetro * d);
  // Momento transmitido por cortante excéntrico: v = α Mu c / Jc, c = (c2 + d)/2 (se toma todo Mu, conservador).
  let porMomento = 0;
  let alfa = 0;
  if (presiones) {
    alfa = alfaTransmision(a2, a1);
    const jc = (d * a2 ** 3) / 6 + (a2 * d ** 3) / 6 + (d * a1 * a2 ** 2) / 2;
    porMomento = (alfa * presiones.momentoUltimo * 1e5 * (a2 / 2)) / jc;
  }
  const vPen = directo + porMomento;
  const vRPen = cortantePenetracion(e.fc, gamma);
  const penetracion = { actuante: vPen, resistente: vRPen, cumple: vPen <= vRPen, perimetro, gamma, directo, porMomento, alfa };
  if (!penetracion.cumple) problemas.push("no pasa por penetración alrededor de la columna; aumenta el peralte");

  // Franja central (zapata rectangular): las varillas paralelas al lado corto llevan 2/(β+1) de su acero en un
  // ancho igual al lado corto; se colocan uniformes con esa densidad (NTC-Concreto, zapatas rectangulares).
  const beta = Math.max(B, L) / Math.min(B, L);
  const franja = cuadrada || beta < 1 + 1e-9 ? 1 : (2 * beta) / (beta + 1);
  // En la cuadrada, volado mayor en las dos direcciones.
  const voladoCuadrada = (B - Math.min(e.c1, e.c2)) / 2;

  const direccion = (volado: number, anchoCm: number, qCara: number, qBorde: number, factor: number): DireccionZapata => {
    // Viga ancha a d de la cara; presión trapecial entre la cara y el borde.
    const qEnD = qCara + ((qBorde - qCara) * Math.min(d, volado)) / volado;
    const vuViga = (anchoCm * Math.max(volado - d, 0) * (qEnD + qBorde)) / 2; // kg
    const vRViga = cortanteVigaAncha(e.fc) * anchoCm * d; // kg
    // Momento de la presión trapecial respecto a la cara: b a² (q_cara + 2 q_borde) / 6.
    const mu = (anchoCm * volado * volado * (qCara + 2 * qBorde)) / 6; // kg·cm
    const aceroFlexion = aceroPorFlexion(mu, anchoCm, d, e.fc, e.fy);
    if (aceroFlexion === null) throw new RangeError("La sección no resiste el momento: aumenta el peralte.");
    const aceroMinimo = Math.max(cuantiaMinima(e.fc, e.fy) * anchoCm * d, aceroTemperatura(e.h, e.fy) * anchoCm);
    const aceroDiseno = Math.max(aceroFlexion, aceroMinimo);

    // Armado: varillas repartidas en el ancho, separación a 2.5 cm y no mayor que la máxima.
    const libre = anchoCm - 2 * e.recubrimiento;
    const sMax = separacionMaxima(e.h);
    let cantidad = Math.max(2, Math.ceil((aceroDiseno * factor) / v.area - 1e-9));
    cantidad = Math.max(cantidad, Math.ceil(libre / sMax) + 1);
    const separacion = redondearAbajo(libre / (cantidad - 1), 2.5);
    cantidad = Math.floor(libre / separacion + 1e-9) + 1;
    return {
      volado,
      ancho: anchoCm / 100,
      presionCara: qCara * 10,
      presionBorde: qBorde * 10,
      vigaAncha: { actuante: vuViga / 1000, resistente: vRViga / 1000, cumple: vuViga <= vRViga },
      momento: mu / 1e5,
      aceroFlexion,
      aceroMinimo,
      aceroDiseno,
      factorFranja: factor,
      armado: { varilla: v.numero, cantidad, separacion, areaColocada: cantidad * v.area },
    };
  };

  // Varillas paralelas a L: volado en la dirección de L, con la presión que crece hacia el borde más cargado.
  const voladoL = cuadrada ? voladoCuadrada : (L - e.c2) / 2;
  const qCaraL = qu + (dq * (L - 2 * voladoL)) / L;
  const dirLargo = direccion(voladoL, B, qCaraL, qu + dq, L < B ? franja : 1);
  // Varillas paralelas a B: la presión media en todo el largo.
  const voladoB = cuadrada ? voladoCuadrada : (B - e.c1) / 2;
  const dirAncho = direccion(voladoB, L, qu, qu, L > B ? franja : 1);

  const fallan = [dirLargo, dirAncho].filter((x) => !x.vigaAncha.cumple);
  if (fallan.length)
    problemas.push(
      cuadrada || fallan.length === 2
        ? "no pasa por cortante como viga ancha; aumenta el peralte"
        : `no pasa por cortante como viga ancha en el volado de las varillas paralelas a ${fallan[0] === dirLargo ? "L" : "B"}; aumenta el peralte`,
    );

  const razon = (r: Revision) => r.actuante / r.resistente;
  const vigaAncha = razon(dirAncho.vigaAncha) > razon(dirLargo.vigaAncha) ? dirAncho.vigaAncha : dirLargo.vigaAncha;

  return {
    ladoMinimo,
    lado,
    largo,
    cuadrada,
    presionServicio,
    presionUltima,
    presiones,
    d,
    penetracion,
    direcciones: { largo: dirLargo, ancho: dirAncho },
    vigaAncha,
    momento: dirLargo.momento,
    aceroFlexion: dirLargo.aceroFlexion,
    aceroMinimo: dirLargo.aceroMinimo,
    aceroDiseno: dirLargo.aceroDiseno,
    armado: dirLargo.armado,
    problemas,
    cumple: problemas.length === 0,
  };
}

/** Espesor de la plantilla de concreto pobre bajo la zapata (m). Práctica común en México. */
export const ESPESOR_PLANTILLA = 0.05;

/**
 * Gancho estándar a 90° en cada extremo de las varillas de la parrilla: 12 db
 * de extensión (NTC-Concreto, anclaje con gancho estándar).
 */
export const GANCHO_ZAPATA_DB = 12;

/** Largo de una varilla de la parrilla (m): el lado menos dos recubrimientos más dos ganchos. */
export const largoVarillaZapata = (ladoM: number, recubrimiento: number, diametro: number) =>
  (ladoM * 100 - 2 * recubrimiento + 2 * GANCHO_ZAPATA_DB * diametro) / 100;

/**
 * Cantidades de una zapata: concreto, plantilla de 5 cm del tamaño de la
 * zapata, acero de la parrilla con ganchos y, si se pide, cimbra en el
 * perímetro (si se cuela contra el terreno no lleva).
 */
export function cuantificarZapata(e: EntradaZapata, r: ResultadoZapata, opciones: { cimbra: boolean }): Partida[] {
  const v = varilla(r.armado.varilla)!;
  const kg = kgPorMetro(v.numero);
  const { largo: dl, ancho: da } = r.direcciones;
  const acero = (a: Armado, ladoM: number) => a.cantidad * largoVarillaZapata(ladoM, e.recubrimiento, v.diametro) * kg;
  const partidas: Partida[] = [
    { concepto: `Concreto f'c = ${e.fc} kg/cm² en zapata`, material: "concreto", cantidad: (r.lado * r.largo * e.h) / 100 },
    { concepto: "Plantilla de concreto pobre de 5 cm", material: "concreto", cantidad: r.lado * r.largo * ESPESOR_PLANTILLA },
  ];
  const igual = r.cuadrada && dl.armado.cantidad === da.armado.cantidad;
  if (igual) {
    partidas.push({ concepto: `Acero #${v.numero} en parrilla, dos direcciones`, material: "acero", cantidad: 2 * acero(dl.armado, r.largo) });
  } else {
    partidas.push(
      { concepto: `Acero #${v.numero} paralelo al largo L`, material: "acero", cantidad: acero(dl.armado, r.largo) },
      { concepto: `Acero #${v.numero} paralelo al ancho B`, material: "acero", cantidad: acero(da.armado, r.lado) },
    );
  }
  if (opciones.cimbra)
    partidas.push({ concepto: "Cimbra perimetral de la zapata", material: "cimbra", cantidad: (2 * (r.lado + r.largo) * e.h) / 100 });
  return partidas;
}

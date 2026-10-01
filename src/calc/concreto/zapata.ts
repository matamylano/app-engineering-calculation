/**
 * Zapata aislada cuadrada, concéntrica, de concreto reforzado.
 *
 * Unidades de captura: t, t/m², m para la zapata y cm para la columna, el
 * peralte y el recubrimiento; f'c y fy en kg/cm². Por dentro se trabaja en
 * kg y cm. Revisa penetración, cortante como viga ancha y flexión en la cara
 * de la columna, y da el armado igual en las dos direcciones.
 */
import {
  aceroTemperatura,
  cortantePenetracion,
  cortanteVigaAncha,
  cuantiaMinima,
  fppc,
  FR_FLEXION,
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
  /** Lados de la columna (cm). */
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
  /** Lado de la zapata (m). Si se omite, el mínimo por qa redondeado a 5 cm. */
  lado?: number;
}

export interface Revision {
  /** Esfuerzo o fuerza actuante y resistente, en las unidades indicadas. */
  actuante: number;
  resistente: number;
  cumple: boolean;
}

export interface ResultadoZapata {
  /** Lado mínimo por capacidad del suelo (m). */
  ladoMinimo: number;
  /** Lado usado (m). */
  lado: number;
  /** Presión de servicio sobre el suelo, con el incremento (t/m²). */
  presionServicio: number;
  /** Presión neta última para diseño (t/m²). */
  presionUltima: number;
  /** Peralte efectivo (cm). */
  d: number;
  /** Penetración: esfuerzos en kg/cm². */
  penetracion: Revision & { perimetro: number; gamma: number };
  /** Viga ancha: fuerzas en t. */
  vigaAncha: Revision;
  /** Momento último en la cara de la columna (t·m), en todo el ancho. */
  momento: number;
  /** Acero requerido por flexión, mínimo y de diseño (cm², en todo el ancho). */
  aceroFlexion: number;
  aceroMinimo: number;
  aceroDiseno: number;
  armado: { varilla: number; cantidad: number; separacion: number; areaColocada: number };
  cumple: boolean;
}

function revisar(valor: number, nombre: string, min = 0, max = Infinity) {
  if (!Number.isFinite(valor) || valor <= min) throw new RangeError(`${nombre} debe ser mayor que ${min}.`);
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

const redondearArriba5cm = (m: number) => Math.ceil(m * 20 - 1e-9) / 20;
const redondearAbajo = (x: number, paso: number) => Math.floor(x / paso + 1e-9) * paso;

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

  const ladoMinimo = redondearArriba5cm(Math.sqrt((e.carga * (1 + e.incremento)) / e.qa));
  const lado = e.lado ?? ladoMinimo;
  revisar(lado, "El lado de la zapata", 0.3, 10);
  if (lado + 1e-9 < ladoMinimo) throw new RangeError(`La zapata debe medir al menos ${ladoMinimo.toFixed(2)} m por lado.`);
  const B = lado * 100; // cm
  if (B <= Math.max(e.c1, e.c2)) throw new RangeError("La zapata debe ser más grande que la columna.");

  const presionServicio = (e.carga * (1 + e.incremento)) / (lado * lado);
  const presionUltima = e.cargaUltima / (lado * lado); // t/m²
  const qu = (presionUltima * 1000) / 10000; // kg/cm²

  // Peralte efectivo al centroide del lecho superior (dos lechos cruzados).
  const d = e.h - e.recubrimiento - 1.5 * v.diametro;
  if (d <= 0) throw new RangeError("El peralte no alcanza para el recubrimiento y las varillas.");

  // Penetración: sección crítica a d/2 de la columna.
  const a1 = e.c1 + d;
  const a2 = e.c2 + d;
  const perimetro = 2 * (a1 + a2);
  const vuPen = qu * (B * B - a1 * a2); // kg
  const gamma = Math.min(e.c1, e.c2) / Math.max(e.c1, e.c2);
  const vPen = vuPen / (perimetro * d);
  const vRPen = cortantePenetracion(e.fc, gamma);

  // Viga ancha: sección a d de la cara de la columna más ancha en esa dirección.
  const volado = (B - Math.min(e.c1, e.c2)) / 2; // cm, dirección más desfavorable
  const vuViga = qu * B * Math.max(volado - d, 0); // kg
  const vRViga = cortanteVigaAncha(e.fc) * B * d; // kg

  // Flexión en la cara de la columna.
  const mu = (qu * B * volado * volado) / 2; // kg·cm
  const fpc = fppc(e.fc);
  const k = 1 - (2 * mu) / (FR_FLEXION * fpc * B * d * d);
  if (k < 0) throw new RangeError("La sección no resiste el momento: aumenta el peralte.");
  const aceroFlexion = ((fpc * B * d) / e.fy) * (1 - Math.sqrt(k));
  const aceroMinimo = Math.max(cuantiaMinima(e.fc, e.fy) * B * d, aceroTemperatura(e.h, e.fy) * B);
  const aceroDiseno = Math.max(aceroFlexion, aceroMinimo);

  // Armado: varillas repartidas en el ancho, separación a 2.5 cm y no mayor que la máxima.
  const ancho = B - 2 * e.recubrimiento;
  const sMax = separacionMaxima(e.h);
  let cantidad = Math.max(2, Math.ceil(aceroDiseno / v.area));
  cantidad = Math.max(cantidad, Math.ceil(ancho / sMax) + 1);
  const separacion = redondearAbajo(ancho / (cantidad - 1), 2.5);
  cantidad = Math.floor(ancho / separacion + 1e-9) + 1;

  const penetracion = { actuante: vPen, resistente: vRPen, cumple: vPen <= vRPen, perimetro, gamma };
  const vigaAncha = { actuante: vuViga / 1000, resistente: vRViga / 1000, cumple: vuViga <= vRViga };

  return {
    ladoMinimo,
    lado,
    presionServicio,
    presionUltima,
    d,
    penetracion,
    vigaAncha,
    momento: mu / 1e5,
    aceroFlexion,
    aceroMinimo,
    aceroDiseno,
    armado: { varilla: v.numero, cantidad, separacion, areaColocada: cantidad * v.area },
    cumple: penetracion.cumple && vigaAncha.cumple,
  };
}

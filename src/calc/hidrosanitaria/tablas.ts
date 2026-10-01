/**
 * Tablas y criterios de la instalación hidráulica y sanitaria de una casa.
 * Están juntos para que el ingeniero responsable los revise en un solo lugar.
 */

export type Mueble = "excusado" | "lavabo" | "regadera" | "fregadero" | "lavadero" | "lavadora";

export const MUEBLES: Record<
  Mueble,
  { nombre: string; /** unidades mueble de agua, uso privado */ um: number; /** unidades de descarga */ ud: number; /** desagüe (mm) */ desague: number }
> = {
  excusado: { nombre: "Excusado (con tanque)", um: 2.2, ud: 3, desague: 100 },
  lavabo: { nombre: "Lavabo", um: 0.7, ud: 1, desague: 38 },
  regadera: { nombre: "Regadera", um: 1.4, ud: 2, desague: 50 },
  fregadero: { nombre: "Fregadero de cocina", um: 1.4, ud: 2, desague: 50 },
  lavadero: { nombre: "Lavadero", um: 1.4, ud: 2, desague: 50 },
  lavadora: { nombre: "Lavadora", um: 1.4, ud: 2, desague: 50 },
};

/**
 * Curva de Hunter para muebles con tanque: unidades mueble → gasto probable
 * en galones por minuto (IPC, apéndice E).
 */
export const HUNTER_TANQUE: [number, number][] = [
  [1, 3.0], [2, 5.0], [3, 6.5], [4, 8.0], [5, 9.4], [6, 10.7], [7, 11.8], [8, 12.8], [9, 13.7], [10, 14.6],
  [11, 15.4], [12, 16.0], [13, 16.5], [14, 17.0], [15, 17.5], [16, 18.0], [17, 18.4], [18, 18.8], [19, 19.2],
  [20, 19.6], [25, 21.5], [30, 23.3], [35, 24.9], [40, 26.3], [45, 27.7], [50, 29.1], [60, 32.0], [70, 35.0],
  [80, 38.0], [90, 41.0], [100, 43.5],
];
export const LPS_POR_GPM = 0.0630902;

/** Tubería de cobre tipo M: diámetro nominal y diámetro interior (mm). */
export const TUBOS: { nominal: string; mm: number; interior: number }[] = [
  { nominal: '½"', mm: 13, interior: 14.45 },
  { nominal: '¾"', mm: 19, interior: 20.6 },
  { nominal: '1"', mm: 25, interior: 26.8 },
  { nominal: '1¼"', mm: 32, interior: 32.79 },
  { nominal: '1½"', mm: 38, interior: 38.79 },
  { nominal: '2"', mm: 51, interior: 51.03 },
];

/** Coeficiente de Hazen-Williams para cobre. */
export const C_HAZEN = 140;
/** Velocidad máxima en tuberías de agua (m/s). */
export const VELOCIDAD_MAXIMA = 2;
/** Longitud equivalente de accesorios como fracción de la longitud de tubo. */
export const FACTOR_ACCESORIOS = 0.3;
/** Presión mínima en la salida más desfavorable (m de columna de agua). */
export const PRESION_MINIMA = 2;
/** Eficiencia de la bomba. */
export const EFICIENCIA_BOMBA = 0.6;
/** Potencias comerciales de bombas (HP). */
export const BOMBAS_HP = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

/** Capacidades comerciales (L). */
export const TINACOS = [450, 600, 750, 1100, 2500];
export const CISTERNAS = [1200, 2800, 5000, 10000];

/** Drenaje: albañal, pendiente y distancia entre registros. */
export const ALBANAL_MINIMO = 150; // mm
export const PENDIENTE_MINIMA = 2; // %
export const DISTANCIA_REGISTROS = 10; // m
/** Unidades de descarga que acepta un colector de 100 mm al 2 %. */
export const UD_COLECTOR_100 = 216;

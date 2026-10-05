/**
 * Criterios de diseño de pozos de agua. Están juntos para que el ingeniero
 * responsable los revise en un solo lugar.
 */

/** Diámetro de ademe recomendado según el gasto (L/s), para alojar la bomba. */
export const ADEMES: { hasta: number; pulgadas: number }[] = [
  { hasta: 6, pulgadas: 6 },
  { hasta: 11, pulgadas: 8 },
  { hasta: 25, pulgadas: 10 },
  { hasta: 41, pulgadas: 12 },
  { hasta: 57, pulgadas: 14 },
];

/** Velocidad máxima de entrada del agua por las aberturas de la rejilla (m/s). */
export const VELOCIDAD_ENTRADA = 0.03;

/** Tubería de columna (acero cédula 40): diámetro nominal y diámetro interior (mm). */
export const COLUMNAS: { nominal: string; interior: number }[] = [
  { nominal: '2"', interior: 52.5 },
  { nominal: '2½"', interior: 62.7 },
  { nominal: '3"', interior: 77.9 },
  { nominal: '4"', interior: 102.3 },
  { nominal: '6"', interior: 154.1 },
];

/** Coeficiente de Hazen-Williams del acero en servicio. */
export const C_COLUMNA = 120;
/** Velocidad máxima en la columna (m/s). */
export const VELOCIDAD_COLUMNA = 2;
/** Longitud equivalente de accesorios como fracción de la longitud de tubo. */
export const FACTOR_ACCESORIOS = 0.2;
/** Eficiencia de la bomba sumergible con su motor. */
export const EFICIENCIA_BOMBA = 0.65;
/** Potencias comerciales de bombas sumergibles (HP). */
export const BOMBAS_HP = [1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100];

// ── Energía, costo y extracción ─────────────────────────────────────────────

/** kW por HP. */
export const KW_POR_HP = 0.746;
/**
 * Eficiencia del motor sumergible cuando el usuario no la da. Los motores
 * trifásicos de la NOM-016-ENER pasan de 85 %; los sumergibles suelen quedar
 * entre 75 y 85 %: se usa 80 %, conservador.
 */
export const EFICIENCIA_MOTOR = 0.8;
/**
 * Tarifa eléctrica de referencia ($/kWh) que trae el formulario nuevo: costo
 * medio aproximado de la tarifa GDMTO de CFE (media tensión ordinaria). La
 * tarifa 9-CU de bombeo agrícola es mucho menor y la PDBT mayor; el usuario
 * debe poner la de su recibo.
 */
export const TARIFA_REFERENCIA = 2.5;
/** Días de bombeo al año cuando el usuario no los da. */
export const DIAS_ANO = 365;
/** Fracción del volumen concesionado a partir de la cual se avisa. */
export const AVISO_CONCESION = 0.9;

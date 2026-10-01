/**
 * Criterios de drenaje pluvial y fosas sépticas. Están juntos para que el
 * ingeniero responsable los revise en un solo lugar.
 */

/** Coeficientes de escurrimiento del método racional. */
export const SUPERFICIES = {
  azotea: { nombre: "Azoteas y techos", c: 0.95 },
  pavimento: { nombre: "Pisos de concreto y pavimentos", c: 0.85 },
  jardin: { nombre: "Jardines y áreas verdes", c: 0.2 },
} as const;
export type Superficie = keyof typeof SUPERFICIES;

/** Tuberías de PVC sanitario: diámetros (mm) y coeficiente de Manning. */
export const DIAMETROS_PLUVIAL = [100, 150, 200, 250, 300, 375, 450];
export const MANNING_PVC = 0.009;
/** La tubería se diseña a esta fracción de su capacidad a tubo lleno. */
export const LLENADO_MAXIMO = 0.8;
/** Tiempo máximo para que un pozo de absorción se vacíe (h). */
export const VACIADO_MAXIMO = 48;

/**
 * Fosa séptica, método de la NBR 7229: V = 1000 + N (C T + K Lf), en litros.
 * T: tiempo de retención (días) según la contribución diaria (L).
 */
export const RETENCION: { hasta: number; dias: number }[] = [
  { hasta: 1500, dias: 1 },
  { hasta: 3000, dias: 0.92 },
  { hasta: 4500, dias: 0.83 },
  { hasta: 6000, dias: 0.75 },
  { hasta: 7500, dias: 0.67 },
  { hasta: 9000, dias: 0.58 },
  { hasta: Infinity, dias: 0.5 },
];
/** K: acumulación de lodo digerido (días) por intervalo de limpieza (años) y temperatura media. */
export const ACUMULACION: Record<number, { frio: number; templado: number; calido: number }> = {
  1: { frio: 94, templado: 65, calido: 57 },
  2: { frio: 134, templado: 105, calido: 97 },
  3: { frio: 174, templado: 145, calido: 137 },
  4: { frio: 214, templado: 185, calido: 177 },
  5: { frio: 254, templado: 225, calido: 217 },
};
/** Lodo fresco por persona en vivienda (L/hab/día). */
export const LODO_FRESCO = 1;
/** Profundidad útil mínima y máxima según el volumen (m³ → m). */
export const PROFUNDIDADES: { hasta: number; minima: number; maxima: number }[] = [
  { hasta: 6, minima: 1.2, maxima: 2.2 },
  { hasta: 10, minima: 1.5, maxima: 2.5 },
  { hasta: Infinity, minima: 1.8, maxima: 2.8 },
];
/** Biodigestores prefabricados comunes (L). */
export const BIODIGESTORES = [600, 1300, 3000, 7000];
/** Zanjas de infiltración: ancho del fondo y largo máximo de cada una (m). */
export const ANCHO_ZANJA = 0.6;
export const LARGO_MAXIMO_ZANJA = 30;

/**
 * Constantes de las NTC para Diseño y Construcción de Estructuras de
 * Concreto (CDMX). Todas en kg y cm. Están juntas para que el ingeniero
 * responsable las revise en un solo lugar antes de publicar.
 */

/** Factores de resistencia. */
export const FR_FLEXION = 0.9;
export const FR_CORTANTE = 0.75;

/** Esfuerzo uniforme del bloque de compresión: f''c = 0.85 f'c. */
export const fppc = (fc: number) => 0.85 * fc;

/** Acero mínimo por flexión: As,min = 0.7 √f'c / fy · b · d. */
export const cuantiaMinima = (fc: number, fy: number) => (0.7 * Math.sqrt(fc)) / fy;

/**
 * Acero mínimo por cambios volumétricos en una dirección (cm²/cm de ancho):
 * as1 = 660 x1 / (fy (x1 + 100)), con x1 el espesor en cm.
 */
export const aceroTemperatura = (espesor: number, fy: number) => (660 * espesor) / (fy * (espesor + 100));

/** Separación máxima del refuerzo en losas y zapatas: menor de 50 cm y 3.5 x1. */
export const separacionMaxima = (espesor: number) => Math.min(50, 3.5 * espesor);

/**
 * Cortante resistente por penetración (punzonamiento), en kg/cm²:
 * vcR = FR (0.5 + γ) √f'c ≤ FR √f'c, con γ = lado corto / lado largo de la columna.
 */
export const cortantePenetracion = (fc: number, gamma: number) =>
  FR_CORTANTE * Math.min(0.5 + gamma, 1) * Math.sqrt(fc);

/** Cortante resistente como viga ancha, en kg/cm²: vcR = 0.5 FR √f'c. */
export const cortanteVigaAncha = (fc: number) => 0.5 * FR_CORTANTE * Math.sqrt(fc);

export interface Varilla {
  numero: number;
  /** Diámetro en cm. */
  diametro: number;
  /** Área en cm². */
  area: number;
}

export const VARILLAS: Varilla[] = [
  { numero: 3, diametro: 0.953, area: 0.71 },
  { numero: 4, diametro: 1.27, area: 1.27 },
  { numero: 5, diametro: 1.588, area: 1.99 },
  { numero: 6, diametro: 1.905, area: 2.87 },
  { numero: 8, diametro: 2.54, area: 5.07 },
];

export const varilla = (numero: number) => VARILLAS.find((v) => v.numero === numero);

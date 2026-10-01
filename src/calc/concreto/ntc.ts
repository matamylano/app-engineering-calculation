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

/** Factor del bloque de compresión: 0.85 hasta f'c = 280 y baja 0.05 por cada 70 kg/cm², sin bajar de 0.65. */
export const beta1 = (fc: number) => Math.max(0.65, Math.min(0.85, 0.85 - (0.05 * (fc - 280)) / 70));

/** Cuantía balanceada: ρb = (f''c / fy) · 6000 β1 / (fy + 6000). */
export const cuantiaBalanceada = (fc: number, fy: number) => (fppc(fc) / fy) * ((6000 * beta1(fc)) / (fy + 6000));

/** Cuantía máxima de tensión: 75 % de la balanceada (criterio para zona sísmica). */
export const cuantiaMaxima = (fc: number, fy: number) => 0.75 * cuantiaBalanceada(fc, fy);

/**
 * Acero de tensión para un momento último (cm²), sección rectangular con
 * refuerzo simple: As = (f''c b d / fy) (1 − √(1 − 2 Mu / (FR f''c b d²))).
 * Mu en kg·cm, b y d en cm. Devuelve null si la sección no alcanza.
 */
export function aceroPorFlexion(mu: number, b: number, d: number, fc: number, fy: number): number | null {
  const f = fppc(fc);
  const k = 1 - (2 * mu) / (FR_FLEXION * f * b * d * d);
  if (k < 0) return null;
  return ((f * b * d) / fy) * (1 - Math.sqrt(k));
}

/** Factor de resistencia en flexocompresión (columnas con estribos). */
export const FR_COMPRESION = 0.65;

/** Módulo de elasticidad del acero (kg/cm²) y deformación última del concreto. */
export const ES = 2_000_000;
export const EPSILON_CU = 0.003;

/** Módulo de elasticidad del concreto clase 1 (kg/cm²): 14 000 √f'c. */
export const moduloConcreto = (fc: number) => 14_000 * Math.sqrt(fc);

/** Cuantías mínima y máxima del refuerzo longitudinal de columnas. */
export const CUANTIA_MIN_COLUMNA = 0.01;
export const CUANTIA_MAX_COLUMNA = 0.04;

/** Separación máxima de estribos en columnas: menor de 850 db / √fy, 48 de y b / 2. */
export const separacionEstribosColumna = (db: number, de: number, fy: number, b: number) =>
  Math.min((850 * db) / Math.sqrt(fy), 48 * de, b / 2);

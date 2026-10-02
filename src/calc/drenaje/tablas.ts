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

/* ---------- Bajadas pluviales ---------- */

/**
 * Diámetros comerciales de PVC para bajadas de azotea (mm). La capacidad de
 * cada uno se calcula con la fórmula de Wyly-Eaton para tubo vertical,
 * Q (gpm) = 27.8 r^(5/3) d^(8/3), con d en pulgadas y el tubo ocupado a 7/24
 * de su sección (la ocupación que usan los reglamentos de plomería para
 * bajantes; es más conservadora que las tablas de bajadas pluviales del IPC,
 * que corresponden a cerca de 1/3).
 */
export const DIAMETROS_BAJADA = [75, 100, 150] as const;
export const OCUPACION_BAJADA = 7 / 24;
/**
 * Área de azotea que se acostumbra dar a cada bajada (m²), aunque el tubo
 * lleve más: si una coladera se tapa, las demás desalojan el agua. Práctica
 * usual en México (una bajada de 100 mm por cada 100 m²); a validar.
 */
export const AREA_MAXIMA_POR_BAJADA = 100;

/* ---------- Captación de agua de lluvia ---------- */

/** Días de cada mes (febrero de 28) para pasar la demanda diaria a mensual. */
export const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
/**
 * Coeficiente de escurrimiento del techo para captación: 0.8 a 0.9 en techos
 * de concreto o lámina; ya descuenta salpicaduras, evaporación y el agua de
 * las primeras lluvias que se desvía (lineamientos de captación de agua de
 * lluvia de la CONAGUA). El usuario lo puede cambiar.
 */
export const COEFICIENTE_TECHO = 0.85;
/** La cisterna recomendada se redondea hacia arriba a este múltiplo (m³) y nunca es menor que el mínimo. */
export const PASO_CISTERNA = 0.5;
export const CISTERNA_MINIMA = 1;
/** Tamaños de cisterna (m³) con los que se compara la cobertura, para que el cliente escoja. */
export const CISTERNAS_COMPARACION = [2.5, 5, 10, 20, 40];

/* ---------- Trampa de grasas ---------- */

/**
 * Por personas: V = 2 N + 20 (L), N = personas que atiende la cocina
 * (NBR 8160, caja de grasa especial; para una vivienda da un volumen del
 * orden de la caja sencilla de 31 L de la misma norma).
 */
export const TRAMPA_POR_PERSONA = 2;
export const TRAMPA_BASE = 20;
/** Tirante útil y lado mínimo interior de la trampa (m); práctica usual, a validar. */
export const TIRANTE_TRAMPA = 0.4;
export const LADO_MINIMO_TRAMPA = 0.3;
/** Tiempo de retención por omisión cuando se diseña con el gasto del fregadero (min). */
export const RETENCION_TRAMPA = 3;

/* ---------- Pozo de absorción del efluente ---------- */

/**
 * Solo se cuenta el área de las paredes (el fondo se colmata pronto) y el
 * pozo se reparte en varios si pasa de la profundidad útil máxima. Diámetro
 * mínimo práctico para poder excavarlo y revestirlo.
 */
export const DIAMETRO_MINIMO_POZO_FOSA = 0.9;
/** Distancia libre mínima entre pozos, en diámetros del pozo (criterio conservador, a validar). */
export const SEPARACION_POZOS = 2;

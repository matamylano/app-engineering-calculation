/**
 * Tablas y criterios de la instalación hidráulica y sanitaria de una casa.
 * Están juntos para que el ingeniero responsable los revise en un solo lugar.
 */

export type Mueble =
  | "excusado"
  | "lavabo"
  | "regadera"
  | "tina"
  | "fregadero"
  | "lavavajillas"
  | "lavadero"
  | "lavadora"
  | "llaveJardin";

export const MUEBLES: Record<
  Mueble,
  {
    nombre: string;
    /** unidades mueble de agua, uso privado */
    um: number;
    /** unidades de descarga */
    ud: number;
    /** desagüe (mm); 0 si el mueble no descarga al drenaje */
    desague: number;
    /** usa agua caliente (cuenta para las salidas de agua caliente) */
    caliente: boolean;
  }
> = {
  // UM: IPC, tabla E103.3(2), uso privado, columna "total". UD y desagües: IPC,
  // tabla 709.1, con los diámetros que se usan en México (38, 50 y 100 mm).
  // La tina, el lavavajillas y la llave de jardín siguen la misma tabla: tina y
  // lavavajillas 1.4 UM y 2 UD con desagüe de 38 mm (1½"); llave de jardín
  // (nariz) 2.5 UM y sin descarga al drenaje sanitario.
  excusado: { nombre: "Excusado (con tanque)", um: 2.2, ud: 3, desague: 100, caliente: false },
  lavabo: { nombre: "Lavabo", um: 0.7, ud: 1, desague: 38, caliente: true },
  regadera: { nombre: "Regadera", um: 1.4, ud: 2, desague: 50, caliente: true },
  tina: { nombre: "Tina de baño", um: 1.4, ud: 2, desague: 38, caliente: true },
  fregadero: { nombre: "Fregadero de cocina", um: 1.4, ud: 2, desague: 50, caliente: true },
  lavavajillas: { nombre: "Lavavajillas", um: 1.4, ud: 2, desague: 38, caliente: true },
  lavadero: { nombre: "Lavadero", um: 1.4, ud: 2, desague: 50, caliente: false },
  lavadora: { nombre: "Lavadora", um: 1.4, ud: 2, desague: 50, caliente: true },
  llaveJardin: { nombre: "Llave de jardín (nariz)", um: 2.5, ud: 0, desague: 0, caliente: false },
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

/**
 * Reserva por omisión cuando el usuario deja el campo vacío: dos días en la
 * cisterna y uno en el tinaco (criterio usual de vivienda; en zonas con
 * tandeo se usan los días seguidos sin servicio más uno).
 */
export const RESERVA_CISTERNA = 2; // días
export const RESERVA_TINACO = 1; // días
/** Límite de días de reserva en cisterna (zonas con tandeo largo). */
export const RESERVA_CISTERNA_MAXIMA = 15;

/**
 * Registros: 40 × 60 cm hasta 1 m de profundidad y 50 × 70 cm de 1 a 2 m
 * (Reglamento de Construcciones de la CDMX, NTC para el proyecto
 * arquitectónico).
 */
export const REGISTRO_SOMERO = "40 × 60 cm";

// ── Calentador de agua ──────────────────────────────────────────────────────

export type TipoCalentador = "ninguno" | "paso" | "deposito" | "solar";

export const CALENTADORES: Record<TipoCalentador, string> = {
  ninguno: "Sin calentador",
  paso: "De paso (instantáneo)",
  deposito: "De depósito",
  solar: "Solar con termotanque",
};

/**
 * Consumo de agua caliente por persona (L/día, a la temperatura de uso).
 * Criterio práctico de la CONUEE para calentadores solares en vivienda
 * (40 a 50 L/persona/día); se usa el valor alto, conservador.
 */
export const CONSUMO_CALIENTE = 50;
/** Temperatura del agua fría (°C): invierno en el centro del país, conservador. */
export const TEMPERATURA_FRIA = 15;
/** Temperatura de uso en la regadera (°C). */
export const TEMPERATURA_USO = 40;
/** Temperatura de almacenamiento en un calentador de depósito (°C). */
export const TEMPERATURA_DEPOSITO = 60;
/** Gasto de una regadera (L/min): máximo de la NOM-008-CONAGUA-1998. */
export const GASTO_REGADERA = 10;
/** Duración de un baño en la hora pico (min). */
export const DURACION_BANO = 10;
/** Regaderas a la vez cuando el usuario no lo indica (simultaneidad usual en vivienda). */
export const REGADERAS_SIMULTANEAS = 2;
/** Fracción del depósito que sale caliente antes de enfriarse por la mezcla con el agua que entra. */
export const FRACCION_UTIL_DEPOSITO = 0.7;
/** Fracción del consumo diario de agua caliente que ocurre en la hora pico. */
export const FRACCION_HORA_PICO = 1 / 3;
/**
 * Los calentadores de paso en México se venden por L/min con un aumento de
 * 25 °C sobre el agua fría.
 */
export const DELTA_T_PASO = 25;
/** Capacidades comerciales de calentadores de paso (L/min a ΔT = 25 °C). */
export const CALENTADORES_PASO = [6, 11, 13, 16, 26];
/** Capacidades comerciales de calentadores de depósito (L): 10, 15, 20, 30, 40, 50 y 75 galones. */
export const CALENTADORES_DEPOSITO = [38, 57, 76, 114, 151, 189, 284];
/** Capacidades comerciales de termotanques solares (L). */
export const TERMOTANQUES_SOLARES = [150, 180, 200, 240, 300];
/** Agua que calienta un tubo al vacío de 58 mm × 1.8 m (L/día), criterio de fabricantes. */
export const LITROS_POR_TUBO = 12.5;
/** Agua que calienta un m² de colector plano (L/día), criterio práctico de la CONUEE (50 a 75 L/m²). */
export const LITROS_POR_M2_PLANO = 60;

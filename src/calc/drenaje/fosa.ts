/**
 * Fosa séptica de una vivienda con el método de la NBR 7229, sus medidas,
 * la disposición del efluente (zanjas o pozos de absorción), la trampa de
 * grasas de la cocina y el programa de desazolve.
 */
import {
  ACUMULACION,
  ANCHO_ZANJA,
  BIODIGESTORES,
  DIAMETRO_MINIMO_POZO_FOSA,
  LADO_MINIMO_TRAMPA,
  LARGO_MAXIMO_ZANJA,
  LODO_FRESCO,
  PROFUNDIDADES,
  RETENCION,
  TIRANTE_TRAMPA,
  TRAMPA_BASE,
  TRAMPA_POR_PERSONA,
} from "./tablas";

export interface EntradaFosa {
  habitantes: number;
  /** Aportación de aguas negras (L/hab/día). */
  aportacion: number;
  /** Años entre limpiezas (1 a 5). */
  limpieza: number;
  /** Temperatura media del mes más frío (°C). */
  temperatura: number;
  /** Profundidad útil propuesta (m). */
  profundidad: number;
  /** Tasa de aplicación del suelo según la prueba de percolación (L/m²/día). */
  tasaAplicacion: number;
  /** Disposición del efluente; sin dato, zanjas. */
  disposicion?: "zanjas" | "pozo";
  /** Pozo de absorción: diámetro y profundidad útil máxima de cada pozo (m). */
  pozo?: { diametro: number; profundidadMaxima: number };
  /** Trampa de grasas de la cocina; sin este dato no se calcula. */
  trampa?: { metodo: "personas" } | { metodo: "gasto"; gasto: number; retencion: number };
  /** Mes en que empieza a operar la fosa (AAAA-MM), para fechar los desazolves. */
  inicio?: string;
  /** Precio de un servicio de desazolve ($). */
  costoDesazolve?: number;
}

export interface ResultadoPozoFosa {
  diametro: number;
  /** Profundidad útil de pared que pide el área (m), en total. */
  profundidadTotal: number;
  cantidad: number;
  /** Profundidad útil de cada pozo, redondeada a 10 cm. */
  profundidad: number;
  /** Área de paredes que se construye (m²). */
  areaConstruida: number;
}

export interface ResultadoTrampa {
  metodo: "personas" | "gasto";
  /** L */
  volumen: number;
  ancho: number;
  largo: number;
  tirante: number;
  volumenConstruido: number;
}

export interface ResultadoMantenimiento {
  /** Lodo acumulado al momento de la limpieza (L) y fracción del volumen útil. */
  lodos: number;
  fraccion: number;
  /** Años entre desazolves. */
  periodo: number;
  /** Próximas fechas de desazolve (AAAA-MM). */
  fechas: string[];
  costoAnual?: number;
}

export interface ResultadoFosa {
  contribucion: number;
  retencion: number;
  acumulacion: number;
  /** L */
  volumen: number;
  profundidades: { minima: number; maxima: number };
  medidas: { ancho: number; largo: number; volumenConstruido: number };
  biodigestor: number | null;
  campo: { area: number; longitud: number; zanjas: number };
  /** Opcionales para que se sigan leyendo las memorias anteriores. */
  disposicion?: "zanjas" | "pozo";
  pozo?: ResultadoPozoFosa;
  trampa?: ResultadoTrampa;
  mantenimiento?: ResultadoMantenimiento;
  problemas: string[];
  cumple: boolean;
}

function revisar(valor: number, nombre: string, min = 0, max = Infinity) {
  if (!Number.isFinite(valor) || valor <= min) throw new RangeError(`${nombre} debe ser mayor que ${min}.`);
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

const arriba5cm = (m: number) => Math.ceil(m * 20 - 1e-9) / 20;

export function disenarFosa(e: EntradaFosa): ResultadoFosa {
  revisar(e.habitantes, "El número de habitantes", 0, 100);
  revisar(e.aportacion, "La aportación", 0, 500);
  if (!Number.isInteger(e.limpieza) || !ACUMULACION[e.limpieza]) throw new RangeError("La limpieza debe ser de 1 a 5 años.");
  if (!Number.isFinite(e.temperatura) || e.temperatura < -10 || e.temperatura > 45)
    throw new RangeError("Revisa la temperatura media.");
  revisar(e.profundidad, "La profundidad útil", 0.5, 4);
  revisar(e.tasaAplicacion, "La tasa de aplicación", 0, 500);
  const problemas: string[] = [];

  const contribucion = e.habitantes * e.aportacion;
  const retencion = RETENCION.find((r) => contribucion <= r.hasta)!.dias;
  const k = ACUMULACION[e.limpieza];
  const acumulacion = e.temperatura <= 10 ? k.frio : e.temperatura <= 20 ? k.templado : k.calido;
  const volumen = 1000 + e.habitantes * (e.aportacion * retencion + acumulacion * LODO_FRESCO);

  const profundidades = PROFUNDIDADES.find((p) => volumen / 1000 <= p.hasta)!;
  if (e.profundidad < profundidades.minima || e.profundidad > profundidades.maxima)
    problemas.push(
      `la profundidad útil debe estar entre ${profundidades.minima} y ${profundidades.maxima} m para este volumen`,
    );

  // Planta rectangular con el largo del doble del ancho.
  const area = volumen / 1000 / e.profundidad;
  const ancho = arriba5cm(Math.sqrt(area / 2));
  const largo = arriba5cm(area / ancho);
  const biodigestor = BIODIGESTORES.find((b) => b >= volumen) ?? null;

  const areaCampo = contribucion / e.tasaAplicacion;
  const longitud = areaCampo / ANCHO_ZANJA;
  const disposicion = e.disposicion ?? "zanjas";
  const pozo = disposicion === "pozo" ? disenarPozoFosa(areaCampo, e.pozo) : undefined;
  const trampa = e.trampa ? disenarTrampa(e.trampa, e.habitantes) : undefined;
  const mantenimiento = programaDesazolve(e, e.habitantes * acumulacion * LODO_FRESCO, volumen);

  return {
    contribucion,
    retencion,
    acumulacion,
    volumen,
    profundidades: { minima: profundidades.minima, maxima: profundidades.maxima },
    medidas: { ancho, largo, volumenConstruido: ancho * largo * e.profundidad * 1000 },
    biodigestor,
    campo: { area: areaCampo, longitud, zanjas: Math.ceil(longitud / LARGO_MAXIMO_ZANJA - 1e-9) },
    disposicion,
    pozo,
    trampa,
    mantenimiento,
    problemas,
    cumple: problemas.length === 0,
  };
}

/**
 * Pozos de absorción para el efluente. Solo cuenta el área de las paredes,
 * π D h, que debe igualar el área de infiltración que pide la tasa de
 * aplicación; si la profundidad pasa de la máxima se reparte en varios pozos
 * iguales.
 */
export function disenarPozoFosa(area: number, p: EntradaFosa["pozo"]): ResultadoPozoFosa {
  if (!p) throw new RangeError("Captura el diámetro y la profundidad máxima del pozo de absorción.");
  if (!Number.isFinite(p.diametro) || p.diametro < DIAMETRO_MINIMO_POZO_FOSA || p.diametro > 5)
    throw new RangeError(`El diámetro del pozo de absorción debe estar entre ${DIAMETRO_MINIMO_POZO_FOSA} y 5 m.`);
  revisar(p.profundidadMaxima, "La profundidad útil máxima del pozo", 0.5, 15);
  const profundidadTotal = area / (Math.PI * p.diametro);
  const cantidad = Math.ceil(profundidadTotal / p.profundidadMaxima - 1e-9);
  const profundidad = Math.ceil((profundidadTotal / cantidad) * 10 - 1e-9) / 10;
  return {
    diametro: p.diametro,
    profundidadTotal,
    cantidad,
    profundidad,
    areaConstruida: cantidad * Math.PI * p.diametro * profundidad,
  };
}

/**
 * Trampa de grasas de la cocina. Por personas, V = 2 N + 20 (NBR 8160); por
 * gasto, V = Q · t con el gasto del fregadero y el tiempo de retención.
 * Caja rectangular con el tirante útil fijo y el largo del doble del ancho.
 */
export function disenarTrampa(t: NonNullable<EntradaFosa["trampa"]>, habitantes: number): ResultadoTrampa {
  let volumen: number;
  if (t.metodo === "gasto") {
    revisar(t.gasto, "El gasto del fregadero", 0, 10);
    revisar(t.retencion, "El tiempo de retención de la trampa", 0, 60);
    volumen = t.gasto * 60 * t.retencion;
  } else {
    volumen = TRAMPA_POR_PERSONA * habitantes + TRAMPA_BASE;
  }
  const area = volumen / 1000 / TIRANTE_TRAMPA;
  const ancho = Math.max(LADO_MINIMO_TRAMPA, arriba5cm(Math.sqrt(area / 2)));
  const largo = Math.max(ancho, arriba5cm(area / ancho));
  return {
    metodo: t.metodo,
    volumen,
    ancho,
    largo,
    tirante: TIRANTE_TRAMPA,
    volumenConstruido: ancho * largo * TIRANTE_TRAMPA * 1000,
  };
}

const MES_VALIDO = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * Lodo al momento de la limpieza: el volumen de lodo con que se diseñó la
 * fosa, N · K · Lf. Se desazolva cada tanto como se escogió al diseñar; con
 * el mes de arranque se fechan los tres siguientes.
 */
function programaDesazolve(e: EntradaFosa, lodos: number, volumen: number): ResultadoMantenimiento {
  const fechas: string[] = [];
  if (e.inicio !== undefined) {
    const m = MES_VALIDO.exec(e.inicio);
    if (!m) throw new RangeError("Escribe el mes de arranque como AAAA-MM, por ejemplo 2026-10.");
    const anio = Number(m[1]);
    if (anio < 1950 || anio > 2200) throw new RangeError("Revisa el año de arranque.");
    for (let i = 1; i <= 3; i++) fechas.push(`${anio + i * e.limpieza}-${m[2]}`);
  }
  let costoAnual: number | undefined;
  if (e.costoDesazolve !== undefined) {
    if (!Number.isFinite(e.costoDesazolve) || e.costoDesazolve < 0 || e.costoDesazolve > 10_000_000)
      throw new RangeError("Revisa el precio del desazolve.");
    costoAnual = e.costoDesazolve / e.limpieza;
  }
  return { lodos, fraccion: lodos / volumen, periodo: e.limpieza, fechas, costoAnual };
}

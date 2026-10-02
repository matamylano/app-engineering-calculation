/**
 * Drenaje pluvial de un predio: gasto por el método racional, diámetro de
 * la tubería con Manning, bajadas de azotea, pozos de absorción si el agua se
 * infiltra y, como opción, la captación de agua de lluvia con su cisterna.
 */
import {
  AREA_MAXIMA_POR_BAJADA,
  CISTERNA_MINIMA,
  CISTERNAS_COMPARACION,
  DIAMETROS_BAJADA,
  DIAMETROS_PLUVIAL,
  DIAS_MES,
  OCUPACION_BAJADA,
  PASO_CISTERNA,
  LLENADO_MAXIMO,
  MANNING_PVC,
  SUPERFICIES,
  VACIADO_MAXIMO,
  type Superficie,
} from "./tablas";

export interface EntradaPluvial {
  /** Áreas por tipo de superficie (m²). */
  areas: Record<Superficie, number>;
  /** Intensidad de lluvia de diseño (mm/h) y duración de la tormenta (min). */
  intensidad: number;
  duracion: number;
  /** Pendiente de la tubería (%). */
  pendiente: number;
  /** Pozos de absorción: sin tasa de infiltración no se calculan. */
  infiltracion?: number; // mm/h
  diametroPozo: number; // m
  profundidadPozo: number; // m
  /** Diámetro de las bajadas de azotea (mm); sin dato, 100 mm. */
  diametroBajada?: number;
  /** Captación de agua de lluvia; sin este dato no se calcula. */
  captacion?: EntradaCaptacion;
}

export interface EntradaCaptacion {
  /** Lluvia de cada mes, de enero a diciembre (mm). Si falta, se usa la anual. */
  lluviaMensual?: number[];
  /** Lluvia anual (mm), solo si no hay datos por mes. */
  lluviaAnual?: number;
  /** Área de techo que capta (m²). */
  area: number;
  /** Coeficiente de escurrimiento del techo. */
  coeficiente: number;
  /** Demanda de uso no potable (L/día). Personas y dotación solo se informan. */
  demandaDiaria: number;
  personas?: number;
  dotacion?: number;
  /** Cisterna que propone el usuario (m³); sin dato se usa la recomendada. */
  cisterna?: number;
}

/** Balance de un mes, en m³. */
export interface MesCaptacion {
  captacion: number;
  demanda: number;
  aprovechado: number;
  /** Agua en la cisterna al final del mes. */
  almacenamiento: number;
  /** Lo que falta y se toma de la red. */
  deficit: number;
  /** Lo que se tira porque la cisterna está llena. */
  derrame: number;
}

export interface ResultadoCaptacion {
  modo: "mensual" | "anual";
  /** m³/año */
  captacionAnual: number;
  demandaAnual: number;
  /** Captación anual entre demanda anual. */
  potencial: number;
  /** Solo con lluvia mensual. */
  meses?: MesCaptacion[];
  /** m³ */
  cisternaRecomendada?: number;
  cisterna?: number;
  aprovechadoAnual: number;
  /** Fracción de la demanda que se cubre con la cisterna (o con cisterna suficiente si solo hay lluvia anual). */
  cobertura: number;
  /** Cobertura con cisternas más chicas que la recomendada y con la recomendada (solo con lluvia mensual). */
  comparacion?: { cisterna: number; cobertura: number }[];
}

export interface ResultadoBajadas {
  area: number;
  /** L/s de la azotea */
  gasto: number;
  diametro: number;
  /** L/s de cada bajada */
  capacidad: number;
  porGasto: number;
  porArea: number;
  cantidad: number;
}

export interface ResultadoPluvial {
  areaEfectiva: number;
  /** L/s */
  gasto: number;
  tuberia: { diametro: number; capacidad: number; velocidad: number };
  /** m³ */
  volumen: number;
  pozos?: { almacenamiento: number; infiltracion: number; capacidad: number; cantidad: number; vaciado: number };
  /** Opcionales para que se sigan leyendo las memorias anteriores. */
  bajadas?: ResultadoBajadas;
  captacion?: ResultadoCaptacion;
  problemas: string[];
  advertencias: string[];
  cumple: boolean;
}

function revisar(valor: number, nombre: string, min = 0, max = Infinity) {
  if (!Number.isFinite(valor) || valor <= min) throw new RangeError(`${nombre} debe ser mayor que ${min}.`);
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

/** Capacidad a tubo lleno (L/s) y velocidad (m/s) con Manning. */
export function tuboLleno(diametroMm: number, pendiente: number, n = MANNING_PVC) {
  const d = diametroMm / 1000;
  const area = (Math.PI * d * d) / 4;
  const velocidad = (1 / n) * (d / 4) ** (2 / 3) * Math.sqrt(pendiente / 100);
  return { capacidad: velocidad * area * 1000, velocidad };
}

export function disenarPluvial(e: EntradaPluvial): ResultadoPluvial {
  for (const [k, a] of Object.entries(e.areas)) {
    if (!(k in SUPERFICIES) || !(a >= 0) || a > 100_000) throw new RangeError("Revisa las áreas.");
  }
  revisar(e.intensidad, "La intensidad de lluvia", 0, 500);
  revisar(e.duracion, "La duración de la tormenta", 0, 1440);
  revisar(e.pendiente, "La pendiente", 0, 20);
  const problemas: string[] = [];
  const advertencias: string[] = [];

  const areaEfectiva = (Object.keys(SUPERFICIES) as Superficie[]).reduce((s, k) => s + SUPERFICIES[k].c * e.areas[k], 0);
  if (!(areaEfectiva > 0)) throw new RangeError("Captura al menos un área.");
  const gasto = (areaEfectiva * e.intensidad) / 3600;

  const opciones = DIAMETROS_PLUVIAL.map((d) => ({ diametro: d, ...tuboLleno(d, e.pendiente) }));
  const tuberia = opciones.find((t) => LLENADO_MAXIMO * t.capacidad >= gasto) ?? opciones[opciones.length - 1];
  if (LLENADO_MAXIMO * tuberia.capacidad < gasto) problemas.push("el gasto pasa de lo que lleva un tubo de 450 mm");
  if (tuberia.velocidad < 0.6) advertencias.push("la velocidad a tubo lleno es menor de 0.6 m/s; puede azolvarse");

  const volumen = (gasto * e.duracion * 60) / 1000;

  let pozos: ResultadoPluvial["pozos"];
  if (e.infiltracion !== undefined) {
    revisar(e.infiltracion, "La tasa de infiltración", 0, 5000);
    revisar(e.diametroPozo, "El diámetro del pozo", 0.3, 5);
    revisar(e.profundidadPozo, "La profundidad útil del pozo", 0.5, 30);
    const fondo = (Math.PI * e.diametroPozo ** 2) / 4;
    const almacenamiento = fondo * e.profundidadPozo;
    const infiltracion = (e.infiltracion / 1000) * (Math.PI * e.diametroPozo * e.profundidadPozo + fondo); // m³/h
    const capacidad = almacenamiento + (infiltracion * e.duracion) / 60;
    const vaciado = almacenamiento / infiltracion;
    pozos = { almacenamiento, infiltracion, capacidad, cantidad: Math.ceil(volumen / capacidad - 1e-9), vaciado };
    if (vaciado > VACIADO_MAXIMO) problemas.push(`cada pozo tarda más de ${VACIADO_MAXIMO} h en vaciarse; el suelo infiltra poco`);
  }

  const bajadas = e.areas.azotea > 0 ? disenarBajadas(e.areas.azotea, e.intensidad, e.diametroBajada ?? 100) : undefined;

  let captacion: ResultadoCaptacion | undefined;
  if (e.captacion) {
    captacion = disenarCaptacion(e.captacion);
    if (captacion.modo === "anual")
      advertencias.push("para dimensionar la cisterna captura la lluvia de cada mes");
  }

  return {
    areaEfectiva,
    gasto,
    tuberia,
    volumen,
    pozos,
    bajadas,
    captacion,
    problemas,
    advertencias,
    cumple: problemas.length === 0,
  };
}

/** Capacidad de una bajada vertical (L/s) con Wyly-Eaton a la ocupación de diseño. */
export function capacidadBajada(diametroMm: number, ocupacion = OCUPACION_BAJADA) {
  const pulgadas = diametroMm / 25.4;
  const gpm = 27.8 * ocupacion ** (5 / 3) * pulgadas ** (8 / 3);
  return gpm * 0.0630902;
}

/**
 * Número de bajadas de la azotea: las que pide el gasto con la capacidad del
 * tubo y las que pide el área (una por cada 100 m²); manda la mayor.
 */
export function disenarBajadas(area: number, intensidad: number, diametro: number): ResultadoBajadas {
  if (!(DIAMETROS_BAJADA as readonly number[]).includes(diametro))
    throw new RangeError(`El diámetro de las bajadas debe ser ${DIAMETROS_BAJADA.join(", ")} mm.`);
  const gasto = (SUPERFICIES.azotea.c * area * intensidad) / 3600;
  const capacidad = capacidadBajada(diametro);
  const porGasto = Math.ceil(gasto / capacidad - 1e-9);
  const porArea = Math.ceil(area / AREA_MAXIMA_POR_BAJADA - 1e-9);
  return { area, gasto, diametro, capacidad, porGasto, porArea, cantidad: Math.max(1, porGasto, porArea) };
}

/** Recorre tres años iguales con la cisterna dada (Infinity: sin límite) y devuelve el último. */
function balance(captacion: number[], demanda: number[], cisterna: number): MesCaptacion[] {
  let s = 0;
  let meses: MesCaptacion[] = [];
  for (let ciclo = 0; ciclo < 3; ciclo++) {
    meses = captacion.map((q, i) => {
      let x = s + q - demanda[i];
      const deficit = Math.max(0, -x);
      x = Math.max(0, x);
      const derrame = Math.max(0, x - cisterna);
      s = Math.min(x, cisterna);
      return { captacion: q, demanda: demanda[i], aprovechado: demanda[i] - deficit, almacenamiento: s, deficit, derrame };
    });
  }
  return meses;
}

/**
 * Captación de agua de lluvia en el techo, con balance mes a mes.
 *
 * Cisterna recomendada: la más chica con la que se aprovecha todo lo que se
 * puede. Si la lluvia del año alcanza para la demanda, es el mayor déficit
 * acumulado de los meses secos (método del pico secuente); si no alcanza, es
 * el mayor volumen que llega a guardarse sin tirar agua, gastando la demanda
 * completa cada mes. Se redondea a 0.5 m³ y no baja de 1 m³.
 */
export function disenarCaptacion(c: EntradaCaptacion): ResultadoCaptacion {
  revisar(c.area, "El área de captación", 0, 100_000);
  revisar(c.coeficiente, "El coeficiente de escurrimiento del techo", 0, 1);
  revisar(c.demandaDiaria, "La demanda de agua de lluvia", 0, 1_000_000);
  if (c.cisterna !== undefined) revisar(c.cisterna, "La cisterna propuesta", 0, 100_000);
  const demandaAnual = (c.demandaDiaria * 365) / 1000;

  if (!c.lluviaMensual) {
    if (c.lluviaAnual === undefined) throw new RangeError("Captura la lluvia de los 12 meses o la lluvia anual.");
    revisar(c.lluviaAnual, "La lluvia anual", 0, 10_000);
    const captacionAnual = (c.lluviaAnual / 1000) * c.area * c.coeficiente;
    const potencial = captacionAnual / demandaAnual;
    return {
      modo: "anual",
      captacionAnual,
      demandaAnual,
      potencial,
      aprovechadoAnual: Math.min(captacionAnual, demandaAnual),
      cobertura: Math.min(1, potencial),
    };
  }

  if (c.lluviaMensual.length !== 12 || c.lluviaMensual.some((p) => !Number.isFinite(p) || p < 0 || p > 3000))
    throw new RangeError("Captura la lluvia de los 12 meses (0 a 3 000 mm cada uno).");
  const captacion = c.lluviaMensual.map((p) => (p / 1000) * c.area * c.coeficiente);
  const demanda = DIAS_MES.map((d) => (c.demandaDiaria * d) / 1000);
  const captacionAnual = captacion.reduce((a, b) => a + b, 0);
  if (!(captacionAnual > 0)) throw new RangeError("La lluvia de los 12 meses no puede ser cero.");

  let necesaria = 0;
  if (captacionAnual >= demandaAnual) {
    // Pico secuente: déficit acumulado K = máx(0, K + D − Q) en dos años; vale el mayor del segundo.
    let k = 0;
    for (let ciclo = 0; ciclo < 2; ciclo++)
      for (let i = 0; i < 12; i++) {
        k = Math.max(0, k + demanda[i] - captacion[i]);
        if (ciclo === 1) necesaria = Math.max(necesaria, k);
      }
  } else {
    necesaria = Math.max(...balance(captacion, demanda, Infinity).map((m) => m.almacenamiento));
  }
  const cisternaRecomendada = Math.max(CISTERNA_MINIMA, Math.ceil(necesaria / PASO_CISTERNA - 1e-9) * PASO_CISTERNA);
  const cisterna = c.cisterna ?? cisternaRecomendada;
  const meses = balance(captacion, demanda, cisterna);
  const aprovechadoAnual = meses.reduce((a, m) => a + m.aprovechado, 0);
  const cubre = (v: number) => balance(captacion, demanda, v).reduce((a, m) => a + m.aprovechado, 0) / demandaAnual;
  const comparacion = [...CISTERNAS_COMPARACION.filter((v) => v < cisternaRecomendada), cisternaRecomendada].map((v) => ({
    cisterna: v,
    cobertura: cubre(v),
  }));

  return {
    modo: "mensual",
    captacionAnual,
    demandaAnual,
    potencial: captacionAnual / demandaAnual,
    meses,
    cisternaRecomendada,
    cisterna,
    aprovechadoAnual,
    cobertura: aprovechadoAnual / demandaAnual,
    comparacion,
  };
}

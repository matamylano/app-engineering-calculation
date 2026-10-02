/**
 * Pozo de agua: interpretación de la prueba de bombeo con el método de
 * Cooper-Jacob, abatimiento con el gasto de diseño, ademe, longitud de
 * rejilla, bomba sumergible, energía y costo del bombeo y volumen de
 * extracción contra el concesionado.
 */
import { perdidaHazen } from "@/calc/hidrosanitaria/casa";
import {
  ADEMES,
  BOMBAS_HP,
  AVISO_CONCESION,
  C_COLUMNA,
  COLUMNAS,
  DIAS_ANO,
  EFICIENCIA_BOMBA,
  EFICIENCIA_MOTOR,
  FACTOR_ACCESORIOS,
  KW_POR_HP,
  VELOCIDAD_COLUMNA,
  VELOCIDAD_ENTRADA,
} from "./tablas";

export interface Lectura {
  /** Tiempo desde el arranque (min). */
  t: number;
  /** Abatimiento (m). */
  s: number;
}

export interface EntradaPozo {
  /** Gasto de la prueba (L/s). */
  gastoPrueba: number;
  lecturas: Lectura[];
  /** Usa las lecturas desde este tiempo (min) para la recta de Cooper-Jacob. */
  desde: number;
  /** Distancia del pozo de observación (m); sin él, las lecturas son del pozo bombeado. */
  radioObservacion?: number;
  nivelEstatico: number;
  profundidad: number;
  /** Gasto de diseño (L/s) y horas de bombeo continuo. */
  gastoDiseno: number;
  horasBombeo: number;
  /** Sumergencia de la bomba bajo el nivel dinámico (m). */
  sumergencia: number;
  /** Tubo de la descarga del pozo al tanque (m) y carga en la descarga (m). */
  longitudDescarga: number;
  cargaDescarga: number;
  /** Área abierta de la rejilla (fracción). */
  aberturaRejilla: number;
  /** Horas de operación al día; sin dato, las de bombeo continuo hasta 24. */
  horasDia?: number;
  /** Días de operación al año; sin dato, 365. */
  diasAno?: number;
  /** Eficiencia del motor (fracción); sin dato, EFICIENCIA_MOTOR. */
  eficienciaMotor?: number;
  /** Tarifa eléctrica ($/kWh); sin dato, no se calcula el costo. */
  tarifa?: number;
  /** Volumen concesionado en el título de CONAGUA (m³/año). */
  volumenConcesionado?: number;
}

export interface EnergiaPozo {
  horasDia: number;
  diasAno: number;
  eficienciaMotor: number;
  /** Potencia eléctrica con la bomba a su potencia de placa (kW). */
  kw: number;
  kwhDia: number;
  kwhMes: number;
  kwhAno: number;
  kwhM3: number;
  /** Solo con tarifa ($/kWh). */
  tarifa?: number;
  costoMes?: number;
  costoAno?: number;
  costoM3?: number;
}

export interface ExtraccionPozo {
  /** m³ */
  diario: number;
  mensual: number;
  anual: number;
  concesionado?: number;
  /** anual / concesionado */
  uso?: number;
}

export interface ResultadoPozo {
  recta: { pendiente: number; ordenada: number; puntos: number };
  /** Transmisividad (m²/día). */
  transmisividad: number;
  /** Coeficiente de almacenamiento, solo con pozo de observación. */
  almacenamiento?: number;
  /** Capacidad específica de la prueba (L/s/m). */
  capacidadEspecifica: number;
  abatimientoDiseno: number;
  nivelDinamico: number;
  colocacion: number;
  ademe: number;
  rejilla: { diametro: number; longitudMinima: number };
  columna: { nominal: string; velocidad: number; perdida: number };
  carga: number;
  potencia: number;
  potenciaComercial: number;
  /** Faltan en memorias anteriores. */
  energia: EnergiaPozo;
  extraccion: ExtraccionPozo;
  problemas: string[];
  advertencias: string[];
  cumple: boolean;
}

function revisar(valor: number, nombre: string, min = 0, max = Infinity) {
  if (!Number.isFinite(valor) || valor <= min) throw new RangeError(`${nombre} debe ser mayor que ${min}.`);
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

/** Recta s = a + b log10 t por mínimos cuadrados. */
export function rectaSemilog(lecturas: Lectura[]) {
  const n = lecturas.length;
  const xs = lecturas.map((l) => Math.log10(l.t));
  const ys = lecturas.map((l) => l.s);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const sxy = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  const pendiente = sxy / sxx;
  return { pendiente, ordenada: my - pendiente * mx, puntos: n };
}

export function disenarPozo(e: EntradaPozo): ResultadoPozo {
  revisar(e.gastoPrueba, "El gasto de la prueba", 0, 500);
  revisar(e.gastoDiseno, "El gasto de diseño", 0, 500);
  revisar(e.nivelEstatico, "El nivel estático", 0, 1000);
  revisar(e.profundidad, "La profundidad del pozo", 0, 2000);
  if (e.profundidad <= e.nivelEstatico) throw new RangeError("El pozo debe ser más profundo que el nivel estático.");
  revisar(e.horasBombeo, "Las horas de bombeo", 0, 24 * 365);
  revisar(e.sumergencia, "La sumergencia", 0, 50);
  revisar(e.longitudDescarga, "La longitud de la descarga", -1e-9, 5000);
  if (!(e.cargaDescarga >= 0)) throw new RangeError("La carga en la descarga no puede ser negativa.");
  revisar(e.aberturaRejilla, "El área abierta de la rejilla", 0, 0.6);
  if (e.radioObservacion !== undefined) revisar(e.radioObservacion, "La distancia al pozo de observación", 0, 5000);
  if (e.horasDia !== undefined) revisar(e.horasDia, "Las horas de bombeo al día", 0, 24);
  if (e.diasAno !== undefined) revisar(e.diasAno, "Los días de bombeo al año", 0, 366);
  if (e.eficienciaMotor !== undefined) revisar(e.eficienciaMotor, "La eficiencia del motor", 0.3, 1);
  if (e.tarifa !== undefined && !(e.tarifa >= 0 && e.tarifa <= 100))
    throw new RangeError("La tarifa eléctrica debe estar entre 0 y 100 $/kWh.");
  if (e.volumenConcesionado !== undefined) revisar(e.volumenConcesionado, "El volumen concesionado", 0, 1e9);
  if (e.lecturas.some((l) => !(l.t > 0) || !(l.s >= 0) || !Number.isFinite(l.t) || !Number.isFinite(l.s)))
    throw new RangeError("Cada lectura necesita un tiempo mayor que 0 y un abatimiento.");

  const usadas = e.lecturas.filter((l) => l.t >= e.desde);
  if (usadas.length < 3) throw new RangeError("Se necesitan al menos 3 lecturas en el tramo recto.");
  const recta = rectaSemilog(usadas);
  if (!(recta.pendiente > 0)) throw new RangeError("Las lecturas no muestran abatimiento creciente.");

  const problemas: string[] = [];
  const advertencias: string[] = [];

  // Cooper-Jacob: T = 2.3 Q / (4 π Δs), S = 2.25 T t0 / r².
  const qDia = (e.gastoPrueba / 1000) * 86400; // m³/día
  const transmisividad = (2.3 * qDia) / (4 * Math.PI * recta.pendiente);
  const t0 = 10 ** (-recta.ordenada / recta.pendiente) / 1440; // días
  const almacenamiento =
    e.radioObservacion !== undefined ? (2.25 * transmisividad * t0) / e.radioObservacion ** 2 : undefined;

  const ultima = e.lecturas.reduce((a, b) => (b.t > a.t ? b : a));
  const capacidadEspecifica = e.gastoPrueba / ultima.s;

  // Abatimiento con el gasto de diseño: se prolonga la recta y se escala con el gasto.
  const minutos = e.horasBombeo * 60;
  const abatimientoPrueba = ultima.s + recta.pendiente * Math.log10(Math.max(minutos, ultima.t) / ultima.t);
  const abatimientoDiseno = (e.gastoDiseno / e.gastoPrueba) * abatimientoPrueba;
  if (e.gastoDiseno > 1.2 * e.gastoPrueba)
    advertencias.push("el gasto de diseño pasa en más de 20 % al de la prueba; el abatimiento real puede ser mayor");
  const nivelDinamico = e.nivelEstatico + abatimientoDiseno;
  const colocacion = Math.ceil(nivelDinamico + e.sumergencia);
  if (colocacion >= e.profundidad) problemas.push("la bomba quedaría en el fondo del pozo; baja el gasto de diseño");

  const ademe = ADEMES.find((a) => e.gastoDiseno <= a.hasta)?.pulgadas;
  if (!ademe) problemas.push("el gasto pasa de lo que cubre la tabla de ademes");
  const diametro = ((ademe ?? 14) * 2.54) / 100; // m
  const longitudMinima = e.gastoDiseno / 1000 / (Math.PI * diametro * e.aberturaRejilla * VELOCIDAD_ENTRADA);

  // Columna y descarga.
  const longitud = (colocacion + e.longitudDescarga) * (1 + FACTOR_ACCESORIOS);
  const tramos = COLUMNAS.map((c) => ({
    nominal: c.nominal,
    velocidad: e.gastoDiseno / 1000 / ((Math.PI * (c.interior / 1000) ** 2) / 4),
    perdida: perdidaHazen(e.gastoDiseno, c.interior, longitud, C_COLUMNA),
  }));
  const columna = tramos.find((t) => t.velocidad <= VELOCIDAD_COLUMNA) ?? tramos[tramos.length - 1];
  if (columna.velocidad > VELOCIDAD_COLUMNA) problemas.push("el gasto pasa de lo que lleva una columna de 6 pulgadas");

  const carga = nivelDinamico + columna.perdida + e.cargaDescarga;
  const potencia = (e.gastoDiseno * carga) / (76 * EFICIENCIA_BOMBA);
  const potenciaComercial = BOMBAS_HP.find((p) => p >= potencia) ?? Infinity;
  if (!Number.isFinite(potenciaComercial)) problemas.push("la bomba pasa de 100 HP; revisa los datos");

  const { energia, extraccion } = energiaYExtraccion(e, Number.isFinite(potenciaComercial) ? potenciaComercial : potencia);
  if (extraccion.uso !== undefined) {
    const texto = `la extracción de ${Math.round(extraccion.anual).toLocaleString("es-MX")} m³/año`;
    const titulo = `${Math.round(extraccion.concesionado!).toLocaleString("es-MX")} m³/año del título de concesión`;
    if (extraccion.uso > 1) problemas.push(`${texto} pasa de los ${titulo}; baja el gasto, las horas o los días de bombeo`);
    else if (extraccion.uso > AVISO_CONCESION)
      advertencias.push(`${texto} usa más del ${Math.round(AVISO_CONCESION * 100)} % de los ${titulo}`);
  }

  return {
    recta,
    transmisividad,
    almacenamiento,
    capacidadEspecifica,
    abatimientoDiseno,
    nivelDinamico,
    colocacion,
    ademe: ademe ?? 0,
    rejilla: { diametro: ademe ?? 0, longitudMinima },
    columna,
    carga,
    potencia,
    potenciaComercial,
    energia,
    extraccion,
    problemas,
    advertencias,
    cumple: problemas.length === 0,
  };
}

/**
 * Energía y costo del bombeo y volumen extraído. La potencia eléctrica toma
 * la bomba a su potencia de placa entre la eficiencia del motor (conservador:
 * el motor rara vez trabaja a plena carga).
 */
export function energiaYExtraccion(e: EntradaPozo, hp: number): { energia: EnergiaPozo; extraccion: ExtraccionPozo } {
  const horasDia = e.horasDia ?? Math.min(e.horasBombeo, 24);
  const diasAno = e.diasAno ?? DIAS_ANO;
  const eficienciaMotor = e.eficienciaMotor ?? EFICIENCIA_MOTOR;
  const kw = (hp * KW_POR_HP) / eficienciaMotor;
  const kwhDia = kw * horasDia;
  const kwhAno = kwhDia * diasAno;
  const diario = (e.gastoDiseno / 1000) * 3600 * horasDia; // m³
  const anual = diario * diasAno;
  const kwhM3 = kwhDia / diario;
  const energia: EnergiaPozo = { horasDia, diasAno, eficienciaMotor, kw, kwhDia, kwhMes: kwhAno / 12, kwhAno, kwhM3 };
  if (e.tarifa !== undefined) {
    energia.tarifa = e.tarifa;
    energia.costoMes = (kwhAno / 12) * e.tarifa;
    energia.costoAno = kwhAno * e.tarifa;
    energia.costoM3 = kwhM3 * e.tarifa;
  }
  const extraccion: ExtraccionPozo = { diario, mensual: anual / 12, anual };
  if (e.volumenConcesionado !== undefined) {
    extraccion.concesionado = e.volumenConcesionado;
    extraccion.uso = anual / e.volumenConcesionado;
  }
  return { energia, extraccion };
}

/**
 * Curva del sistema: carga que pide el pozo para un gasto q (L/s). El
 * abatimiento crece en proporción al gasto (como en el diseño) y la pérdida
 * en la columna, con Hazen-Williams; la bomba queda donde se diseñó.
 */
export function cargaSistema(e: EntradaPozo, r: ResultadoPozo, q: number): number {
  const interior = COLUMNAS.find((c) => c.nominal === r.columna.nominal)?.interior ?? COLUMNAS[COLUMNAS.length - 1].interior;
  const longitud = (r.colocacion + e.longitudDescarga) * (1 + FACTOR_ACCESORIOS);
  const abatimiento = (r.abatimientoDiseno * q) / e.gastoDiseno;
  return e.nivelEstatico + abatimiento + (q > 0 ? perdidaHazen(q, interior, longitud, C_COLUMNA) : 0) + e.cargaDescarga;
}

/**
 * Instalación hidráulica y sanitaria de una casa: demanda, cisterna y
 * tinaco, gasto probable por Hunter, diámetro de la alimentación desde el
 * tinaco, bomba de la cisterna al tinaco y diámetros de desagüe.
 */
import {
  ALBANAL_MINIMO,
  BOMBAS_HP,
  C_HAZEN,
  CISTERNAS,
  DISTANCIA_REGISTROS,
  EFICIENCIA_BOMBA,
  FACTOR_ACCESORIOS,
  HUNTER_TANQUE,
  LPS_POR_GPM,
  MUEBLES,
  PENDIENTE_MINIMA,
  PRESION_MINIMA,
  TINACOS,
  TUBOS,
  UD_COLECTOR_100,
  VELOCIDAD_MAXIMA,
  type Mueble,
} from "./tablas";

export interface EntradaCasa {
  habitantes: number;
  /** L/hab/día */
  dotacion: number;
  diasCisterna: number;
  diasTinaco: number;
  muebles: Record<Mueble, number>;
  /** Desnivel del fondo del tinaco a la salida más alta (m). */
  alturaTinaco: number;
  /** Tubo del tinaco a la salida más lejana (m). */
  longitudTinaco: number;
  /** Desnivel del agua en la cisterna a la entrada del tinaco (m). */
  alturaBombeo: number;
  /** Tubo de la bomba al tinaco (m). */
  longitudBombeo: number;
  /** Tiempo para llenar el tinaco (min). */
  tiempoLlenado: number;
}

export interface Tramo {
  nominal: string;
  mm: number;
  /** m/s */
  velocidad: number;
  /** Pérdida por fricción con accesorios (m). */
  perdida: number;
}

export interface ResultadoCasa {
  demandaDiaria: number;
  cisterna: { requerido: number; comercial: number; piezas: number };
  tinaco: { requerido: number; comercial: number; piezas: number };
  unidadesMueble: number;
  /** L/s */
  gastoProbable: number;
  alimentacion: Tramo & { presionDisponible: number };
  bomba: Tramo & { gasto: number; carga: number; potencia: number; potenciaComercial: number };
  drenaje: {
    unidadesDescarga: number;
    ramales: { mueble: Mueble; cantidad: number; diametro: number }[];
    colector: number;
    albanal: number;
    pendiente: number;
    distanciaRegistros: number;
  };
  problemas: string[];
  cumple: boolean;
}

function revisar(valor: number, nombre: string, min = 0, max = Infinity) {
  if (!Number.isFinite(valor) || valor <= min) throw new RangeError(`${nombre} debe ser mayor que ${min}.`);
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

/** Gasto probable (L/s) por interpolación lineal en la curva de Hunter. */
export function gastoHunter(um: number): number {
  if (um <= 0) return 0;
  const t = HUNTER_TANQUE;
  if (um > t[t.length - 1][0]) throw new RangeError("Más de 100 unidades mueble: fuera del alcance de una casa.");
  if (um <= t[0][0]) return t[0][1] * LPS_POR_GPM;
  const i = t.findIndex(([u]) => u >= um);
  const [u0, g0] = t[i - 1];
  const [u1, g1] = t[i];
  return (g0 + ((g1 - g0) * (um - u0)) / (u1 - u0)) * LPS_POR_GPM;
}

/** Pérdida por fricción de Hazen-Williams (m). Q en L/s, D en mm, L en m. */
export function perdidaHazen(q: number, d: number, l: number, c = C_HAZEN) {
  return (10.67 * l * (q / 1000) ** 1.852) / (c ** 1.852 * (d / 1000) ** 4.8704);
}

const velocidad = (q: number, d: number) => q / 1000 / ((Math.PI * (d / 1000) ** 2) / 4);

function comercial(requerido: number, tamanos: number[]) {
  const uno = tamanos.find((t) => t >= requerido);
  if (uno) return { requerido, comercial: uno, piezas: 1 };
  const mayor = tamanos[tamanos.length - 1];
  return { requerido, comercial: mayor, piezas: Math.ceil(requerido / mayor) };
}

export function disenarCasa(e: EntradaCasa): ResultadoCasa {
  revisar(e.habitantes, "El número de habitantes", 0, 50);
  revisar(e.dotacion, "La dotación", 0, 1000);
  revisar(e.diasCisterna, "Los días de cisterna", 0, 10);
  revisar(e.diasTinaco, "Los días de tinaco", 0, 5);
  revisar(e.alturaTinaco, "La altura del tinaco", 0, 30);
  revisar(e.longitudTinaco, "La longitud de la alimentación", 0, 200);
  revisar(e.alturaBombeo, "La altura de bombeo", 0, 50);
  revisar(e.longitudBombeo, "La longitud de bombeo", 0, 200);
  revisar(e.tiempoLlenado, "El tiempo de llenado", 0, 240);
  for (const [m, n] of Object.entries(e.muebles)) {
    if (!(m in MUEBLES) || !Number.isInteger(n) || n < 0 || n > 20) throw new RangeError("Revisa la cantidad de muebles.");
  }
  const problemas: string[] = [];

  const demandaDiaria = e.habitantes * e.dotacion;
  const cisterna = comercial(demandaDiaria * e.diasCisterna, CISTERNAS);
  const tinaco = comercial(demandaDiaria * e.diasTinaco, TINACOS);

  const lista = (Object.keys(MUEBLES) as Mueble[]).filter((m) => e.muebles[m] > 0);
  if (!lista.length) throw new RangeError("Agrega al menos un mueble.");
  const unidadesMueble = lista.reduce((s, m) => s + e.muebles[m] * MUEBLES[m].um, 0);
  const gastoProbable = gastoHunter(unidadesMueble);

  // Alimentación desde el tinaco: el menor tubo con velocidad admisible y presión suficiente.
  const tramo = (q: number, l: number, d: (typeof TUBOS)[number]): Tramo => ({
    nominal: d.nominal,
    mm: d.mm,
    velocidad: velocidad(q, d.interior),
    perdida: perdidaHazen(q, d.interior, l * (1 + FACTOR_ACCESORIOS)),
  });
  const opciones = TUBOS.map((d) => tramo(gastoProbable, e.longitudTinaco, d));
  const elegida =
    opciones.find((t) => t.velocidad <= VELOCIDAD_MAXIMA && e.alturaTinaco - t.perdida >= PRESION_MINIMA) ??
    opciones[opciones.length - 1];
  const alimentacion = { ...elegida, presionDisponible: e.alturaTinaco - elegida.perdida };
  if (alimentacion.presionDisponible < PRESION_MINIMA)
    problemas.push("el tinaco no da presión suficiente; súbelo o usa una bomba presurizadora");

  // Bomba de la cisterna al tinaco.
  const gastoBomba = (tinaco.comercial * tinaco.piezas) / (e.tiempoLlenado * 60); // L/s
  const tuboBomba =
    TUBOS.map((d) => tramo(gastoBomba, e.longitudBombeo, d)).find((t) => t.velocidad <= VELOCIDAD_MAXIMA) ??
    tramo(gastoBomba, e.longitudBombeo, TUBOS[TUBOS.length - 1]);
  if (tuboBomba.velocidad > VELOCIDAD_MAXIMA) problemas.push("el gasto de bombeo es muy alto; da más tiempo de llenado");
  const carga = e.alturaBombeo + tuboBomba.perdida + PRESION_MINIMA;
  const potencia = (1000 * (gastoBomba / 1000) * carga) / (76 * EFICIENCIA_BOMBA);
  const potenciaComercial = BOMBAS_HP.find((p) => p >= potencia) ?? Infinity;
  if (!Number.isFinite(potenciaComercial)) problemas.push("la bomba pasa de 3 HP; revisa los datos");

  // Drenaje.
  const unidadesDescarga = lista.reduce((s, m) => s + e.muebles[m] * MUEBLES[m].ud, 0);
  if (unidadesDescarga > UD_COLECTOR_100) problemas.push("las descargas pasan de lo que lleva un colector de 100 mm");

  return {
    demandaDiaria,
    cisterna,
    tinaco,
    unidadesMueble,
    gastoProbable,
    alimentacion,
    bomba: { ...tuboBomba, gasto: gastoBomba, carga, potencia, potenciaComercial },
    drenaje: {
      unidadesDescarga,
      ramales: lista.map((m) => ({ mueble: m, cantidad: e.muebles[m], diametro: MUEBLES[m].desague })),
      colector: 100,
      albanal: ALBANAL_MINIMO,
      pendiente: PENDIENTE_MINIMA,
      distanciaRegistros: DISTANCIA_REGISTROS,
    },
    problemas,
    cumple: problemas.length === 0,
  };
}

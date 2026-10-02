/**
 * Instalación hidráulica y sanitaria de una casa: demanda, cisterna y
 * tinaco, gasto probable por Hunter, diámetro de la alimentación desde el
 * tinaco, bomba de la cisterna al tinaco, diámetros de desagüe, calentador
 * de agua y lista de equipos y piezas para cotizar.
 */
import {
  ALBANAL_MINIMO,
  BOMBAS_HP,
  C_HAZEN,
  CALENTADORES,
  CALENTADORES_DEPOSITO,
  CALENTADORES_PASO,
  CISTERNAS,
  CONSUMO_CALIENTE,
  DELTA_T_PASO,
  DISTANCIA_REGISTROS,
  DURACION_BANO,
  EFICIENCIA_BOMBA,
  FACTOR_ACCESORIOS,
  FRACCION_HORA_PICO,
  FRACCION_UTIL_DEPOSITO,
  GASTO_REGADERA,
  HUNTER_TANQUE,
  LITROS_POR_M2_PLANO,
  LITROS_POR_TUBO,
  LPS_POR_GPM,
  MUEBLES,
  PENDIENTE_MINIMA,
  PRESION_MINIMA,
  REGADERAS_SIMULTANEAS,
  REGISTRO_SOMERO,
  RESERVA_CISTERNA_MAXIMA,
  TEMPERATURA_DEPOSITO,
  TEMPERATURA_FRIA,
  TEMPERATURA_USO,
  TERMOTANQUES_SOLARES,
  TINACOS,
  TUBOS,
  UD_COLECTOR_100,
  VELOCIDAD_MAXIMA,
  type Mueble,
  type TipoCalentador,
} from "./tablas";

export interface EntradaCasa {
  habitantes: number;
  /** L/hab/día */
  dotacion: number;
  diasCisterna: number;
  diasTinaco: number;
  /** Piezas por mueble; los que faltan cuentan como cero (memorias anteriores). */
  muebles: Partial<Record<Mueble, number>>;
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
  /** Calentador de agua; sin dato, ninguno. */
  calentador?: TipoCalentador;
  /** Regaderas en uso a la vez; sin dato, las de la casa hasta 2. */
  regaderasSimultaneas?: number;
  /** Consumo de agua caliente (L/persona/día); sin dato, CONSUMO_CALIENTE. */
  consumoCaliente?: number;
  /** Temperatura del agua fría (°C); sin dato, TEMPERATURA_FRIA. */
  temperaturaFria?: number;
  /** Longitud del drenaje de la casa a la red (m), para contar registros. */
  longitudDrenaje?: number;
}

export interface ResultadoCalentador {
  tipo: Exclude<TipoCalentador, "ninguno">;
  temperaturaFria: number;
  /** L/persona/día */
  consumoPersona: number;
  /** Agua caliente al día de toda la casa (L, a la temperatura de uso). */
  demandaDiaria: number;
  regaderas: number;
  /** De paso: L/min a ΔT = 25 °C; depósito y solar: L. */
  requerido: number;
  unidad: "L/min" | "L";
  comercial: number;
  piezas: number;
  /** Solo solar: tubos al vacío y, como alternativa, área de colector plano (m²). */
  tubos?: number;
  areaColector?: number;
}

/** Renglón de la lista de equipos y piezas; cantidad null = se cuantifica con los planos. */
export interface PartidaCasa {
  grupo: string;
  concepto: string;
  especificacion: string;
  cantidad: number | null;
  unidad: string;
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
  /** null sin calentador. Falta en memorias anteriores. */
  calentador: ResultadoCalentador | null;
  /** Equipos y piezas principales para cotizar. Falta en memorias anteriores. */
  materiales: PartidaCasa[];
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

const cuantas = (requerido: number, tamanos: number[]) => {
  const c = comercial(requerido, tamanos);
  return { comercial: c.comercial, piezas: c.piezas };
};

/**
 * Calentador de agua.
 * - De paso: gasto de las regaderas a la vez, llevado a la capacidad
 *   comercial (L/min con 25 °C de aumento): Q·(T uso − T fría)/25.
 * - De depósito: el mayor de la hora pico (regaderas · gasto · duración) y la
 *   tercera parte del consumo diario, convertido a agua de 60 °C y dividido
 *   entre la fracción útil del depósito.
 * - Solar: el consumo diario completo; tubos y área del colector según el
 *   termotanque comercial.
 */
export function disenarCalentador(e: EntradaCasa): ResultadoCalentador | null {
  const tipo = e.calentador ?? "ninguno";
  if (tipo === "ninguno") return null;
  if (!(tipo in CALENTADORES)) throw new RangeError("Revisa el tipo de calentador.");
  const temperaturaFria = e.temperaturaFria ?? TEMPERATURA_FRIA;
  const consumoPersona = e.consumoCaliente ?? CONSUMO_CALIENTE;
  if (!Number.isFinite(temperaturaFria) || temperaturaFria < 0 || temperaturaFria > TEMPERATURA_USO - 5)
    throw new RangeError(`La temperatura del agua fría debe estar entre 0 y ${TEMPERATURA_USO - 5} °C.`);
  revisar(consumoPersona, "El consumo de agua caliente", 0, 300);
  const enCasa = e.muebles.regadera ?? 0;
  const regaderas = e.regaderasSimultaneas ?? Math.max(1, Math.min(enCasa, REGADERAS_SIMULTANEAS));
  if (!Number.isInteger(regaderas) || regaderas < 1 || regaderas > 10)
    throw new RangeError("Las regaderas a la vez deben ser un entero de 1 a 10.");
  const demandaDiaria = e.habitantes * consumoPersona;
  const base = { tipo, temperaturaFria, consumoPersona, demandaDiaria, regaderas };

  if (tipo === "paso") {
    const requerido = (regaderas * GASTO_REGADERA * (TEMPERATURA_USO - temperaturaFria)) / DELTA_T_PASO;
    return { ...base, requerido, unidad: "L/min", ...cuantas(requerido, CALENTADORES_PASO) };
  }
  if (tipo === "deposito") {
    const pico = Math.max(regaderas * GASTO_REGADERA * DURACION_BANO, demandaDiaria * FRACCION_HORA_PICO);
    const fraccion = (TEMPERATURA_USO - temperaturaFria) / (TEMPERATURA_DEPOSITO - temperaturaFria);
    const requerido = (pico * fraccion) / FRACCION_UTIL_DEPOSITO;
    return { ...base, requerido, unidad: "L", ...cuantas(requerido, CALENTADORES_DEPOSITO) };
  }
  const c = cuantas(demandaDiaria, TERMOTANQUES_SOLARES);
  const litros = c.comercial * c.piezas;
  return {
    ...base,
    requerido: demandaDiaria,
    unidad: "L",
    ...c,
    tubos: Math.ceil(litros / LITROS_POR_TUBO),
    areaColector: litros / LITROS_POR_M2_PLANO,
  };
}

/** Lista de equipos y piezas principales, sin metros de tubo (esos salen de los planos). */
export function listaMateriales(e: EntradaCasa, r: Omit<ResultadoCasa, "materiales" | "problemas" | "cumple">): PartidaCasa[] {
  const capacidad = (x: { comercial: number }) => `${x.comercial.toLocaleString("es-MX")} L`;
  const lista: PartidaCasa[] = [
    { grupo: "Almacenamiento y bombeo", concepto: "Cisterna", especificacion: capacidad(r.cisterna), cantidad: r.cisterna.piezas, unidad: "pza" },
    { grupo: "Almacenamiento y bombeo", concepto: "Tinaco", especificacion: capacidad(r.tinaco), cantidad: r.tinaco.piezas, unidad: "pza" },
  ];
  if (Number.isFinite(r.bomba.potenciaComercial)) {
    lista.push(
      {
        grupo: "Almacenamiento y bombeo",
        concepto: "Bomba de la cisterna al tinaco",
        especificacion: `${r.bomba.potenciaComercial} HP, ${r.bomba.gasto.toFixed(2)} L/s contra ${r.bomba.carga.toFixed(1)} m; tubo de ${r.bomba.nominal}`,
        cantidad: 1,
        unidad: "pza",
      },
      {
        grupo: "Almacenamiento y bombeo",
        concepto: "Válvula de pie (pichancha) y válvula check",
        especificacion: r.bomba.nominal,
        cantidad: 1,
        unidad: "jgo",
      },
      {
        grupo: "Almacenamiento y bombeo",
        concepto: "Control de nivel (arranque y paro de la bomba)",
        especificacion: "Electronivel o flotador eléctrico en cisterna y tinaco",
        cantidad: 1,
        unidad: "jgo",
      },
    );
  }
  const c = r.calentador;
  if (c) {
    const piezas = c.piezas > 1 ? ` (${c.piezas} piezas)` : "";
    const especificacion =
      c.tipo === "paso"
        ? `${c.comercial} L/min${piezas}`
        : c.tipo === "deposito"
          ? `${c.comercial} L${piezas}`
          : `Termotanque de ${c.comercial} L${piezas} con ${c.tubos} tubos al vacío (o ${c.areaColector?.toFixed(1)} m² de colector plano)`;
    lista.push({ grupo: "Calentador", concepto: `Calentador ${CALENTADORES[c.tipo].toLowerCase()}`, especificacion, cantidad: c.piezas, unidad: "pza" });
  }
  const muebles = (Object.keys(MUEBLES) as Mueble[]).filter((m) => (e.muebles[m] ?? 0) > 0);
  for (const m of muebles)
    lista.push({ grupo: "Muebles", concepto: MUEBLES[m].nombre, especificacion: "—", cantidad: e.muebles[m] ?? 0, unidad: "pza" });

  const salidas = muebles.reduce((s, m) => s + (e.muebles[m] ?? 0), 0);
  const calientes = c ? muebles.filter((m) => MUEBLES[m].caliente).reduce((s, m) => s + (e.muebles[m] ?? 0), 0) : 0;
  lista.push(
    { grupo: "Tubería de agua", concepto: "Alimentación general desde el tinaco", especificacion: `Cobre tipo M ${r.alimentacion.nominal}`, cantidad: null, unidad: "m" },
    { grupo: "Tubería de agua", concepto: "Línea de bombeo", especificacion: `Cobre tipo M ${r.bomba.nominal}`, cantidad: null, unidad: "m" },
    { grupo: "Tubería de agua", concepto: "Salidas de agua fría", especificacion: 'Cobre ½", con llave de paso', cantidad: salidas, unidad: "salida" },
  );
  if (calientes > 0)
    lista.push({ grupo: "Tubería de agua", concepto: "Salidas de agua caliente", especificacion: 'Cobre ½"', cantidad: calientes, unidad: "salida" });

  // Salidas sanitarias agrupadas por diámetro.
  const porDiametro = new Map<number, number>();
  for (const m of muebles) {
    const d = MUEBLES[m].desague;
    if (d > 0) porDiametro.set(d, (porDiametro.get(d) ?? 0) + (e.muebles[m] ?? 0));
  }
  for (const [d, n] of [...porDiametro].sort((a, b) => b[0] - a[0]))
    lista.push({ grupo: "Drenaje", concepto: `Salidas sanitarias de ${d} mm`, especificacion: "PVC sanitario, con su céspol", cantidad: n, unidad: "salida" });
  lista.push(
    { grupo: "Drenaje", concepto: "Colector interior", especificacion: `PVC sanitario ${r.drenaje.colector} mm`, cantidad: null, unidad: "m" },
    { grupo: "Drenaje", concepto: "Albañal a la red municipal", especificacion: `${r.drenaje.albanal} mm al ${r.drenaje.pendiente} %`, cantidad: null, unidad: "m" },
    {
      grupo: "Drenaje",
      concepto: "Registros",
      especificacion: `${REGISTRO_SOMERO} hasta 1 m de profundidad; a cada ${r.drenaje.distanciaRegistros} m y en cada cambio de dirección`,
      // Uno en cada extremo y uno a cada 10 m; los cambios de dirección se agregan con los planos.
      cantidad: e.longitudDrenaje ? Math.ceil(e.longitudDrenaje / r.drenaje.distanciaRegistros) + 1 : null,
      unidad: "pza",
    },
  );
  return lista;
}

export function disenarCasa(e: EntradaCasa): ResultadoCasa {
  revisar(e.habitantes, "El número de habitantes", 0, 50);
  revisar(e.dotacion, "La dotación", 0, 1000);
  revisar(e.diasCisterna, "Los días de cisterna", 0, RESERVA_CISTERNA_MAXIMA);
  revisar(e.diasTinaco, "Los días de tinaco", 0, 5);
  revisar(e.alturaTinaco, "La altura del tinaco", 0, 30);
  revisar(e.longitudTinaco, "La longitud de la alimentación", 0, 200);
  revisar(e.alturaBombeo, "La altura de bombeo", 0, 50);
  revisar(e.longitudBombeo, "La longitud de bombeo", 0, 200);
  revisar(e.tiempoLlenado, "El tiempo de llenado", 0, 240);
  if (e.longitudDrenaje !== undefined) revisar(e.longitudDrenaje, "La longitud del drenaje", 0, 500);
  for (const [m, n] of Object.entries(e.muebles)) {
    if (!(m in MUEBLES) || !Number.isInteger(n) || n < 0 || n > 20) throw new RangeError("Revisa la cantidad de muebles.");
  }
  const problemas: string[] = [];

  const demandaDiaria = e.habitantes * e.dotacion;
  const cisterna = comercial(demandaDiaria * e.diasCisterna, CISTERNAS);
  const tinaco = comercial(demandaDiaria * e.diasTinaco, TINACOS);

  const cantidad = (m: Mueble) => e.muebles[m] ?? 0;
  const lista = (Object.keys(MUEBLES) as Mueble[]).filter((m) => cantidad(m) > 0);
  if (!lista.length) throw new RangeError("Agrega al menos un mueble.");
  const unidadesMueble = lista.reduce((s, m) => s + cantidad(m) * MUEBLES[m].um, 0);
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
  const unidadesDescarga = lista.reduce((s, m) => s + cantidad(m) * MUEBLES[m].ud, 0);
  if (unidadesDescarga > UD_COLECTOR_100) problemas.push("las descargas pasan de lo que lleva un colector de 100 mm");

  const calentador = disenarCalentador(e);

  const parcial = {
    demandaDiaria,
    cisterna,
    tinaco,
    unidadesMueble,
    gastoProbable,
    alimentacion,
    bomba: { ...tuboBomba, gasto: gastoBomba, carga, potencia, potenciaComercial },
    drenaje: {
      unidadesDescarga,
      // Todos los muebles (la memoria lista sus UM aquí); diámetro 0 = sin desagüe.
      ramales: lista.map((m) => ({ mueble: m, cantidad: cantidad(m), diametro: MUEBLES[m].desague })),
      colector: 100,
      albanal: ALBANAL_MINIMO,
      pendiente: PENDIENTE_MINIMA,
      distanciaRegistros: DISTANCIA_REGISTROS,
    },
    calentador,
  };
  return { ...parcial, materiales: listaMateriales(e, parcial), problemas, cumple: problemas.length === 0 };
}

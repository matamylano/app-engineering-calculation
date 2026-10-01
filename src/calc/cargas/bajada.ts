/**
 * Bajada de cargas de una casa o edificio pequeño de concreto y mampostería.
 *
 * Unidades de obra en todo el módulo: kg/m² para cargas por área y t para
 * cargas concentradas (es como se capturan y se revisan en México).
 *
 * Referencia: NTC Criterios y Acciones para el Diseño Estructural de las
 * Edificaciones (CDMX): cargas vivas unitarias (tabla 6.1.1), incremento de
 * 20 kg/m² a losas coladas en el lugar y otros 20 kg/m² si llevan capa de
 * mortero (5.1.2), y factores de carga 1.3 (muerta) y 1.5 (viva) para
 * estructuras del grupo B (3.4).
 */

export type Uso =
  | "habitacion"
  | "oficinas"
  | "comunicacion"
  | "comercio"
  | "garaje"
  | "azotea-plana"
  | "azotea-inclinada"
  | "volado";

export interface CargaViva {
  nombre: string;
  /** Carga media, para asentamientos diferidos (kg/m²). */
  w: number;
  /** Carga instantánea, para sismo y viento (kg/m²). */
  wa: number;
  /** Carga máxima, para diseño por cargas gravitacionales (kg/m²). */
  wm: number;
}

export const CARGAS_VIVAS: Record<Uso, CargaViva> = {
  habitacion: { nombre: "Habitación (casas, departamentos, cuartos de hotel)", w: 80, wa: 100, wm: 190 },
  oficinas: { nombre: "Oficinas, despachos y laboratorios", w: 100, wa: 180, wm: 250 },
  comunicacion: { nombre: "Pasillos, escaleras y rampas", w: 40, wa: 150, wm: 350 },
  comercio: { nombre: "Comercios (Wm = 350 kg/m²)", w: 280, wa: 315, wm: 350 },
  garaje: { nombre: "Garajes y estacionamientos (autos)", w: 40, wa: 100, wm: 250 },
  "azotea-plana": { nombre: "Azotea con pendiente de 5 % o menos", w: 15, wa: 70, wm: 100 },
  "azotea-inclinada": { nombre: "Azotea con pendiente mayor de 5 %", w: 5, wa: 20, wm: 40 },
  volado: { nombre: "Volados en vía pública (marquesinas, balcones)", w: 15, wa: 70, wm: 300 },
};

/** Factores de carga para estructuras del grupo B. */
export const FACTOR_MUERTA = 1.3;
export const FACTOR_VIVA = 1.5;

/** Incremento a losas coladas en el lugar y a su capa de mortero (kg/m² cada uno). */
export const INCREMENTO_COLADO = 20;
export const INCREMENTO_MORTERO = 20;

export interface Nivel {
  nombre: string;
  uso: Uso;
  /** Espesor de la losa (m). */
  espesorLosa: number;
  /** Peso volumétrico del concreto (t/m³). */
  pesoConcreto: number;
  /** Acabados, impermeabilizante, rellenos, plafón e instalaciones (kg/m²). */
  acabados: number;
  /** Muros divisorios repartidos en el área (kg/m²). */
  muros: number;
  coladaEnSitio: boolean;
  conMortero: boolean;
}

export interface Elemento {
  nombre: string;
  /** Área tributaria en cada nivel (m²). */
  areaTributaria: number;
  /** Peso propio del elemento en cada nivel: columna, muro de carga, trabes (t). */
  pesoPropio: number;
}

export interface EntradaBajada {
  /** Del nivel más alto (azotea) al más bajo. */
  niveles: Nivel[];
  elementos: Elemento[];
  /** Capacidad de carga admisible del suelo (t/m²). Opcional. */
  capacidadSuelo?: number;
  /** Incremento por el peso de la cimentación y el relleno (fracción, por ejemplo 0.1). */
  incrementoCimentacion: number;
}

export interface CargaNivel {
  nombre: string;
  uso: Uso;
  losa: number;
  incremento: number;
  acabados: number;
  muros: number;
  /** Carga muerta total (kg/m²). */
  muerta: number;
  viva: CargaViva;
  /** CM + CVm (kg/m²). */
  servicio: number;
  /** 1.3 CM + 1.5 CVm (kg/m²). */
  ultima: number;
}

export interface CargaElementoNivel {
  nivel: string;
  /** Carga muerta que baja en este nivel, con peso propio (t). */
  muerta: number;
  /** Carga viva máxima que baja en este nivel (t). */
  viva: number;
  /** Carga de servicio acumulada hasta este nivel (t). */
  servicioAcumulada: number;
  /** Carga última acumulada hasta este nivel (t). */
  ultimaAcumulada: number;
}

export interface Cimentacion {
  /** Carga de servicio con el incremento por cimentación (t). */
  carga: number;
  /** Área de contacto requerida (m²). */
  area: number;
  /** Lado de una zapata cuadrada, redondeado hacia arriba a 5 cm (m). */
  lado: number;
}

export interface ResultadoElemento {
  nombre: string;
  niveles: CargaElementoNivel[];
  /** Carga de servicio en la base (t). */
  servicio: number;
  /** Carga última en la base (t). */
  ultima: number;
  cimentacion?: Cimentacion;
}

export interface ResultadoBajada {
  niveles: CargaNivel[];
  elementos: ResultadoElemento[];
}

function positivo(valor: number, nombre: string, { cero = false, max = Infinity } = {}) {
  if (!Number.isFinite(valor) || (cero ? valor < 0 : valor <= 0)) {
    throw new RangeError(`${nombre} debe ser ${cero ? "cero o mayor" : "mayor que cero"}.`);
  }
  if (valor > max) throw new RangeError(`${nombre} no debe pasar de ${max}.`);
}

export function cargaNivel(n: Nivel): CargaNivel {
  if (!(n.uso in CARGAS_VIVAS)) throw new RangeError(`Uso desconocido en ${n.nombre}.`);
  positivo(n.espesorLosa, `El espesor de losa de «${n.nombre}»`, { max: 0.6 });
  positivo(n.pesoConcreto, `El peso del concreto de «${n.nombre}»`, { max: 3 });
  positivo(n.acabados, `Los acabados de «${n.nombre}»`, { cero: true, max: 2000 });
  positivo(n.muros, `Los muros de «${n.nombre}»`, { cero: true, max: 2000 });
  const losa = n.espesorLosa * n.pesoConcreto * 1000;
  const incremento = (n.coladaEnSitio ? INCREMENTO_COLADO : 0) + (n.conMortero ? INCREMENTO_MORTERO : 0);
  const muerta = losa + incremento + n.acabados + n.muros;
  const viva = CARGAS_VIVAS[n.uso];
  return {
    nombre: n.nombre,
    uso: n.uso,
    losa,
    incremento,
    acabados: n.acabados,
    muros: n.muros,
    muerta,
    viva,
    servicio: muerta + viva.wm,
    ultima: FACTOR_MUERTA * muerta + FACTOR_VIVA * viva.wm,
  };
}

/** Lado de zapata cuadrada redondeado hacia arriba a múltiplos de 5 cm. */
export const redondearLado = (area: number) => Math.ceil(Math.sqrt(area) * 20 - 1e-9) / 20;

export function bajadaDeCargas(e: EntradaBajada): ResultadoBajada {
  if (e.niveles.length === 0) throw new RangeError("Agrega al menos un nivel.");
  if (e.elementos.length === 0) throw new RangeError("Agrega al menos un elemento (columna o muro).");
  if (e.capacidadSuelo !== undefined) positivo(e.capacidadSuelo, "La capacidad del suelo", { max: 500 });
  positivo(e.incrementoCimentacion, "El incremento por cimentación", { cero: true, max: 1 });

  const niveles = e.niveles.map(cargaNivel);

  const elementos = e.elementos.map((el): ResultadoElemento => {
    positivo(el.areaTributaria, `El área tributaria de «${el.nombre}»`, { max: 1000 });
    positivo(el.pesoPropio, `El peso propio de «${el.nombre}»`, { cero: true, max: 100 });
    let servicio = 0;
    let ultima = 0;
    const filas = niveles.map((n): CargaElementoNivel => {
      const muerta = (n.muerta * el.areaTributaria) / 1000 + el.pesoPropio;
      const viva = (n.viva.wm * el.areaTributaria) / 1000;
      servicio += muerta + viva;
      ultima += FACTOR_MUERTA * muerta + FACTOR_VIVA * viva;
      return { nivel: n.nombre, muerta, viva, servicioAcumulada: servicio, ultimaAcumulada: ultima };
    });
    const cimentacion =
      e.capacidadSuelo === undefined
        ? undefined
        : (() => {
            const carga = servicio * (1 + e.incrementoCimentacion);
            const area = carga / e.capacidadSuelo;
            return { carga, area, lado: redondearLado(area) };
          })();
    return { nombre: el.nombre, niveles: filas, servicio, ultima, cimentacion };
  });

  return { niveles, elementos };
}

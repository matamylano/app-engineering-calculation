/**
 * Asentamientos de cimentaciones superficiales. Unidades SI: kPa, m.
 *
 * - Inmediato (elástico), cimentación rígida sobre medio semi-infinito:
 *     Se = q·B·(1 − ν²)·Ir / Es
 * - Por consolidación primaria de un estrato de arcilla, con el incremento de
 *   esfuerzo a la mitad del estrato por el método 2:1.
 */

export type SettlementShape = "cuadrada" | "rectangular" | "circular";

export interface ImmediateSettlementInput {
  /** Presión neta de contacto q, en kPa. */
  pressure: number;
  /** Ancho B (o diámetro), en m. */
  width: number;
  /** Largo L, en m. Solo para rectangular. */
  length?: number;
  shape: SettlementShape;
  /** Módulo de elasticidad del suelo Es, en kPa. */
  elasticModulus: number;
  /** Relación de Poisson ν. */
  poisson: number;
}

/**
 * Factor de influencia para cimentación rígida en función de L/B
 * (Das, Principios de Ingeniería de Cimentaciones). Circular: π/4.
 */
const RIGID_INFLUENCE: [number, number][] = [
  [1, 0.82],
  [1.5, 1.06],
  [2, 1.2],
  [5, 1.7],
  [10, 2.1],
];

export function rigidInfluenceFactor(shape: SettlementShape, lengthOverWidth = 1): number {
  if (shape === "circular") return Math.PI / 4;
  if (shape === "cuadrada") return 0.82;
  const r = Math.min(Math.max(lengthOverWidth, 1), 10);
  for (let i = 1; i < RIGID_INFLUENCE.length; i++) {
    const [x1, y1] = RIGID_INFLUENCE.at(i - 1) as [number, number];
    const [x2, y2] = RIGID_INFLUENCE.at(i) as [number, number];
    if (r <= x2) return y1 + ((r - x1) / (x2 - x1)) * (y2 - y1);
  }
  return 2.1;
}

export function immediateSettlement(input: ImmediateSettlementInput) {
  const errors: string[] = [];
  if (!(input.pressure >= 0)) errors.push("La presión de contacto debe ser ≥ 0.");
  if (!(input.width > 0)) errors.push("El ancho debe ser > 0.");
  if (input.shape === "rectangular" && !(input.length !== undefined && input.length >= input.width)) {
    errors.push("En rectangular, el largo L debe ser ≥ al ancho B.");
  }
  if (!(input.elasticModulus > 0)) errors.push("El módulo de elasticidad debe ser > 0.");
  if (!(input.poisson >= 0 && input.poisson < 0.5)) errors.push("La relación de Poisson debe estar entre 0 y 0.5.");
  if (errors.length > 0) throw new RangeError(errors.join(" "));

  const ratio = input.shape === "rectangular" ? (input.length as number) / input.width : 1;
  const influence = rigidInfluenceFactor(input.shape, ratio);
  const settlement =
    (input.pressure * input.width * (1 - input.poisson ** 2) * influence) / input.elasticModulus;
  return { influence, settlement };
}

export interface ConsolidationInput {
  /** Presión neta de contacto q, en kPa. */
  pressure: number;
  /** Ancho B, en m. */
  width: number;
  /** Largo L, en m. Para zapata corrida, omitir (se trabaja por metro). */
  length?: number;
  /** Profundidad de la mitad del estrato medida desde el desplante, en m. */
  depthToMidLayer: number;
  /** Espesor del estrato de arcilla H, en m. */
  thickness: number;
  /** Esfuerzo efectivo inicial a la mitad del estrato σ'0, en kPa. */
  initialStress: number;
  /** Relación de vacíos inicial e0. */
  voidRatio: number;
  /** Índice de compresión Cc. */
  compressionIndex: number;
  /** Índice de recompresión Cs. Necesario si la arcilla es preconsolidada. */
  recompressionIndex?: number;
  /** Esfuerzo de preconsolidación σ'c, en kPa. Si se omite, la arcilla es normalmente consolidada. */
  preconsolidationStress?: number;
}

/** Incremento de esfuerzo por el método 2:1 a la profundidad z bajo el desplante. */
export function stressIncrement21(pressure: number, width: number, depth: number, length?: number) {
  if (length === undefined) return (pressure * width) / (width + depth);
  return (pressure * width * length) / ((width + depth) * (length + depth));
}

export function consolidationSettlement(input: ConsolidationInput) {
  const errors: string[] = [];
  if (!(input.pressure >= 0)) errors.push("La presión de contacto debe ser ≥ 0.");
  if (!(input.width > 0)) errors.push("El ancho debe ser > 0.");
  if (!(input.depthToMidLayer >= 0)) errors.push("La profundidad a la mitad del estrato debe ser ≥ 0.");
  if (!(input.thickness > 0)) errors.push("El espesor del estrato debe ser > 0.");
  if (!(input.initialStress > 0)) errors.push("El esfuerzo efectivo inicial debe ser > 0.");
  if (!(input.voidRatio > 0)) errors.push("La relación de vacíos debe ser > 0.");
  if (!(input.compressionIndex > 0)) errors.push("El índice de compresión debe ser > 0.");
  const pc = input.preconsolidationStress;
  if (pc !== undefined) {
    if (!(pc >= input.initialStress)) errors.push("El esfuerzo de preconsolidación debe ser ≥ σ'0.");
    if (!(input.recompressionIndex !== undefined && input.recompressionIndex > 0)) {
      errors.push("Para arcilla preconsolidada se necesita el índice de recompresión Cs.");
    }
  }
  if (errors.length > 0) throw new RangeError(errors.join(" "));

  const increment = stressIncrement21(input.pressure, input.width, input.depthToMidLayer, input.length);
  const s0 = input.initialStress;
  const sf = s0 + increment;
  const k = input.thickness / (1 + input.voidRatio);
  const Cc = input.compressionIndex;

  let settlement: number;
  if (pc === undefined) {
    settlement = Cc * k * Math.log10(sf / s0);
  } else {
    const Cs = input.recompressionIndex as number;
    settlement =
      sf <= pc
        ? Cs * k * Math.log10(sf / s0)
        : Cs * k * Math.log10(pc / s0) + Cc * k * Math.log10(sf / pc);
  }
  return {
    increment,
    finalStress: sf,
    settlement,
    state: pc === undefined ? ("normalmente consolidada" as const) : ("preconsolidada" as const),
  };
}

/**
 * Capacidad de carga última de cimentaciones superficiales según Terzaghi (1943).
 *
 * Unidades SI: kPa, kN/m³, m, grados.
 *
 *   Corrida:   qu = c·Nc + q·Nq + 0.5·γ·B·Nγ
 *   Cuadrada:  qu = 1.3·c·Nc + q·Nq + 0.4·γ·B·Nγ
 *   Circular:  qu = 1.3·c·Nc + q·Nq + 0.3·γ·B·Nγ   (B = diámetro)
 *
 * con q = esfuerzo efectivo al nivel de desplante.
 */

export type FootingShape = "corrida" | "cuadrada" | "circular";
export type FailureMode = "general" | "local";

/** Peso volumétrico del agua, en kN/m³. */
export const WATER_UNIT_WEIGHT = 9.81;

export interface WaterTable {
  /** Profundidad del nivel freático medida desde la superficie, en m. */
  depth: number;
  /** Peso volumétrico saturado del suelo, en kN/m³. */
  saturatedUnitWeight: number;
}

export interface TerzaghiInput {
  /** Cohesión c, en kPa. */
  cohesion: number;
  /** Ángulo de fricción interna φ, en grados (0 a 50). */
  frictionAngle: number;
  /** Peso volumétrico del suelo γ sobre el nivel freático, en kN/m³. */
  unitWeight: number;
  /** Profundidad de desplante Df, en m. */
  depth: number;
  /** Ancho B (o diámetro para circular), en m. */
  width: number;
  shape: FootingShape;
  /** Falla por corte general (suelos densos/firmes) o local (sueltos/blandos). */
  failureMode?: FailureMode;
  /** Factor de seguridad para la capacidad admisible. Por defecto 3. */
  safetyFactor?: number;
  /** Nivel freático. Sin él se supone que está lejos de la cimentación. */
  waterTable?: WaterTable;
}

export interface BearingFactors {
  Nc: number;
  Nq: number;
  Ngamma: number;
}

export type WaterTableCase = "sin-efecto" | "sobre-desplante" | "bajo-desplante";

export interface TerzaghiResult {
  /** c y φ efectivamente usados (reducidos si la falla es local). */
  cohesionUsed: number;
  frictionAngleUsed: number;
  factors: BearingFactors;
  /** Esfuerzo efectivo al nivel de desplante q, en kPa. */
  surcharge: number;
  /** Peso volumétrico usado en el término de Nγ, en kN/m³. */
  unitWeightBelow: number;
  waterTableCase: WaterTableCase;
  /** Contribución de cada término de la ecuación, en kPa. */
  terms: { cohesion: number; surcharge: number; selfWeight: number };
  /** Capacidad de carga última qu, en kPa. */
  ultimate: number;
  /** Capacidad de carga admisible qa = qu / FS, en kPa. */
  allowable: number;
  safetyFactor: number;
}

const SHAPE_COEFFICIENTS: Record<FootingShape, { sc: number; sGamma: number }> = {
  corrida: { sc: 1.0, sGamma: 0.5 },
  cuadrada: { sc: 1.3, sGamma: 0.4 },
  circular: { sc: 1.3, sGamma: 0.3 },
};

/**
 * Nγ de Terzaghi según Kumbhojkar (1993), tabulado de φ = 0° a 50° cada grado,
 * como lo publica Das en Principios de Ingeniería de Cimentaciones.
 */
const N_GAMMA_KUMBHOJKAR = [
  0.0, 0.01, 0.04, 0.06, 0.1, 0.14, 0.2, 0.27, 0.35, 0.44, 0.56, 0.69, 0.85, 1.04, 1.26, 1.52,
  1.82, 2.18, 2.59, 3.07, 3.64, 4.31, 5.09, 6.0, 7.08, 8.34, 9.84, 11.6, 13.7, 16.18, 19.13,
  22.65, 26.87, 31.94, 38.04, 45.41, 54.36, 65.27, 78.61, 95.03, 115.31, 140.51, 171.99, 211.56,
  261.6, 325.34, 407.11, 512.84, 650.67, 831.99, 1072.8,
];

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Factores de capacidad de carga de Terzaghi para φ en grados.
 *
 * Nc y Nq son las expresiones cerradas de Terzaghi. Nγ se interpola
 * linealmente en la tabla de Kumbhojkar.
 */
export function terzaghiFactors(frictionAngleDeg: number): BearingFactors {
  const phi = toRad(frictionAngleDeg);
  const tanPhi = Math.tan(phi);
  const Nq =
    Math.exp(2 * ((3 * Math.PI) / 4 - phi / 2) * tanPhi) /
    (2 * Math.cos(Math.PI / 4 + phi / 2) ** 2);
  // Límite de (Nq − 1)·cotφ cuando φ → 0: 1.5π + 1 ≈ 5.71.
  const Nc = frictionAngleDeg === 0 ? 1.5 * Math.PI + 1 : (Nq - 1) / tanPhi;
  const i = Math.min(Math.floor(frictionAngleDeg), N_GAMMA_KUMBHOJKAR.length - 2);
  const t = frictionAngleDeg - i;
  const lo = N_GAMMA_KUMBHOJKAR.at(i) ?? 0;
  const hi = N_GAMMA_KUMBHOJKAR.at(i + 1) ?? lo;
  const Ngamma = lo + t * (hi - lo);
  return { Nc, Nq, Ngamma };
}

/**
 * Esfuerzo efectivo al desplante y peso volumétrico bajo la cimentación,
 * corregidos por nivel freático (casos I, II y III de Das).
 */
function waterTableCorrection(input: TerzaghiInput) {
  const { unitWeight: gamma, depth: Df, width: B, waterTable } = input;
  if (!waterTable || waterTable.depth >= Df + B) {
    return { surcharge: gamma * Df, unitWeightBelow: gamma, waterTableCase: "sin-efecto" as const };
  }
  const buoyant = waterTable.saturatedUnitWeight - WATER_UNIT_WEIGHT;
  const Dw = waterTable.depth;
  if (Dw <= Df) {
    return {
      surcharge: gamma * Dw + buoyant * (Df - Dw),
      unitWeightBelow: buoyant,
      waterTableCase: "sobre-desplante" as const,
    };
  }
  return {
    surcharge: gamma * Df,
    unitWeightBelow: buoyant + ((Dw - Df) / B) * (gamma - buoyant),
    waterTableCase: "bajo-desplante" as const,
  };
}

export function terzaghiBearingCapacity(input: TerzaghiInput): TerzaghiResult {
  const failureMode = input.failureMode ?? "general";
  const safetyFactor = input.safetyFactor ?? 3;
  validate(input, safetyFactor);

  // Falla local: c' = (2/3)c, tanφ' = (2/3)tanφ.
  const cohesionUsed = failureMode === "local" ? (2 / 3) * input.cohesion : input.cohesion;
  const frictionAngleUsed =
    failureMode === "local"
      ? toDeg(Math.atan((2 / 3) * Math.tan(toRad(input.frictionAngle))))
      : input.frictionAngle;

  const factors = terzaghiFactors(frictionAngleUsed);
  const { sc, sGamma } = SHAPE_COEFFICIENTS[input.shape];
  const { surcharge, unitWeightBelow, waterTableCase } = waterTableCorrection(input);

  const terms = {
    cohesion: sc * cohesionUsed * factors.Nc,
    surcharge: surcharge * factors.Nq,
    selfWeight: sGamma * unitWeightBelow * input.width * factors.Ngamma,
  };
  const ultimate = terms.cohesion + terms.surcharge + terms.selfWeight;

  return {
    cohesionUsed,
    frictionAngleUsed,
    factors,
    surcharge,
    unitWeightBelow,
    waterTableCase,
    terms,
    ultimate,
    allowable: ultimate / safetyFactor,
    safetyFactor,
  };
}

function validate(input: TerzaghiInput, safetyFactor: number) {
  const checks: [boolean, string][] = [
    [Number.isFinite(input.cohesion) && input.cohesion >= 0, "La cohesión debe ser ≥ 0."],
    [
      Number.isFinite(input.frictionAngle) && input.frictionAngle >= 0 && input.frictionAngle <= 50,
      "El ángulo de fricción debe estar entre 0° y 50°.",
    ],
    [Number.isFinite(input.unitWeight) && input.unitWeight > 0, "El peso volumétrico debe ser > 0."],
    [Number.isFinite(input.depth) && input.depth >= 0, "La profundidad de desplante debe ser ≥ 0."],
    [Number.isFinite(input.width) && input.width > 0, "El ancho de la cimentación debe ser > 0."],
    [Number.isFinite(safetyFactor) && safetyFactor >= 1, "El factor de seguridad debe ser ≥ 1."],
  ];
  if (input.waterTable) {
    checks.push(
      [
        Number.isFinite(input.waterTable.depth) && input.waterTable.depth >= 0,
        "La profundidad del nivel freático debe ser ≥ 0.",
      ],
      [
        Number.isFinite(input.waterTable.saturatedUnitWeight) &&
          input.waterTable.saturatedUnitWeight > WATER_UNIT_WEIGHT,
        "El peso volumétrico saturado debe ser mayor que el del agua (9.81 kN/m³).",
      ],
    );
  }
  const errors = checks.filter(([ok]) => !ok).map(([, msg]) => msg);
  if (errors.length > 0) throw new RangeError(errors.join(" "));
}

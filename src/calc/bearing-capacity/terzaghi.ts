/**
 * Capacidad de carga última de cimentaciones superficiales según Terzaghi (1943).
 *
 * Unidades SI: kPa, kN/m³, m, grados.
 *
 *   Corrida:   qu = c·Nc + q·Nq + 0.5·γ·B·Nγ
 *   Cuadrada:  qu = 1.3·c·Nc + q·Nq + 0.4·γ·B·Nγ
 *   Circular:  qu = 1.3·c·Nc + q·Nq + 0.3·γ·B·Nγ   (B = diámetro)
 *
 * con q = γ·Df.
 */

export type FootingShape = "corrida" | "cuadrada" | "circular";
export type FailureMode = "general" | "local";

export interface TerzaghiInput {
  /** Cohesión c, en kPa. */
  cohesion: number;
  /** Ángulo de fricción interna φ, en grados (0 a 50). */
  frictionAngle: number;
  /** Peso volumétrico del suelo γ, en kN/m³. */
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
}

export interface BearingFactors {
  Nc: number;
  Nq: number;
  Ngamma: number;
}

export interface TerzaghiResult {
  /** c y φ efectivamente usados (reducidos si la falla es local). */
  cohesionUsed: number;
  frictionAngleUsed: number;
  factors: BearingFactors;
  /** Sobrecarga q = γ·Df, en kPa. */
  surcharge: number;
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

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Factores de capacidad de carga de Terzaghi para φ en grados.
 *
 * Nc y Nq son las expresiones cerradas de Terzaghi. Nγ no tiene expresión
 * cerrada en el trabajo original; se usa la aproximación de Coduto (2001),
 * Nγ = 2(Nq + 1)·tanφ / (1 + 0.4·sen 4φ). Para φ entre 30° y 40° da valores
 * alrededor de 5 % mayores que la tabla de Kumbhojkar (1993) que publica Das;
 * pendiente de validar contra casos reales.
 */
export function terzaghiFactors(frictionAngleDeg: number): BearingFactors {
  const phi = toRad(frictionAngleDeg);
  const tanPhi = Math.tan(phi);
  const Nq =
    Math.exp(2 * ((3 * Math.PI) / 4 - phi / 2) * tanPhi) /
    (2 * Math.cos(Math.PI / 4 + phi / 2) ** 2);
  // Límite de (Nq − 1)·cotφ cuando φ → 0: 1.5π + 1 ≈ 5.71.
  const Nc = frictionAngleDeg === 0 ? 1.5 * Math.PI + 1 : (Nq - 1) / tanPhi;
  const Ngamma = (2 * (Nq + 1) * tanPhi) / (1 + 0.4 * Math.sin(4 * phi));
  return { Nc, Nq, Ngamma };
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
  const surcharge = input.unitWeight * input.depth;

  const terms = {
    cohesion: sc * cohesionUsed * factors.Nc,
    surcharge: surcharge * factors.Nq,
    selfWeight: sGamma * input.unitWeight * input.width * factors.Ngamma,
  };
  const ultimate = terms.cohesion + terms.surcharge + terms.selfWeight;

  return {
    cohesionUsed,
    frictionAngleUsed,
    factors,
    surcharge,
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
  const errors = checks.filter(([ok]) => !ok).map(([, msg]) => msg);
  if (errors.length > 0) throw new RangeError(errors.join(" "));
}

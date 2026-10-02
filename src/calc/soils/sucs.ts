/**
 * Clasificación de suelos SUCS (Sistema Unificado, ASTM D2487) a partir de la
 * granulometría y los límites de Atterberg. Devuelve el símbolo de grupo.
 *
 * No distingue suelos orgánicos (OL, OH, Pt): eso requiere el límite líquido
 * secado al horno o la inspección del laboratorio.
 */

export interface SucsInput {
  /** Porcentaje que pasa la malla No. 200 (0.075 mm). */
  passingNo200: number;
  /** Porcentaje que pasa la malla No. 4 (4.75 mm). */
  passingNo4: number;
  /** Límite líquido LL, en %. Omitir si el suelo no es plástico. */
  liquidLimit?: number;
  /** Límite plástico LP, en %. Omitir si el suelo no es plástico. */
  plasticLimit?: number;
  /** Coeficiente de uniformidad Cu = D60/D10. Necesario si los finos son ≤ 12 %. */
  uniformity?: number;
  /** Coeficiente de curvatura Cc = D30²/(D10·D60). Necesario si los finos son ≤ 12 %. */
  curvature?: number;
}

export interface SucsResult {
  symbol: string;
  name: string;
  /** Índice de plasticidad IP = LL − LP (0 si no es plástico). */
  plasticityIndex: number;
  /** IP de la línea A para el LL dado: 0.73·(LL − 20). */
  aLine: number | null;
  fines: number;
  sand: number;
  gravel: number;
}

const NAMES: Record<string, string> = {
  GW: "Grava bien graduada",
  GP: "Grava mal graduada",
  GM: "Grava limosa",
  GC: "Grava arcillosa",
  "GC-GM": "Grava limo-arcillosa",
  "GW-GM": "Grava bien graduada con limo",
  "GW-GC": "Grava bien graduada con arcilla",
  "GP-GM": "Grava mal graduada con limo",
  "GP-GC": "Grava mal graduada con arcilla",
  SW: "Arena bien graduada",
  SP: "Arena mal graduada",
  SM: "Arena limosa",
  SC: "Arena arcillosa",
  "SC-SM": "Arena limo-arcillosa",
  "SW-SM": "Arena bien graduada con limo",
  "SW-SC": "Arena bien graduada con arcilla",
  "SP-SM": "Arena mal graduada con limo",
  "SP-SC": "Arena mal graduada con arcilla",
  CL: "Arcilla de baja plasticidad",
  "CL-ML": "Arcilla limosa de baja plasticidad",
  ML: "Limo de baja plasticidad",
  CH: "Arcilla de alta plasticidad",
  MH: "Limo de alta plasticidad",
};

type FinesKind = "M" | "C" | "CM";

function plasticity(input: SucsInput) {
  const { liquidLimit: LL, plasticLimit: PL } = input;
  if (LL === undefined || PL === undefined) return { LL: null, PI: 0, aLine: null };
  const PI = Math.max(0, LL - PL);
  return { LL, PI, aLine: 0.73 * (LL - 20) };
}

/** Clasifica los finos como limo (M), arcilla (C) o la zona doble CL-ML (CM). */
function finesKind(PI: number, aLine: number | null): FinesKind {
  const onOrAbove = aLine !== null && PI >= aLine;
  if (PI > 7 && onOrAbove) return "C";
  if (PI >= 4 && onOrAbove) return "CM";
  return "M";
}

function isWellGraded(prefix: "G" | "S", Cu?: number, Cc?: number) {
  if (Cu === undefined || Cc === undefined) {
    throw new RangeError("Con 12 % de finos o menos se necesitan Cu y Cc para clasificar.");
  }
  const minCu = prefix === "G" ? 4 : 6;
  return Cu >= minCu && Cc >= 1 && Cc <= 3;
}

export function classifySucs(input: SucsInput): SucsResult {
  validate(input);
  const F = input.passingNo200;
  const gravel = 100 - input.passingNo4;
  const sand = input.passingNo4 - F;
  const { LL, PI, aLine } = plasticity(input);

  let symbol: string;
  if (F >= 50) {
    if (LL === null) {
      symbol = "ML";
    } else {
      const onOrAbove = aLine !== null && PI >= aLine;
      if (LL >= 50) symbol = onOrAbove ? "CH" : "MH";
      else symbol = { C: "CL", CM: "CL-ML", M: "ML" }[finesKind(PI, aLine)];
    }
  } else {
    const prefix = gravel > sand ? "G" : "S";
    if (F < 5) {
      symbol = prefix + (isWellGraded(prefix, input.uniformity, input.curvature) ? "W" : "P");
    } else if (F > 12) {
      const kind = finesKind(PI, aLine);
      symbol = kind === "CM" ? (prefix === "G" ? "GC-GM" : "SC-SM") : prefix + kind;
    } else {
      const grading = isWellGraded(prefix, input.uniformity, input.curvature) ? "W" : "P";
      // Con finos CL-ML se usa el símbolo de arcilla (ASTM D2487).
      const fines = finesKind(PI, aLine) === "M" ? "M" : "C";
      symbol = `${prefix}${grading}-${prefix}${fines}`;
    }
  }

  return { symbol, name: NAMES[symbol], plasticityIndex: PI, aLine, fines: F, sand, gravel };
}

function validate(input: SucsInput) {
  const pct = (v: number) => Number.isFinite(v) && v >= 0 && v <= 100;
  const errors: string[] = [];
  if (!pct(input.passingNo200)) errors.push("El porcentaje que pasa la No. 200 debe estar entre 0 y 100.");
  if (!pct(input.passingNo4)) errors.push("El porcentaje que pasa la No. 4 debe estar entre 0 y 100.");
  if (input.passingNo200 > input.passingNo4) {
    errors.push("Lo que pasa la No. 200 no puede ser mayor que lo que pasa la No. 4.");
  }
  const hasLL = input.liquidLimit !== undefined;
  const hasPL = input.plasticLimit !== undefined;
  if (hasLL !== hasPL) errors.push("Captura ambos límites (LL y LP) o ninguno si el suelo no es plástico.");
  if (hasLL && hasPL && (input.plasticLimit as number) > (input.liquidLimit as number)) {
    errors.push("El límite plástico no puede ser mayor que el líquido.");
  }
  if (errors.length > 0) throw new RangeError(errors.join(" "));
}

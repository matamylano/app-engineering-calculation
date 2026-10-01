/**
 * Conversión entre unidades SI (con las que calcula el motor) y las unidades
 * de obra que se usan en México.
 */

/** Aceleración de la gravedad estándar, m/s². 1 tf = 9.80665 kN. */
const G = 9.80665;

export type StressUnit = "kPa" | "t/m²" | "kg/cm²";
export type UnitWeightUnit = "kN/m³" | "t/m³";

/** kPa por unidad de esfuerzo. */
const STRESS_IN_KPA: Record<StressUnit, number> = {
  kPa: 1,
  "t/m²": G,
  "kg/cm²": G * 10,
};

const UNIT_WEIGHT_IN_KN: Record<UnitWeightUnit, number> = {
  "kN/m³": 1,
  "t/m³": G,
};

export const toKPa = (value: number, unit: StressUnit) => value * STRESS_IN_KPA[unit];
export const fromKPa = (kPa: number, unit: StressUnit) => kPa / STRESS_IN_KPA[unit];
export const toKNm3 = (value: number, unit: UnitWeightUnit) => value * UNIT_WEIGHT_IN_KN[unit];
export const fromKNm3 = (kN: number, unit: UnitWeightUnit) => kN / UNIT_WEIGHT_IN_KN[unit];

export interface UnitSystem {
  id: "si" | "obra";
  label: string;
  stress: StressUnit;
  unitWeight: UnitWeightUnit;
}

export const UNIT_SYSTEMS: UnitSystem[] = [
  { id: "obra", label: "Obra (t/m², t/m³)", stress: "t/m²", unitWeight: "t/m³" },
  { id: "si", label: "SI (kPa, kN/m³)", stress: "kPa", unitWeight: "kN/m³" },
];

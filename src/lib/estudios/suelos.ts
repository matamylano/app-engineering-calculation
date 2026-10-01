/**
 * Formulario del estudio de suelos tal como lo captura el usuario (unidades
 * de obra, textos). El cliente lo usa para calcular en vivo y el servidor lo
 * vuelve a convertir para recalcular la memoria sin confiar en el navegador.
 */
import type { FailureMode, FootingShape } from "@/calc/soils/terzaghi";
import type { SoilStudyInput } from "@/calc/soils/study";
import { toKNm3, toKPa, UNIT_SYSTEMS, type UnitSystem } from "@/calc/units";
import { num, optNum } from "@/components/form";

import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export type { ProjectInfo } from "./proyecto";
export { EMPTY_PROJECT } from "./proyecto";

export const VALUE_KEYS = [
  "p200", "p4", "ll", "pl", "cu", "cc",
  "c", "phi", "gamma", "df", "b", "fs", "dw", "gammaSat",
  "pressure", "es", "nu", "z", "h", "s0", "e0", "ccomp", "cs", "pc",
] as const;
export type ValueKey = (typeof VALUE_KEYS)[number];
export type Values = Record<ValueKey, string>;


export interface FormularioSuelos {
  unitsId: string;
  values: Values;
  plastic: boolean;
  shape: FootingShape;
  failure: FailureMode;
  hasWater: boolean;
  useQa: boolean;
  hasClay: boolean;
  preconsolidated: boolean;
  project: ProjectInfo;
}

/** Valores de ejemplo en unidades de obra (t/m², t/m³). */
export const DEFAULT_VALUES: Values = {
  p200: "35", p4: "90", ll: "32", pl: "20", cu: "", cc: "",
  c: "2", phi: "28", gamma: "1.8", df: "1.2", b: "1.5", fs: "3", dw: "", gammaSat: "1.95",
  pressure: "", es: "1500", nu: "0.3", z: "", h: "", s0: "", e0: "", ccomp: "", cs: "", pc: "",
};


export const FORMULARIO_INICIAL: FormularioSuelos = {
  unitsId: UNIT_SYSTEMS[0].id,
  values: DEFAULT_VALUES,
  plastic: true,
  shape: "cuadrada",
  failure: "general",
  hasWater: false,
  useQa: true,
  hasClay: false,
  preconsolidated: false,
  project: EMPTY_PROJECT,
};

export const unitsOf = (f: FormularioSuelos): UnitSystem =>
  UNIT_SYSTEMS.find((u) => u.id === f.unitsId) ?? UNIT_SYSTEMS[0];

export function entradaDesdeFormulario(f: FormularioSuelos): SoilStudyInput {
  const units = unitsOf(f);
  const v = f.values;
  const n = (s: string) => num(s);
  const stress = (s: string) => toKPa(num(s), units.stress);
  const weight = (s: string) => toKNm3(num(s), units.unitWeight);
  return {
    sucs: {
      passingNo200: n(v.p200),
      passingNo4: n(v.p4),
      liquidLimit: f.plastic ? n(v.ll) : undefined,
      plasticLimit: f.plastic ? n(v.pl) : undefined,
      uniformity: optNum(v.cu),
      curvature: optNum(v.cc),
    },
    bearing: {
      cohesion: stress(v.c),
      frictionAngle: n(v.phi),
      unitWeight: weight(v.gamma),
      depth: n(v.df),
      width: n(v.b),
      shape: f.shape,
      failureMode: f.failure,
      safetyFactor: n(v.fs),
      waterTable: f.hasWater ? { depth: n(v.dw), saturatedUnitWeight: weight(v.gammaSat) } : undefined,
    },
    settlement: {
      pressure: f.useQa ? undefined : stress(v.pressure),
      elasticModulus: stress(v.es),
      poisson: n(v.nu),
      consolidation: f.hasClay
        ? {
            depthToMidLayer: n(v.z),
            thickness: n(v.h),
            initialStress: stress(v.s0),
            voidRatio: n(v.e0),
            compressionIndex: n(v.ccomp),
            recompressionIndex: f.preconsolidated ? n(v.cs) : undefined,
            preconsolidationStress: f.preconsolidated ? stress(v.pc) : undefined,
          }
        : undefined,
    },
  };
}

const MAX_TEXTO = 200;
const SHAPES: FootingShape[] = ["cuadrada", "corrida", "circular"];
const FAILURES: FailureMode[] = ["general", "local"];

/**
 * Valida un formulario que llega del navegador. Devuelve una copia limpia o
 * null si no tiene la forma esperada.
 */
export function leerFormulario(raw: unknown): FormularioSuelos | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const texto = (x: unknown) => (typeof x === "string" && x.length <= MAX_TEXTO ? x : null);
  const bool = (x: unknown) => (typeof x === "boolean" ? x : null);

  const rv = r.values as Record<string, unknown> | undefined;
  const project = leerProyecto(r.project);
  if (typeof rv !== "object" || rv === null || !project) return null;

  const values = {} as Values;
  for (const k of VALUE_KEYS) {
    const t = texto(rv[k] ?? "");
    if (t === null) return null;
    values[k] = t;
  }

  const unitsId = texto(r.unitsId);
  if (!unitsId || !UNIT_SYSTEMS.some((u) => u.id === unitsId)) return null;
  if (!SHAPES.includes(r.shape as FootingShape) || !FAILURES.includes(r.failure as FailureMode)) return null;

  const flags = ["plastic", "hasWater", "useQa", "hasClay", "preconsolidated"] as const;
  const b = {} as Record<(typeof flags)[number], boolean>;
  for (const k of flags) {
    const x = bool(r[k]);
    if (x === null) return null;
    b[k] = x;
  }

  return {
    unitsId,
    values,
    shape: r.shape as FootingShape,
    failure: r.failure as FailureMode,
    project,
    ...b,
  };
}

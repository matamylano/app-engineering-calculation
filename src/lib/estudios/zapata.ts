/**
 * Formulario de la zapata aislada tal como lo captura el usuario. El
 * servidor lo vuelve a leer y a calcular para la memoria.
 */
import type { EntradaZapata } from "@/calc/concreto/zapata";
import { num, optNum } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface FormularioZapata {
  project: ProjectInfo;
  /** Nombre de la zapata o de la columna que recibe. */
  elemento: string;
  /** t */
  carga: string;
  /** t */
  cargaUltima: string;
  /** t/m² */
  qa: string;
  /** % */
  incremento: string;
  /** cm */
  c1: string;
  c2: string;
  h: string;
  recubrimiento: string;
  /** kg/cm² */
  fc: string;
  fy: string;
  /** Número de varilla. */
  varilla: string;
  /** m, vacío para usar el mínimo */
  lado: string;
}

export const FORMULARIO_ZAPATA_INICIAL: FormularioZapata = {
  project: EMPTY_PROJECT,
  elemento: "Z-1 (columna C-3)",
  carga: "20",
  cargaUltima: "28",
  qa: "10",
  incremento: "10",
  c1: "30",
  c2: "30",
  h: "30",
  recubrimiento: "5",
  fc: "250",
  fy: "4200",
  varilla: "4",
  lado: "",
};

const CAMPOS = [
  "elemento",
  "carga",
  "cargaUltima",
  "qa",
  "incremento",
  "c1",
  "c2",
  "h",
  "recubrimiento",
  "fc",
  "fy",
  "varilla",
  "lado",
] as const;

export function entradaZapata(f: FormularioZapata): EntradaZapata {
  return {
    carga: num(f.carga),
    cargaUltima: num(f.cargaUltima),
    qa: num(f.qa),
    incremento: num(f.incremento) / 100,
    c1: num(f.c1),
    c2: num(f.c2),
    h: num(f.h),
    recubrimiento: num(f.recubrimiento),
    fc: num(f.fc),
    fy: num(f.fy),
    varilla: num(f.varilla),
    lado: optNum(f.lado),
  };
}

const MAX_TEXTO = 100;

/** Valida el formulario que llega del navegador; null si no tiene la forma esperada. */
export function leerFormularioZapata(raw: unknown): FormularioZapata | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const project = leerProyecto(r.project);
  if (!project) return null;
  const f = { project } as FormularioZapata;
  for (const k of CAMPOS) {
    const v = r[k] ?? "";
    if (typeof v !== "string" || v.length > MAX_TEXTO) return null;
    f[k] = v;
  }
  return f;
}

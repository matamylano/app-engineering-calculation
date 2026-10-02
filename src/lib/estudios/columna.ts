/**
 * Formulario de la columna tal como lo captura el usuario. El servidor lo
 * vuelve a leer y a calcular para la memoria.
 */
import type { EntradaColumna } from "@/calc/concreto/columna";
import { CAMPOS_OBRA, FORMULARIO_OBRA_INICIAL, type FormularioObra } from "@/calc/obra/cuantificacion";
import { num, optNum } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface FormularioColumna extends FormularioObra {
  project: ProjectInfo;
  elemento: string;
  /** t */
  carga: string;
  /** t·m */
  momento: string;
  /** m */
  altura: string;
  /** cm */
  b: string;
  h: string;
  recubrimiento: string;
  /** kg/cm² */
  fc: string;
  fy: string;
  varilla: string;
  estribo: string;
  /** t·m, segundo momento en la dirección de b; vacío = flexión en una dirección */
  momentoB: string;
}

export const FORMULARIO_COLUMNA_INICIAL: FormularioColumna = {
  project: EMPTY_PROJECT,
  elemento: "C-3 (central, planta baja)",
  carga: "28",
  momento: "1",
  altura: "2.7",
  b: "30",
  h: "30",
  recubrimiento: "4",
  fc: "250",
  fy: "4200",
  varilla: "5",
  estribo: "3",
  momentoB: "",
  ...FORMULARIO_OBRA_INICIAL,
};

/** Completa un formulario viejo (memoria o borrador) con los campos nuevos apagados. */
export function completarFormularioColumna(f: FormularioColumna): FormularioColumna {
  const c = { ...f } as Record<string, unknown>;
  for (const [k, v] of Object.entries({ momentoB: "", ...FORMULARIO_OBRA_INICIAL })) if (typeof c[k] !== "string") c[k] = v;
  return c as unknown as FormularioColumna;
}

/** Campos que se pueden prellenar desde la URL (por ejemplo, desde la bajada de cargas). */
export const CAMPOS_PRELLENAR_COLUMNA = ["carga", "momento", "b", "h", "altura"] as const;

const CAMPOS = [
  "elemento",
  "carga",
  "momento",
  "altura",
  "b",
  "h",
  "recubrimiento",
  "fc",
  "fy",
  "varilla",
  "estribo",
  "momentoB",
  ...CAMPOS_OBRA,
] as const;

export function entradaColumna(f: FormularioColumna): EntradaColumna {
  return {
    carga: num(f.carga),
    momento: f.momento.trim() === "" ? 0 : num(f.momento),
    altura: num(f.altura),
    b: num(f.b),
    h: num(f.h),
    recubrimiento: num(f.recubrimiento),
    fc: num(f.fc),
    fy: num(f.fy),
    varilla: num(f.varilla),
    estribo: num(f.estribo),
    momentoB: optNum(f.momentoB ?? ""),
  };
}

const MAX_TEXTO = 100;

/** Valida el formulario que llega del navegador; null si no tiene la forma esperada. */
export function leerFormularioColumna(raw: unknown): FormularioColumna | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const project = leerProyecto(r.project);
  if (!project) return null;
  const f = { project } as FormularioColumna;
  for (const k of CAMPOS) {
    const v = r[k] ?? "";
    if (typeof v !== "string" || v.length > MAX_TEXTO) return null;
    f[k] = v;
  }
  return f;
}

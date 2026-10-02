/**
 * Formulario de la zapata aislada tal como lo captura el usuario. El
 * servidor lo vuelve a leer y a calcular para la memoria.
 */
import type { EntradaZapata } from "@/calc/concreto/zapata";
import { CAMPOS_OBRA, FORMULARIO_OBRA_INICIAL, type FormularioObra } from "@/calc/obra/cuantificacion";
import { num, optNum } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface FormularioZapata extends FormularioObra {
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
  /** m, en la dirección del momento; vacío = zapata cuadrada */
  largo: string;
  /** t·m de servicio en la dirección de L; vacío = sin momento */
  momento: string;
  /** "perimetral" si se cuela con cimbra en el perímetro; "" contra el terreno. */
  cimbra: string;
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
  largo: "",
  momento: "",
  cimbra: "perimetral",
  ...FORMULARIO_OBRA_INICIAL,
};

/** Valores de los campos nuevos para formularios guardados antes de que existieran: todo apagado. */
const CAMPOS_NUEVOS_APAGADOS = { largo: "", momento: "", cimbra: "", ...FORMULARIO_OBRA_INICIAL };

/** Completa un formulario viejo (memoria o borrador) con los campos que le faltan. */
export function completarFormularioZapata(f: FormularioZapata): FormularioZapata {
  const c = { ...f } as Record<string, unknown>;
  for (const [k, v] of Object.entries(CAMPOS_NUEVOS_APAGADOS)) if (typeof c[k] !== "string") c[k] = v;
  return c as unknown as FormularioZapata;
}

/** Campos que se pueden prellenar desde la URL (por ejemplo, desde la bajada de cargas o la columna). */
export const CAMPOS_PRELLENAR_ZAPATA = ["carga", "cargaUltima", "qa", "c1", "c2"] as const;

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
  "largo",
  "momento",
  "cimbra",
  ...CAMPOS_OBRA,
] as const;

const opcional = (s: string | undefined) => optNum(s ?? "");

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
    largo: opcional(f.largo),
    momento: opcional(f.momento),
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

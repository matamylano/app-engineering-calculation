/**
 * Formulario de la viga tal como lo captura el usuario. El servidor lo
 * vuelve a leer y a calcular para la memoria.
 */
import { APOYOS, type Apoyo, type EntradaViga } from "@/calc/concreto/viga";
import { num } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface FormularioViga {
  project: ProjectInfo;
  elemento: string;
  apoyo: Apoyo;
  /** m */
  claro: string;
  /** t/m, sin peso propio */
  muerta: string;
  viva: string;
  /** cm */
  b: string;
  h: string;
  recubrimiento: string;
  /** kg/cm² */
  fc: string;
  fy: string;
  varilla: string;
  estribo: string;
}

export const FORMULARIO_VIGA_INICIAL: FormularioViga = {
  project: EMPTY_PROJECT,
  elemento: "V-1 (eje B, tramo 1-2)",
  apoyo: "simple",
  claro: "5",
  muerta: "1.5",
  viva: "0.5",
  b: "25",
  h: "40",
  recubrimiento: "3",
  fc: "250",
  fy: "4200",
  varilla: "5",
  estribo: "3",
};

const CAMPOS = ["elemento", "claro", "muerta", "viva", "b", "h", "recubrimiento", "fc", "fy", "varilla", "estribo"] as const;

export function entradaViga(f: FormularioViga): EntradaViga {
  return {
    claro: num(f.claro),
    apoyo: f.apoyo,
    muerta: num(f.muerta),
    viva: num(f.viva),
    b: num(f.b),
    h: num(f.h),
    recubrimiento: num(f.recubrimiento),
    fc: num(f.fc),
    fy: num(f.fy),
    varilla: num(f.varilla),
    estribo: num(f.estribo),
  };
}

const MAX_TEXTO = 100;

/** Valida el formulario que llega del navegador; null si no tiene la forma esperada. */
export function leerFormularioViga(raw: unknown): FormularioViga | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const project = leerProyecto(r.project);
  if (!project || typeof r.apoyo !== "string" || !Object.hasOwn(APOYOS, r.apoyo)) return null;
  const f = { project, apoyo: r.apoyo as Apoyo } as FormularioViga;
  for (const k of CAMPOS) {
    const v = r[k] ?? "";
    if (typeof v !== "string" || v.length > MAX_TEXTO) return null;
    f[k] = v;
  }
  return f;
}

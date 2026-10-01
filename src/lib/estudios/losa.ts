/**
 * Formulario de la losa en una dirección tal como lo captura el usuario. El
 * servidor lo vuelve a leer y a calcular para la memoria.
 */
import type { EntradaLosa } from "@/calc/concreto/losa";
import { APOYOS, type Apoyo } from "@/calc/concreto/viga";
import { num } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface FormularioLosa {
  project: ProjectInfo;
  elemento: string;
  apoyo: Apoyo;
  /** m */
  claro: string;
  /** cm */
  h: string;
  recubrimiento: string;
  /** kg/m², sin peso de la losa */
  muerta: string;
  viva: string;
  incrementos: boolean;
  /** kg/cm² */
  fc: string;
  fy: string;
  varilla: string;
}

export const FORMULARIO_LOSA_INICIAL: FormularioLosa = {
  project: EMPTY_PROJECT,
  elemento: "L-1 (entrepiso, tablero 1)",
  apoyo: "simple",
  claro: "3",
  h: "12",
  recubrimiento: "2",
  muerta: "150",
  viva: "190",
  incrementos: true,
  fc: "250",
  fy: "4200",
  varilla: "3",
};

const CAMPOS = ["elemento", "claro", "h", "recubrimiento", "muerta", "viva", "fc", "fy", "varilla"] as const;

export function entradaLosa(f: FormularioLosa): EntradaLosa {
  return {
    claro: num(f.claro),
    apoyo: f.apoyo,
    h: num(f.h),
    recubrimiento: num(f.recubrimiento),
    muerta: num(f.muerta),
    viva: num(f.viva),
    incrementos: f.incrementos,
    fc: num(f.fc),
    fy: num(f.fy),
    varilla: num(f.varilla),
  };
}

const MAX_TEXTO = 100;

/** Valida el formulario que llega del navegador; null si no tiene la forma esperada. */
export function leerFormularioLosa(raw: unknown): FormularioLosa | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const project = leerProyecto(r.project);
  if (!project || typeof r.apoyo !== "string" || !Object.hasOwn(APOYOS, r.apoyo)) return null;
  if (typeof r.incrementos !== "boolean") return null;
  const f = { project, apoyo: r.apoyo as Apoyo, incrementos: r.incrementos } as FormularioLosa;
  for (const k of CAMPOS) {
    const v = r[k] ?? "";
    if (typeof v !== "string" || v.length > MAX_TEXTO) return null;
    f[k] = v;
  }
  return f;
}

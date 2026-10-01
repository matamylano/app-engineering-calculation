/**
 * Formulario de la fosa séptica tal como lo captura el usuario. El servidor
 * lo vuelve a leer y a calcular para la memoria.
 */
import type { EntradaFosa } from "@/calc/drenaje/fosa";
import { num } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface FormularioFosa {
  project: ProjectInfo;
  habitantes: string;
  /** L/hab/día */
  aportacion: string;
  /** años */
  limpieza: string;
  /** °C */
  temperatura: string;
  /** m */
  profundidad: string;
  /** L/m²/día */
  tasaAplicacion: string;
}

export const FORMULARIO_FOSA_INICIAL: FormularioFosa = {
  project: EMPTY_PROJECT,
  habitantes: "6",
  aportacion: "120",
  limpieza: "1",
  temperatura: "18",
  profundidad: "1.5",
  tasaAplicacion: "40",
};

const CAMPOS = ["habitantes", "aportacion", "limpieza", "temperatura", "profundidad", "tasaAplicacion"] as const;

export function entradaFosa(f: FormularioFosa): EntradaFosa {
  return {
    habitantes: num(f.habitantes),
    aportacion: num(f.aportacion),
    limpieza: num(f.limpieza),
    temperatura: num(f.temperatura),
    profundidad: num(f.profundidad),
    tasaAplicacion: num(f.tasaAplicacion),
  };
}

const MAX_TEXTO = 100;

export function leerFormularioFosa(raw: unknown): FormularioFosa | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const project = leerProyecto(r.project);
  if (!project) return null;
  const f = { project } as FormularioFosa;
  for (const k of CAMPOS) {
    const v = r[k] ?? "";
    if (typeof v !== "string" || v.length > MAX_TEXTO) return null;
    f[k] = v;
  }
  return f;
}

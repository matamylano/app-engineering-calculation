/**
 * Formulario de la fosa séptica tal como lo captura el usuario. El servidor
 * lo vuelve a leer y a calcular para la memoria.
 */
import type { EntradaFosa } from "@/calc/drenaje/fosa";
import { RETENCION_TRAMPA } from "@/calc/drenaje/tablas";
import { num, optNum } from "@/components/form";
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
  /** "zanjas" o "pozo"; vacío o faltante = zanjas. */
  disposicion: string;
  /** m */
  diametroPozo: string;
  profundidadMaximaPozo: string;
  /** "si" para calcular la trampa de grasas; vacío = no. */
  trampa: string;
  /** "personas" o "gasto" */
  metodoTrampa: string;
  /** L/s */
  gastoFregadero: string;
  /** min */
  retencionTrampa: string;
  /** AAAA-MM, opcional */
  inicio: string;
  /** $ por servicio, opcional */
  costoDesazolve: string;
}

export const FORMULARIO_FOSA_INICIAL: FormularioFosa = {
  project: EMPTY_PROJECT,
  habitantes: "6",
  aportacion: "120",
  limpieza: "1",
  temperatura: "18",
  profundidad: "1.5",
  tasaAplicacion: "40",
  disposicion: "zanjas",
  diametroPozo: "1.5",
  profundidadMaximaPozo: "3",
  trampa: "",
  metodoTrampa: "personas",
  gastoFregadero: "0.25",
  retencionTrampa: String(RETENCION_TRAMPA),
  inicio: "",
  costoDesazolve: "",
};

const CAMPOS = [
  "habitantes",
  "aportacion",
  "limpieza",
  "temperatura",
  "profundidad",
  "tasaAplicacion",
  "disposicion",
  "diametroPozo",
  "profundidadMaximaPozo",
  "trampa",
  "metodoTrampa",
  "gastoFregadero",
  "retencionTrampa",
  "inicio",
  "costoDesazolve",
] as const;
/** Campos que se pueden prellenar por la URL (por ejemplo desde la instalación hidrosanitaria). */
export const CAMPOS_PRELLENAR_FOSA = ["habitantes", "aportacion", "temperatura", "tasaAplicacion"] as const;
/** Formularios guardados antes de estas opciones: lo que falta toma un valor que no cambia el cálculo. */
const OMISION: Partial<Record<(typeof CAMPOS)[number], string>> = {
  disposicion: "zanjas",
  diametroPozo: "1.5",
  profundidadMaximaPozo: "3",
  metodoTrampa: "personas",
  gastoFregadero: "0.25",
  retencionTrampa: String(RETENCION_TRAMPA),
};

export function entradaFosa(f: FormularioFosa): EntradaFosa {
  return {
    habitantes: num(f.habitantes),
    aportacion: num(f.aportacion),
    limpieza: num(f.limpieza),
    temperatura: num(f.temperatura),
    profundidad: num(f.profundidad),
    tasaAplicacion: num(f.tasaAplicacion),
    disposicion: f.disposicion === "pozo" ? "pozo" : "zanjas",
    pozo:
      f.disposicion === "pozo"
        ? { diametro: num(f.diametroPozo), profundidadMaxima: num(f.profundidadMaximaPozo) }
        : undefined,
    trampa:
      f.trampa !== "si"
        ? undefined
        : f.metodoTrampa === "gasto"
          ? { metodo: "gasto", gasto: num(f.gastoFregadero), retencion: num(f.retencionTrampa) }
          : { metodo: "personas" },
    inicio: (f.inicio ?? "").trim() === "" ? undefined : f.inicio.trim(),
    costoDesazolve: optNum(f.costoDesazolve ?? ""),
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
    const v = r[k] ?? OMISION[k] ?? "";
    if (typeof v !== "string" || v.length > MAX_TEXTO) return null;
    f[k] = v;
  }
  return f;
}

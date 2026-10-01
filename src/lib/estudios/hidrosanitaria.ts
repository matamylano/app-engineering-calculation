/**
 * Formulario de la instalación hidráulica y sanitaria tal como lo captura el
 * usuario. El servidor lo vuelve a leer y a calcular para la memoria.
 */
import type { EntradaCasa } from "@/calc/hidrosanitaria/casa";
import { MUEBLES, type Mueble } from "@/calc/hidrosanitaria/tablas";
import { num } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface FormularioHidrosanitaria {
  project: ProjectInfo;
  habitantes: string;
  /** L/hab/día */
  dotacion: string;
  diasCisterna: string;
  diasTinaco: string;
  muebles: Record<Mueble, string>;
  /** m */
  alturaTinaco: string;
  longitudTinaco: string;
  alturaBombeo: string;
  longitudBombeo: string;
  /** min */
  tiempoLlenado: string;
}

export const FORMULARIO_HIDROSANITARIA_INICIAL: FormularioHidrosanitaria = {
  project: EMPTY_PROJECT,
  habitantes: "5",
  dotacion: "150",
  diasCisterna: "2",
  diasTinaco: "1",
  muebles: { excusado: "2", lavabo: "2", regadera: "2", fregadero: "1", lavadero: "1", lavadora: "1" },
  alturaTinaco: "4",
  longitudTinaco: "15",
  alturaBombeo: "7",
  longitudBombeo: "10",
  tiempoLlenado: "30",
};

const CAMPOS = [
  "habitantes",
  "dotacion",
  "diasCisterna",
  "diasTinaco",
  "alturaTinaco",
  "longitudTinaco",
  "alturaBombeo",
  "longitudBombeo",
  "tiempoLlenado",
] as const;

const LISTA_MUEBLES = Object.keys(MUEBLES) as Mueble[];

export function entradaHidrosanitaria(f: FormularioHidrosanitaria): EntradaCasa {
  return {
    habitantes: num(f.habitantes),
    dotacion: num(f.dotacion),
    diasCisterna: num(f.diasCisterna),
    diasTinaco: num(f.diasTinaco),
    muebles: Object.fromEntries(
      LISTA_MUEBLES.map((m) => [m, f.muebles[m].trim() === "" ? 0 : num(f.muebles[m])]),
    ) as Record<Mueble, number>,
    alturaTinaco: num(f.alturaTinaco),
    longitudTinaco: num(f.longitudTinaco),
    alturaBombeo: num(f.alturaBombeo),
    longitudBombeo: num(f.longitudBombeo),
    tiempoLlenado: num(f.tiempoLlenado),
  };
}

const MAX_TEXTO = 100;
const texto = (x: unknown) => (typeof x === "string" && x.length <= MAX_TEXTO ? x : null);

/** Valida el formulario que llega del navegador; null si no tiene la forma esperada. */
export function leerFormularioHidrosanitaria(raw: unknown): FormularioHidrosanitaria | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const project = leerProyecto(r.project);
  if (!project || typeof r.muebles !== "object" || r.muebles === null) return null;
  const rm = r.muebles as Record<string, unknown>;
  const muebles = {} as Record<Mueble, string>;
  for (const m of LISTA_MUEBLES) {
    const v = texto(rm[m] ?? "");
    if (v === null) return null;
    muebles[m] = v;
  }
  const f = { project, muebles } as FormularioHidrosanitaria;
  for (const k of CAMPOS) {
    const v = texto(r[k] ?? "");
    if (v === null) return null;
    f[k] = v;
  }
  return f;
}

/**
 * Formulario de la instalación hidráulica y sanitaria tal como lo captura el
 * usuario. El servidor lo vuelve a leer y a calcular para la memoria.
 */
import type { EntradaCasa } from "@/calc/hidrosanitaria/casa";
import {
  CALENTADORES,
  MUEBLES,
  RESERVA_CISTERNA,
  RESERVA_TINACO,
  type Mueble,
  type TipoCalentador,
} from "@/calc/hidrosanitaria/tablas";
import { num, optNum } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface FormularioHidrosanitaria {
  project: ProjectInfo;
  habitantes: string;
  /** L/hab/día */
  dotacion: string;
  /** días; vacío = RESERVA_CISTERNA */
  diasCisterna: string;
  /** días (0.5 = medio día); vacío = RESERVA_TINACO */
  diasTinaco: string;
  muebles: Record<Mueble, string>;
  /** m */
  alturaTinaco: string;
  longitudTinaco: string;
  alturaBombeo: string;
  longitudBombeo: string;
  /** min */
  tiempoLlenado: string;
  calentador: TipoCalentador;
  /** vacío = las regaderas de la casa, hasta 2 */
  regaderasSimultaneas: string;
  /** L/persona/día; vacío = criterio CONUEE */
  consumoCaliente: string;
  /** °C; vacío = 15 °C */
  temperaturaFria: string;
  /** m, para contar registros; vacío = según planos */
  longitudDrenaje: string;
}

export const FORMULARIO_HIDROSANITARIA_INICIAL: FormularioHidrosanitaria = {
  project: EMPTY_PROJECT,
  habitantes: "5",
  dotacion: "150",
  diasCisterna: "2",
  diasTinaco: "1",
  muebles: {
    excusado: "2",
    lavabo: "2",
    regadera: "2",
    tina: "0",
    fregadero: "1",
    lavavajillas: "0",
    lavadero: "1",
    lavadora: "1",
    llaveJardin: "0",
  },
  alturaTinaco: "4",
  longitudTinaco: "15",
  alturaBombeo: "7",
  longitudBombeo: "10",
  tiempoLlenado: "30",
  calentador: "paso",
  regaderasSimultaneas: "",
  consumoCaliente: "",
  temperaturaFria: "",
  longitudDrenaje: "",
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
  "regaderasSimultaneas",
  "consumoCaliente",
  "temperaturaFria",
  "longitudDrenaje",
] as const;

const LISTA_MUEBLES = Object.keys(MUEBLES) as Mueble[];

const TIPOS_CALENTADOR = Object.keys(CALENTADORES) as TipoCalentador[];

/** Vacío o ausente (memorias anteriores) → el valor por omisión. */
const conOmision = (s: string | undefined, omision: number) => ((s ?? "").trim() === "" ? omision : num(s!));
const opcional = (s: string | undefined) => optNum(s ?? "");

export function entradaHidrosanitaria(f: FormularioHidrosanitaria): EntradaCasa {
  return {
    habitantes: num(f.habitantes),
    dotacion: num(f.dotacion),
    diasCisterna: conOmision(f.diasCisterna, RESERVA_CISTERNA),
    diasTinaco: conOmision(f.diasTinaco, RESERVA_TINACO),
    muebles: Object.fromEntries(LISTA_MUEBLES.map((m) => [m, conOmision(f.muebles[m], 0)])) as Record<Mueble, number>,
    alturaTinaco: num(f.alturaTinaco),
    longitudTinaco: num(f.longitudTinaco),
    alturaBombeo: num(f.alturaBombeo),
    longitudBombeo: num(f.longitudBombeo),
    tiempoLlenado: num(f.tiempoLlenado),
    calentador: TIPOS_CALENTADOR.includes(f.calentador) ? f.calentador : "ninguno",
    regaderasSimultaneas: opcional(f.regaderasSimultaneas),
    consumoCaliente: opcional(f.consumoCaliente),
    temperaturaFria: opcional(f.temperaturaFria),
    longitudDrenaje: opcional(f.longitudDrenaje),
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
  // Las memorias anteriores no traen calentador: se leen sin calentador.
  const calentador = r.calentador ?? "ninguno";
  if (!TIPOS_CALENTADOR.includes(calentador as TipoCalentador)) return null;
  const f = { project, muebles, calentador } as FormularioHidrosanitaria;
  for (const k of CAMPOS) {
    const v = texto(r[k] ?? "");
    if (v === null) return null;
    f[k] = v;
  }
  return f;
}

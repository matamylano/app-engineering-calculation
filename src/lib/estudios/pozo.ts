/**
 * Formulario del pozo tal como lo captura el usuario. El servidor lo vuelve
 * a leer y a calcular para la memoria.
 */
import type { EntradaPozo } from "@/calc/pozos/pozo";
import { num, optNum } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface LecturaForm {
  /** min */
  t: string;
  /** m */
  s: string;
}

export interface FormularioPozo {
  project: ProjectInfo;
  /** L/s */
  gastoPrueba: string;
  lecturas: LecturaForm[];
  /** min */
  desde: string;
  /** m, vacío si las lecturas son del pozo bombeado */
  radioObservacion: string;
  /** m */
  nivelEstatico: string;
  profundidad: string;
  /** L/s */
  gastoDiseno: string;
  horasBombeo: string;
  /** m */
  sumergencia: string;
  longitudDescarga: string;
  cargaDescarga: string;
  /** % */
  aberturaRejilla: string;
}

export const MAX_LECTURAS = 60;

export const FORMULARIO_POZO_INICIAL: FormularioPozo = {
  project: EMPTY_PROJECT,
  gastoPrueba: "10",
  lecturas: [
    ["1", "1.20"],
    ["2", "1.60"],
    ["5", "2.30"],
    ["10", "2.80"],
    ["20", "3.04"],
    ["50", "3.36"],
    ["100", "3.60"],
    ["200", "3.84"],
    ["500", "4.16"],
    ["1000", "4.40"],
  ].map(([t, s]) => ({ t, s })),
  desde: "10",
  radioObservacion: "",
  nivelEstatico: "30",
  profundidad: "120",
  gastoDiseno: "8",
  horasBombeo: "24",
  sumergencia: "3",
  longitudDescarga: "20",
  cargaDescarga: "5",
  aberturaRejilla: "15",
};

const CAMPOS = [
  "gastoPrueba",
  "desde",
  "radioObservacion",
  "nivelEstatico",
  "profundidad",
  "gastoDiseno",
  "horasBombeo",
  "sumergencia",
  "longitudDescarga",
  "cargaDescarga",
  "aberturaRejilla",
] as const;

export function entradaPozo(f: FormularioPozo): EntradaPozo {
  return {
    gastoPrueba: num(f.gastoPrueba),
    lecturas: f.lecturas.filter((l) => l.t.trim() !== "" || l.s.trim() !== "").map((l) => ({ t: num(l.t), s: num(l.s) })),
    desde: num(f.desde),
    radioObservacion: optNum(f.radioObservacion),
    nivelEstatico: num(f.nivelEstatico),
    profundidad: num(f.profundidad),
    gastoDiseno: num(f.gastoDiseno),
    horasBombeo: num(f.horasBombeo),
    sumergencia: num(f.sumergencia),
    longitudDescarga: num(f.longitudDescarga),
    cargaDescarga: num(f.cargaDescarga),
    aberturaRejilla: num(f.aberturaRejilla) / 100,
  };
}

const MAX_TEXTO = 100;
const texto = (x: unknown) => (typeof x === "string" && x.length <= MAX_TEXTO ? x : null);

/** Valida el formulario que llega del navegador; null si no tiene la forma esperada. */
export function leerFormularioPozo(raw: unknown): FormularioPozo | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const project = leerProyecto(r.project);
  if (!project || !Array.isArray(r.lecturas) || r.lecturas.length > MAX_LECTURAS) return null;
  const lecturas: LecturaForm[] = [];
  for (const x of r.lecturas as unknown[]) {
    if (typeof x !== "object" || x === null) return null;
    const t = texto((x as Record<string, unknown>).t);
    const s = texto((x as Record<string, unknown>).s);
    if (t === null || s === null) return null;
    lecturas.push({ t, s });
  }
  const f = { project, lecturas } as FormularioPozo;
  for (const k of CAMPOS) {
    const v = texto(r[k] ?? "");
    if (v === null) return null;
    f[k] = v;
  }
  return f;
}

/**
 * Formulario del drenaje pluvial tal como lo captura el usuario. El servidor
 * lo vuelve a leer y a calcular para la memoria.
 */
import type { EntradaPluvial } from "@/calc/drenaje/pluvial";
import { SUPERFICIES, type Superficie } from "@/calc/drenaje/tablas";
import { num, optNum } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface FormularioPluvial {
  project: ProjectInfo;
  /** m² */
  areas: Record<Superficie, string>;
  /** mm/h */
  intensidad: string;
  /** min */
  duracion: string;
  /** % */
  pendiente: string;
  /** mm/h, vacío si no se infiltra */
  infiltracion: string;
  /** m */
  diametroPozo: string;
  profundidadPozo: string;
}

export const FORMULARIO_PLUVIAL_INICIAL: FormularioPluvial = {
  project: EMPTY_PROJECT,
  areas: { azotea: "120", pavimento: "40", jardin: "60" },
  intensidad: "100",
  duracion: "60",
  pendiente: "1",
  infiltracion: "20",
  diametroPozo: "1.5",
  profundidadPozo: "3",
};

const LISTA = Object.keys(SUPERFICIES) as Superficie[];
const CAMPOS = ["intensidad", "duracion", "pendiente", "infiltracion", "diametroPozo", "profundidadPozo"] as const;

export function entradaPluvial(f: FormularioPluvial): EntradaPluvial {
  return {
    areas: Object.fromEntries(LISTA.map((k) => [k, f.areas[k].trim() === "" ? 0 : num(f.areas[k])])) as Record<
      Superficie,
      number
    >,
    intensidad: num(f.intensidad),
    duracion: num(f.duracion),
    pendiente: num(f.pendiente),
    infiltracion: optNum(f.infiltracion),
    diametroPozo: num(f.diametroPozo),
    profundidadPozo: num(f.profundidadPozo),
  };
}

const MAX_TEXTO = 100;
const texto = (x: unknown) => (typeof x === "string" && x.length <= MAX_TEXTO ? x : null);

export function leerFormularioPluvial(raw: unknown): FormularioPluvial | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const project = leerProyecto(r.project);
  if (!project || typeof r.areas !== "object" || r.areas === null) return null;
  const ra = r.areas as Record<string, unknown>;
  const areas = {} as Record<Superficie, string>;
  for (const k of LISTA) {
    const v = texto(ra[k] ?? "");
    if (v === null) return null;
    areas[k] = v;
  }
  const f = { project, areas } as FormularioPluvial;
  for (const k of CAMPOS) {
    const v = texto(r[k] ?? "");
    if (v === null) return null;
    f[k] = v;
  }
  return f;
}

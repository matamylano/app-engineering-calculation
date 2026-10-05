/**
 * Formulario del drenaje pluvial tal como lo captura el usuario. El servidor
 * lo vuelve a leer y a calcular para la memoria.
 */
import type { EntradaCaptacion, EntradaPluvial } from "@/calc/drenaje/pluvial";
import { COEFICIENTE_TECHO, SUPERFICIES, type Superficie } from "@/calc/drenaje/tablas";
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
  /** Bajadas de azotea (mm); vacío o faltante = 100. */
  diametroBajada: string;
  /** "si" para calcular la captación de agua de lluvia; vacío = apagada. */
  captacion: string;
  /** mm de enero a diciembre; todos vacíos para usar la anual. */
  lluviaMensual: string[];
  /** mm */
  lluviaAnual: string;
  /** m², vacío = área de azotea */
  areaCaptacion: string;
  coeficienteTecho: string;
  personas: string;
  /** L/hab/día de uso no potable */
  dotacion: string;
  /** L/día; si se captura manda sobre personas × dotación */
  demandaDiaria: string;
  /** m³, vacío = la recomendada */
  cisterna: string;
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
  diametroBajada: "100",
  captacion: "",
  lluviaMensual: Array(12).fill(""),
  lluviaAnual: "",
  areaCaptacion: "",
  coeficienteTecho: String(COEFICIENTE_TECHO),
  personas: "4",
  dotacion: "50",
  demandaDiaria: "",
  cisterna: "",
};

const LISTA = Object.keys(SUPERFICIES) as Superficie[];
const CAMPOS = [
  "intensidad",
  "duracion",
  "pendiente",
  "infiltracion",
  "diametroPozo",
  "profundidadPozo",
  "diametroBajada",
  "captacion",
  "lluviaAnual",
  "areaCaptacion",
  "coeficienteTecho",
  "personas",
  "dotacion",
  "demandaDiaria",
  "cisterna",
] as const;
/** Campos que se pueden prellenar por la URL. */
export const CAMPOS_PRELLENAR_PLUVIAL = ["intensidad", "duracion", "pendiente", "infiltracion", "personas"] as const;
/** Formularios guardados antes de estas opciones: lo que falta toma el valor de omisión que no cambia el cálculo. */
const OMISION: Partial<Record<(typeof CAMPOS)[number], string>> = { diametroBajada: "100", coeficienteTecho: String(COEFICIENTE_TECHO) };

function entradaCaptacion(f: FormularioPluvial, azotea: number): EntradaCaptacion | undefined {
  if (f.captacion !== "si") return undefined;
  const mensual = f.lluviaMensual ?? [];
  const hayMensual = mensual.some((x) => x.trim() !== "");
  const personas = optNum(f.personas);
  const dotacion = optNum(f.dotacion);
  const directa = optNum(f.demandaDiaria);
  return {
    lluviaMensual: hayMensual ? Array.from({ length: 12 }, (_, i) => num(mensual[i] ?? "")) : undefined,
    lluviaAnual: hayMensual ? undefined : optNum(f.lluviaAnual),
    area: f.areaCaptacion.trim() === "" ? azotea : num(f.areaCaptacion),
    coeficiente: num(f.coeficienteTecho),
    demandaDiaria: directa ?? (personas ?? Number.NaN) * (dotacion ?? Number.NaN),
    personas: directa === undefined ? personas : undefined,
    dotacion: directa === undefined ? dotacion : undefined,
    cisterna: optNum(f.cisterna),
  };
}

export function entradaPluvial(f: FormularioPluvial): EntradaPluvial {
  const areas = Object.fromEntries(LISTA.map((k) => [k, f.areas[k].trim() === "" ? 0 : num(f.areas[k])])) as Record<
    Superficie,
    number
  >;
  return {
    areas,
    intensidad: num(f.intensidad),
    duracion: num(f.duracion),
    pendiente: num(f.pendiente),
    infiltracion: optNum(f.infiltracion),
    diametroPozo: num(f.diametroPozo),
    profundidadPozo: num(f.profundidadPozo),
    diametroBajada: (f.diametroBajada ?? "").trim() === "" ? 100 : num(f.diametroBajada),
    captacion: entradaCaptacion(f, areas.azotea),
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
    const v = texto(r[k] ?? OMISION[k] ?? "");
    if (v === null) return null;
    f[k] = v;
  }
  const lm = r.lluviaMensual ?? Array(12).fill("");
  if (!Array.isArray(lm) || lm.length !== 12) return null;
  f.lluviaMensual = [];
  for (const x of lm) {
    const v = texto(x);
    if (v === null) return null;
    f.lluviaMensual.push(v);
  }
  return f;
}

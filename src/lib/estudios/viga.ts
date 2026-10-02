/**
 * Formulario de la viga tal como lo captura el usuario. El servidor lo
 * vuelve a leer y a calcular para la memoria.
 */
import { CARGAS_VIVAS, type Uso } from "@/calc/cargas/bajada";
import { APOYOS, type Apoyo, type EntradaViga } from "@/calc/concreto/viga";
import { CAMPOS_OBRA, FORMULARIO_OBRA_INICIAL, type FormularioObra } from "@/calc/obra/cuantificacion";
import { num } from "@/components/form";
import { fraccion } from "./losa";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface FormularioViga extends FormularioObra {
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
  /** Las cargas por metro salen del ancho tributario (si no, se capturan en t/m). */
  tributaria: boolean;
  /** m */
  anchoTributario: string;
  /** kg/m²: carga muerta de la losa con su peso propio, y carga viva */
  muertaArea: string;
  vivaArea: string;
  /** Destino de la losa para la carga viva por m² ("" = la captura el usuario). */
  usoArea: Uso | "";
  /** t/m: muros apoyados directamente sobre la viga */
  muros: string;
  /** % de la carga viva que es sostenida (W / Wm), para la flecha diferida. */
  vivaSostenida: string;
  /** La flecha puede dañar muros o acabados frágiles. */
  elementosFragiles: boolean;
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
  tributaria: false,
  anchoTributario: "3",
  muertaArea: "500",
  vivaArea: "190",
  usoArea: "habitacion",
  muros: "0",
  vivaSostenida: "40",
  elementosFragiles: false,
  ...FORMULARIO_OBRA_INICIAL,
};

/** Campos que se pueden prellenar por la URL. */
export const CAMPOS_PRELLENAR_VIGA = ["claro", "muerta", "viva", "b", "h"] as const;

const CAMPOS = [
  "elemento",
  "claro",
  "muerta",
  "viva",
  "b",
  "h",
  "recubrimiento",
  "fc",
  "fy",
  "varilla",
  "estribo",
  "anchoTributario",
  "muertaArea",
  "vivaArea",
  "muros",
  "vivaSostenida",
  ...CAMPOS_OBRA,
] as const;

/**
 * Cargas por metro desde el área tributaria (t/m): muerta = ancho × CM / 1000
 * + muros; viva = ancho × CV / 1000. Null si la opción está apagada; NaN si
 * algún dato no es válido (el motor lo rechaza). No lanza: el servidor llama
 * a entradaViga antes de atrapar errores.
 */
export function cargasTributarias(f: FormularioViga): { muerta: number; viva: number } | null {
  if (f.tributaria !== true) return null;
  const ancho = num(f.anchoTributario ?? "");
  const muertaArea = num(f.muertaArea ?? "");
  const vivaArea = num(f.vivaArea ?? "");
  const muros = (f.muros ?? "").trim() === "" ? 0 : Number(f.muros);
  const valido = ancho > 0 && ancho <= 20 && muertaArea >= 0 && vivaArea >= 0 && muros >= 0;
  if (!valido) return { muerta: Number.NaN, viva: Number.NaN };
  return { muerta: (ancho * muertaArea) / 1000 + muros, viva: (ancho * vivaArea) / 1000 };
}

export function entradaViga(f: FormularioViga): EntradaViga {
  const t = cargasTributarias(f);
  return {
    claro: num(f.claro),
    apoyo: f.apoyo,
    muerta: t ? t.muerta : num(f.muerta),
    viva: t ? t.viva : num(f.viva),
    b: num(f.b),
    h: num(f.h),
    recubrimiento: num(f.recubrimiento),
    fc: num(f.fc),
    fy: num(f.fy),
    varilla: num(f.varilla),
    estribo: num(f.estribo),
    vivaSostenida: fraccion(f.vivaSostenida),
    elementosFragiles: f.elementosFragiles === true,
  };
}

const MAX_TEXTO = 100;

/** Valida el formulario que llega del navegador; null si no tiene la forma esperada. */
export function leerFormularioViga(raw: unknown): FormularioViga | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const project = leerProyecto(r.project);
  if (!project || typeof r.apoyo !== "string" || !Object.hasOwn(APOYOS, r.apoyo)) return null;
  // Campos nuevos: si faltan (memorias anteriores) quedan apagados o vacíos.
  const tributaria = r.tributaria ?? false;
  const fragiles = r.elementosFragiles ?? false;
  if (typeof tributaria !== "boolean" || typeof fragiles !== "boolean") return null;
  const uso = r.usoArea ?? "";
  if (typeof uso !== "string" || (uso !== "" && !Object.hasOwn(CARGAS_VIVAS, uso))) return null;
  const f = {
    project,
    apoyo: r.apoyo as Apoyo,
    tributaria,
    elementosFragiles: fragiles,
    usoArea: uso as Uso | "",
  } as FormularioViga;
  for (const k of CAMPOS) {
    const v = r[k] ?? "";
    if (typeof v !== "string" || v.length > MAX_TEXTO) return null;
    f[k] = v;
  }
  return f;
}

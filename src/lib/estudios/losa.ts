/**
 * Formulario de la losa en una dirección tal como lo captura el usuario. El
 * servidor lo vuelve a leer y a calcular para la memoria.
 */
import { CARGAS_VIVAS, type Uso } from "@/calc/cargas/bajada";
import type { EntradaLosa } from "@/calc/concreto/losa";
import { APOYOS, type Apoyo } from "@/calc/concreto/viga";
import { CAMPOS_OBRA, FORMULARIO_OBRA_INICIAL, type FormularioObra } from "@/calc/obra/cuantificacion";
import { num, optNum } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface FormularioLosa extends FormularioObra {
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
  /** Destino de la losa para la carga viva ("" = la captura el usuario). */
  uso: Uso | "";
  /** % de la carga viva que es sostenida (W / Wm), para la flecha diferida. */
  vivaSostenida: string;
  /** La flecha puede dañar muros o acabados frágiles. */
  elementosFragiles: boolean;
  /** Largo del tablero en la dirección larga (m), para cuantificar; "" = sin cuantificar. */
  largo: string;
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
  uso: "habitacion",
  vivaSostenida: "42",
  elementosFragiles: false,
  largo: "6",
  ...FORMULARIO_OBRA_INICIAL,
};

/** Campos que se pueden prellenar por la URL. */
export const CAMPOS_PRELLENAR_LOSA = ["claro", "h", "muerta", "viva"] as const;

const CAMPOS = [
  "elemento",
  "claro",
  "h",
  "recubrimiento",
  "muerta",
  "viva",
  "fc",
  "fy",
  "varilla",
  "vivaSostenida",
  "largo",
  ...CAMPOS_OBRA,
] as const;

/**
 * Carga viva máxima Wm (diseño) y fracción sostenida W / Wm (flecha diferida)
 * de un destino, según la tabla de cargas vivas de las NTC Criterios y Acciones.
 */
export function vivaDeUso(uso: Uso) {
  const c = CARGAS_VIVAS[uso];
  return { viva: String(c.wm), vivaSostenida: String(Math.round((100 * c.w) / c.wm)) };
}

export const OPCIONES_USO: { value: Uso | ""; label: string }[] = [
  { value: "", label: "Otra (la capturo yo)" },
  ...(Object.keys(CARGAS_VIVAS) as Uso[]).map((u) => ({ value: u, label: `${CARGAS_VIVAS[u].nombre}: ${CARGAS_VIVAS[u].wm} kg/m²` })),
];

/** "" o que falte (memorias anteriores) → valor por omisión del motor. */
export const fraccion = (s: string | undefined) => {
  const v = optNum(s ?? "");
  return v === undefined ? undefined : v / 100;
};

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
    vivaSostenida: fraccion(f.vivaSostenida),
    elementosFragiles: f.elementosFragiles === true,
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
  // Campos nuevos: si faltan (memorias anteriores) quedan apagados o vacíos.
  const fragiles = r.elementosFragiles ?? false;
  if (typeof fragiles !== "boolean") return null;
  const uso = r.uso ?? "";
  if (typeof uso !== "string" || (uso !== "" && !Object.hasOwn(CARGAS_VIVAS, uso))) return null;
  const f = {
    project,
    apoyo: r.apoyo as Apoyo,
    incrementos: r.incrementos,
    elementosFragiles: fragiles,
    uso: uso as Uso | "",
  } as FormularioLosa;
  for (const k of CAMPOS) {
    const v = r[k] ?? "";
    if (typeof v !== "string" || v.length > MAX_TEXTO) return null;
    f[k] = v;
  }
  return f;
}

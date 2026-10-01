/**
 * Formulario de la bajada de cargas tal como lo captura el usuario. El
 * servidor lo vuelve a leer y a calcular para la memoria.
 */
import { CARGAS_VIVAS, type EntradaBajada, type Uso } from "@/calc/cargas/bajada";
import { num, optNum } from "@/components/form";
import { EMPTY_PROJECT, leerProyecto, type ProjectInfo } from "./proyecto";

export interface NivelForm {
  nombre: string;
  uso: Uso;
  /** cm */
  espesor: string;
  /** t/m³ */
  pesoConcreto: string;
  /** kg/m² */
  acabados: string;
  /** kg/m² */
  muros: string;
  coladaEnSitio: boolean;
  conMortero: boolean;
}

export interface ElementoForm {
  nombre: string;
  /** m² */
  area: string;
  /** t por nivel */
  pesoPropio: string;
}

export interface FormularioCargas {
  project: ProjectInfo;
  niveles: NivelForm[];
  elementos: ElementoForm[];
  /** t/m², vacío si no hay estudio de suelos */
  qa: string;
  /** % */
  incremento: string;
}

export const NIVEL_AZOTEA: NivelForm = {
  nombre: "Azotea",
  uso: "azotea-plana",
  espesor: "10",
  pesoConcreto: "2.4",
  acabados: "150",
  muros: "0",
  coladaEnSitio: true,
  conMortero: true,
};

export const NIVEL_ENTREPISO: NivelForm = {
  ...NIVEL_AZOTEA,
  nombre: "Entrepiso (planta alta)",
  uso: "habitacion",
  acabados: "120",
  muros: "100",
};

export const FORMULARIO_CARGAS_INICIAL: FormularioCargas = {
  project: EMPTY_PROJECT,
  niveles: [NIVEL_AZOTEA, NIVEL_ENTREPISO],
  elementos: [
    { nombre: "C-1 (esquina)", area: "4", pesoPropio: "0.4" },
    { nombre: "C-2 (borde)", area: "8", pesoPropio: "0.4" },
    { nombre: "C-3 (central)", area: "16", pesoPropio: "0.4" },
  ],
  qa: "10",
  incremento: "10",
};

export const MAX_NIVELES = 6;
export const MAX_ELEMENTOS = 30;

export function entradaCargas(f: FormularioCargas): EntradaBajada {
  return {
    niveles: f.niveles.map((n) => ({
      nombre: n.nombre.trim() || "Nivel",
      uso: n.uso,
      espesorLosa: num(n.espesor) / 100,
      pesoConcreto: num(n.pesoConcreto),
      acabados: num(n.acabados),
      muros: num(n.muros),
      coladaEnSitio: n.coladaEnSitio,
      conMortero: n.conMortero,
    })),
    elementos: f.elementos.map((e) => ({
      nombre: e.nombre.trim() || "Elemento",
      areaTributaria: num(e.area),
      pesoPropio: num(e.pesoPropio),
    })),
    capacidadSuelo: optNum(f.qa),
    incrementoCimentacion: num(f.incremento) / 100,
  };
}

const MAX_TEXTO = 100;
const texto = (x: unknown) => (typeof x === "string" && x.length <= MAX_TEXTO ? x : null);

/** Valida el formulario que llega del navegador; null si no tiene la forma esperada. */
export function leerFormularioCargas(raw: unknown): FormularioCargas | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const project = leerProyecto(r.project);
  const qa = texto(r.qa ?? "");
  const incremento = texto(r.incremento);
  if (!project || qa === null || incremento === null) return null;
  if (!Array.isArray(r.niveles) || !Array.isArray(r.elementos)) return null;
  if (r.niveles.length > MAX_NIVELES || r.elementos.length > MAX_ELEMENTOS) return null;

  const niveles: NivelForm[] = [];
  for (const x of r.niveles as Record<string, unknown>[]) {
    if (typeof x !== "object" || x === null || !(typeof x.uso === "string" && x.uso in CARGAS_VIVAS)) return null;
    const campos = ["nombre", "espesor", "pesoConcreto", "acabados", "muros"].map((k) => texto(x[k]));
    if (campos.some((c) => c === null)) return null;
    if (typeof x.coladaEnSitio !== "boolean" || typeof x.conMortero !== "boolean") return null;
    const [nombre, espesor, pesoConcreto, acabados, muros] = campos as string[];
    niveles.push({ nombre, uso: x.uso as Uso, espesor, pesoConcreto, acabados, muros, coladaEnSitio: x.coladaEnSitio, conMortero: x.conMortero });
  }
  const elementos: ElementoForm[] = [];
  for (const x of r.elementos as Record<string, unknown>[]) {
    if (typeof x !== "object" || x === null) return null;
    const [nombre, area, pesoPropio] = ["nombre", "area", "pesoPropio"].map((k) => texto(x[k]));
    if (nombre === null || area === null || pesoPropio === null) return null;
    elementos.push({ nombre, area, pesoPropio });
  }
  return { project, niveles, elementos, qa, incremento };
}

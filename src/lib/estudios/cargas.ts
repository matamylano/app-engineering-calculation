/**
 * Formulario de la bajada de cargas tal como lo captura el usuario. El
 * servidor lo vuelve a leer y a calcular para la memoria.
 */
import { CARGAS_VIVAS, type EntradaBajada, type Uso } from "@/calc/cargas/bajada";
import { SISTEMAS_PISO, TIPOS_MURO, type SistemaPiso, type TipoMuro } from "@/calc/cargas/catalogos";
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
  /** kg/m², vacío = 0 */
  muros: string;
  coladaEnSitio: boolean;
  conMortero: boolean;
  /** Sistema de piso; "manual" = losa maciza con espesor y peso capturados (memorias viejas). */
  sistema: SistemaPiso;
  /** kg/m², solo para sistemas aligerados (vigueta y bovedilla, losacero) */
  pesoSistema: string;
  /** Tipo de muro divisorio; "manual" = carga equivalente capturada en `muros`. */
  tipoMuro: TipoMuro;
  /** m, altura de los muros divisorios */
  alturaMuro: string;
  /** m, longitud total de muros divisorios en el nivel */
  longitudMuro: string;
  /** m², área del nivel */
  areaNivel: string;
}

/** Campos nuevos del nivel; un formulario viejo que no los trae se lee con estos. */
const NIVEL_EXTRA = {
  sistema: "manual" as SistemaPiso,
  pesoSistema: "",
  tipoMuro: "manual" as TipoMuro,
  alturaMuro: "2.5",
  longitudMuro: "",
  areaNivel: "",
};

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
  ...NIVEL_EXTRA,
  sistema: "maciza-10",
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

/** Completa un formulario guardado con una versión anterior (niveles sin los campos nuevos). */
export const completarFormularioCargas = (f: FormularioCargas): FormularioCargas => ({
  ...f,
  niveles: f.niveles.map((n) => ({ ...NIVEL_EXTRA, ...n })),
});

export function entradaCargas(f: FormularioCargas): EntradaBajada {
  return {
    niveles: f.niveles.map((n) => {
      const sistema = n.sistema ?? "manual";
      const tipoMuro = n.tipoMuro ?? "manual";
      const pesoMuro = TIPOS_MURO[tipoMuro]?.peso;
      return {
        nombre: n.nombre.trim() || "Nivel",
        uso: n.uso,
        espesorLosa: num(n.espesor) / 100,
        pesoConcreto: num(n.pesoConcreto),
        acabados: num(n.acabados),
        muros: optNum(n.muros) ?? 0,
        coladaEnSitio: n.coladaEnSitio,
        conMortero: n.conMortero,
        sistemaPiso: sistema,
        pesoSistema: SISTEMAS_PISO[sistema]?.peso === undefined ? undefined : num(n.pesoSistema ?? ""),
        muro:
          pesoMuro === undefined
            ? undefined
            : {
                tipo: tipoMuro,
                peso: pesoMuro,
                altura: num(n.alturaMuro ?? ""),
                longitud: num(n.longitudMuro ?? ""),
                area: num(n.areaNivel ?? ""),
              },
      };
    }),
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
    // Campos nuevos: si faltan (memorias viejas) se toman los de omisión.
    const sistema = x.sistema ?? NIVEL_EXTRA.sistema;
    const tipoMuro = x.tipoMuro ?? NIVEL_EXTRA.tipoMuro;
    if (typeof sistema !== "string" || !(sistema in SISTEMAS_PISO)) return null;
    if (typeof tipoMuro !== "string" || !(tipoMuro in TIPOS_MURO)) return null;
    const extra = (["pesoSistema", "alturaMuro", "longitudMuro", "areaNivel"] as const).map((k) => texto(x[k] ?? NIVEL_EXTRA[k]));
    if (extra.some((c) => c === null)) return null;
    const [pesoSistema, alturaMuro, longitudMuro, areaNivel] = extra as string[];
    niveles.push({
      nombre, uso: x.uso as Uso, espesor, pesoConcreto, acabados, muros, coladaEnSitio: x.coladaEnSitio, conMortero: x.conMortero,
      sistema: sistema as SistemaPiso, pesoSistema, tipoMuro: tipoMuro as TipoMuro, alturaMuro, longitudMuro, areaNivel,
    });
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

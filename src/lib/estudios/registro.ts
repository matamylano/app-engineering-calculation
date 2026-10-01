/**
 * Estudios que generan memoria. Para agregar uno: su formulario, su cálculo
 * y su componente de memoria, y una entrada aquí.
 */
import { bajadaDeCargas } from "@/calc/cargas/bajada";
import { disenarPozo } from "@/calc/pozos/pozo";
import { disenarCasa } from "@/calc/hidrosanitaria/casa";
import { disenarColumna } from "@/calc/concreto/columna";
import { disenarLosa } from "@/calc/concreto/losa";
import { disenarViga, problemasViga } from "@/calc/concreto/viga";
import { disenarZapata } from "@/calc/concreto/zapata";
import { runSoilStudy } from "@/calc/soils/study";
import type { DatosCargas, DatosColumna, DatosHidrosanitaria, DatosLosa, DatosMemoria, DatosPozo, DatosSuelos, DatosViga, DatosZapata, Estudio } from "@/lib/servidor/tipos";
import { entradaCargas, leerFormularioCargas } from "./cargas";
import { entradaDesdeFormulario, leerFormulario, unitsOf } from "./suelos";
import { entradaPozo, leerFormularioPozo } from "./pozo";
import { entradaHidrosanitaria, leerFormularioHidrosanitaria } from "./hidrosanitaria";
import { entradaColumna, leerFormularioColumna } from "./columna";
import { entradaLosa, leerFormularioLosa } from "./losa";
import { entradaViga, leerFormularioViga } from "./viga";
import { entradaZapata, leerFormularioZapata } from "./zapata";

export type Calculo<D> = { ok: true; valor: D } | { ok: false; error: string };

export interface InfoEstudio {
  titulo: string;
  /** Prefijo del folio. */
  prefijo: string;
  /** Página donde se captura y se corrige. */
  ruta: string;
  /** Fórmulas aún sin revisar por el ingeniero responsable de la suite. */
  enValidacion: boolean;
}

export const ESTUDIOS: Record<Estudio, InfoEstudio> = {
  suelos: { titulo: "Estudio de mecánica de suelos", prefijo: "SUE", ruta: "/civil/suelos", enValidacion: true },
  cargas: { titulo: "Bajada de cargas", prefijo: "CAR", ruta: "/civil/cargas", enValidacion: true },
  zapata: { titulo: "Zapata aislada", prefijo: "ZAP", ruta: "/civil/zapata", enValidacion: true },
  viga: { titulo: "Viga de concreto", prefijo: "VIG", ruta: "/civil/viga", enValidacion: true },
  losa: { titulo: "Losa maciza en una dirección", prefijo: "LOS", ruta: "/civil/losa", enValidacion: true },
  columna: { titulo: "Columna de concreto", prefijo: "COL", ruta: "/civil/columna", enValidacion: true },
  hidrosanitaria: {
    titulo: "Instalación hidráulica y sanitaria",
    prefijo: "HID",
    ruta: "/civil/hidrosanitaria",
    enValidacion: true,
  },
  pozo: { titulo: "Pozo de agua", prefijo: "POZ", ruta: "/civil/pozo", enValidacion: true },
};

export const esEstudio = (x: unknown): x is Estudio => typeof x === "string" && x in ESTUDIOS;

export function estudioDeFolio(folio: string): Estudio | null {
  const prefijo = folio.slice(0, 3);
  return (Object.keys(ESTUDIOS) as Estudio[]).find((e) => ESTUDIOS[e].prefijo === prefijo) ?? null;
}

const errorDe = (e: unknown) => (e instanceof Error ? e.message : String(e));

function calcularSuelos(raw: unknown): Calculo<DatosSuelos> {
  const formulario = leerFormulario(raw);
  if (!formulario) return { ok: false, error: "Los datos del formulario no son válidos." };
  const entrada = entradaDesdeFormulario(formulario);
  const resultado = runSoilStudy(entrada);
  const errores = [resultado.sucs, resultado.bearing, resultado.settlement].flatMap((r) => (r.ok ? [] : [r.error]));
  if (errores.length) return { ok: false, error: `Corrige los datos del estudio: ${errores[0]}` };
  return { ok: true, valor: { formulario, proyecto: formulario.project, unidades: unitsOf(formulario), entrada, resultado } };
}

function calcularCargas(raw: unknown): Calculo<DatosCargas> {
  const formulario = leerFormularioCargas(raw);
  if (!formulario) return { ok: false, error: "Los datos del formulario no son válidos." };
  const entrada = entradaCargas(formulario);
  try {
    return { ok: true, valor: { formulario, proyecto: formulario.project, entrada, resultado: bajadaDeCargas(entrada) } };
  } catch (e) {
    return { ok: false, error: `Corrige los datos: ${errorDe(e)}` };
  }
}

function calcularZapata(raw: unknown): Calculo<DatosZapata> {
  const formulario = leerFormularioZapata(raw);
  if (!formulario) return { ok: false, error: "Los datos del formulario no son válidos." };
  const entrada = entradaZapata(formulario);
  try {
    const resultado = disenarZapata(entrada);
    if (!resultado.cumple) return { ok: false, error: "La zapata no pasa por cortante: aumenta el peralte o el lado." };
    return { ok: true, valor: { formulario, proyecto: formulario.project, entrada, resultado } };
  } catch (e) {
    return { ok: false, error: `Corrige los datos: ${errorDe(e)}` };
  }
}

function calcularViga(raw: unknown): Calculo<DatosViga> {
  const formulario = leerFormularioViga(raw);
  if (!formulario) return { ok: false, error: "Los datos del formulario no son válidos." };
  const entrada = entradaViga(formulario);
  try {
    const resultado = disenarViga(entrada);
    if (!resultado.cumple) return { ok: false, error: `La viga no pasa: ${problemasViga(resultado).join("; ")}.` };
    return { ok: true, valor: { formulario, proyecto: formulario.project, entrada, resultado } };
  } catch (e) {
    return { ok: false, error: `Corrige los datos: ${errorDe(e)}` };
  }
}

function calcularLosa(raw: unknown): Calculo<DatosLosa> {
  const formulario = leerFormularioLosa(raw);
  if (!formulario) return { ok: false, error: "Los datos del formulario no son válidos." };
  const entrada = entradaLosa(formulario);
  try {
    const resultado = disenarLosa(entrada);
    if (!resultado.cumple) return { ok: false, error: "La losa no pasa por cortante: aumenta el espesor." };
    return { ok: true, valor: { formulario, proyecto: formulario.project, entrada, resultado } };
  } catch (e) {
    return { ok: false, error: `Corrige los datos: ${errorDe(e)}` };
  }
}

function calcularColumna(raw: unknown): Calculo<DatosColumna> {
  const formulario = leerFormularioColumna(raw);
  if (!formulario) return { ok: false, error: "Los datos del formulario no son válidos." };
  const entrada = entradaColumna(formulario);
  try {
    const resultado = disenarColumna(entrada);
    if (!resultado.cumple) return { ok: false, error: `La columna no pasa: ${resultado.problemas.join("; ")}.` };
    return { ok: true, valor: { formulario, proyecto: formulario.project, entrada, resultado } };
  } catch (e) {
    return { ok: false, error: `Corrige los datos: ${errorDe(e)}` };
  }
}

function calcularHidrosanitaria(raw: unknown): Calculo<DatosHidrosanitaria> {
  const formulario = leerFormularioHidrosanitaria(raw);
  if (!formulario) return { ok: false, error: "Los datos del formulario no son válidos." };
  const entrada = entradaHidrosanitaria(formulario);
  try {
    const resultado = disenarCasa(entrada);
    if (!resultado.cumple) return { ok: false, error: `La instalación no pasa: ${resultado.problemas.join("; ")}.` };
    return { ok: true, valor: { formulario, proyecto: formulario.project, entrada, resultado } };
  } catch (e) {
    return { ok: false, error: `Corrige los datos: ${errorDe(e)}` };
  }
}

function calcularPozo(raw: unknown): Calculo<DatosPozo> {
  const formulario = leerFormularioPozo(raw);
  if (!formulario) return { ok: false, error: "Los datos del formulario no son válidos." };
  const entrada = entradaPozo(formulario);
  try {
    const resultado = disenarPozo(entrada);
    if (!resultado.cumple) return { ok: false, error: `El pozo no pasa: ${resultado.problemas.join("; ")}.` };
    return { ok: true, valor: { formulario, proyecto: formulario.project, entrada, resultado } };
  } catch (e) {
    return { ok: false, error: `Corrige los datos: ${errorDe(e)}` };
  }
}

const CALCULOS: Record<Estudio, (raw: unknown) => Calculo<DatosMemoria>> = {
  suelos: calcularSuelos,
  cargas: calcularCargas,
  zapata: calcularZapata,
  viga: calcularViga,
  losa: calcularLosa,
  columna: calcularColumna,
  hidrosanitaria: calcularHidrosanitaria,
  pozo: calcularPozo,
};

/** Valida y recalcula en el servidor el formulario de un estudio. */
export function calcularEstudio(estudio: Estudio, raw: unknown): Calculo<DatosMemoria> {
  return CALCULOS[estudio](raw);
}

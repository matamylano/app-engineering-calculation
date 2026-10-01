/**
 * Estudios que generan memoria. Para agregar uno: su formulario, su cálculo
 * y su componente de memoria, y una entrada aquí.
 */
import { bajadaDeCargas } from "@/calc/cargas/bajada";
import { runSoilStudy } from "@/calc/soils/study";
import type { DatosCargas, DatosSuelos, Estudio } from "@/lib/servidor/tipos";
import { entradaCargas, leerFormularioCargas } from "./cargas";
import { entradaDesdeFormulario, leerFormulario, unitsOf } from "./suelos";

export type Calculo<D> = { ok: true; valor: D } | { ok: false; error: string };

export interface InfoEstudio {
  titulo: string;
  /** Prefijo del folio. */
  prefijo: string;
  /** Página donde se captura y se corrige. */
  ruta: string;
}

export const ESTUDIOS: Record<Estudio, InfoEstudio> = {
  suelos: { titulo: "Estudio de mecánica de suelos", prefijo: "SUE", ruta: "/civil/suelos" },
  cargas: { titulo: "Bajada de cargas", prefijo: "CAR", ruta: "/civil/cargas" },
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

/** Valida y recalcula en el servidor el formulario de un estudio. */
export function calcularEstudio(estudio: Estudio, raw: unknown): Calculo<DatosSuelos | DatosCargas> {
  return estudio === "suelos" ? calcularSuelos(raw) : calcularCargas(raw);
}

import type { SoilStudyInput, SoilStudyResult } from "@/calc/soils/study";
import { fromKPa, type UnitSystem } from "@/calc/units";
import type { FormularioSuelos } from "@/lib/estudios/suelos";
import { DEFAULT_VALUES } from "@/lib/estudios/suelos";
import type { Ejemplo, Revision } from "./tipos";

/**
 * Las revisiones del estudio de suelos. Solo hay algo que revisar donde el
 * formulario trae una demanda: la presión de contacto capturada contra qa, y
 * el asentamiento total contra el admisible (el mismo criterio de
 * `runSoilStudy`, que lo reporta en `problemas`). Sin cálculo completo, nada.
 */
export function revisionesSuelos(
  entrada: SoilStudyInput,
  r: SoilStudyResult,
  unidades: UnitSystem,
): Revision[] {
  if (!r.bearing.ok || !r.settlement.ok) return [];
  const rev: Revision[] = [];
  const S = unidades.stress;
  if (entrada.settlement.pressure !== undefined)
    rev.push({
      nombre: "Presión de contacto contra la capacidad admisible",
      actuante: fromKPa(entrada.settlement.pressure, S),
      limite: fromKPa(r.bearing.value.allowable, S),
      unidad: S,
      tipo: "maximo",
      nota: "q capturada contra qa = qu / FS. Si no pasa, amplía el cimiento o desplántalo más hondo.",
    });
  const s = r.settlement.value;
  if (s.allowable !== undefined)
    rev.push({
      nombre: "Asentamiento total contra el admisible",
      actuante: s.total * 100,
      limite: s.allowable * 100,
      unidad: "cm",
      tipo: "maximo",
      nota: "Inmediato más consolidación. Si no pasa, amplía el cimiento, baja la presión de contacto o mejora el suelo.",
    });
  return rev;
}

const base = (v: Partial<FormularioSuelos["values"]>) => ({
  ...DEFAULT_VALUES,
  ...v,
});

export const EJEMPLOS_SUELOS: Ejemplo<FormularioSuelos>[] = [
  {
    nombre: "Arena arcillosa firme",
    descripcion:
      "Arena compacta: zapata cuadrada de 1.5 m a 1.2 m de profundidad, sin agua, trabajando a qa.",
    cumple: true,
    valores: {
      unitsId: "obra",
      plastic: true,
      shape: "cuadrada",
      failure: "general",
      hasWater: false,
      useQa: true,
      hasClay: false,
      preconsolidated: false,
      values: base({ es: "2500" }),
    },
  },
  {
    nombre: "Zapata corrida con carga conocida",
    descripcion:
      "Limo arenoso con nivel freático a 2 m; muro que transmite 8 t/m² sobre un cimiento de 0.8 m.",
    cumple: true,
    valores: {
      unitsId: "obra",
      plastic: true,
      shape: "corrida",
      failure: "general",
      hasWater: true,
      useQa: false,
      hasClay: false,
      preconsolidated: false,
      values: base({
        p200: "55",
        p4: "98",
        ll: "38",
        pl: "28",
        c: "1.5",
        phi: "26",
        gamma: "1.7",
        df: "1",
        b: "0.8",
        dw: "2",
        gammaSat: "1.9",
        pressure: "8",
        es: "1200",
      }),
    },
  },
  {
    nombre: "Arcilla blanda compresible",
    descripcion:
      "Arcilla lacustre con un estrato de 4 m que consolida: el asentamiento no pasa. Baja la presión de contacto, compensa la cimentación o mejora el suelo.",
    cumple: false,
    valores: {
      unitsId: "obra",
      plastic: true,
      shape: "cuadrada",
      failure: "local",
      hasWater: true,
      useQa: false,
      hasClay: true,
      preconsolidated: false,
      values: base({
        p200: "92",
        p4: "100",
        ll: "85",
        pl: "35",
        c: "2.5",
        phi: "5",
        gamma: "1.4",
        df: "1",
        b: "2",
        dw: "1.5",
        gammaSat: "1.45",
        pressure: "5",
        es: "300",
        nu: "0.45",
        z: "3",
        h: "4",
        s0: "3",
        e0: "2.5",
        ccomp: "1.2",
      }),
    },
  },
];

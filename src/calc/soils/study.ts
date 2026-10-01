/**
 * Estudio de mecánica de suelos: junta clasificación, capacidad de carga y
 * asentamientos. Todo en SI. Cada parte reporta su propio error para que la
 * interfaz muestre lo que sí se pudo calcular.
 */
import { classifySucs, type SucsInput, type SucsResult } from "./sucs";
import {
  consolidationSettlement,
  immediateSettlement,
  type ConsolidationInput,
  type SettlementShape,
} from "./settlement";
import { terzaghiBearingCapacity, type FootingShape, type TerzaghiInput, type TerzaghiResult } from "./terzaghi";

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

function attempt<T>(fn: () => T): Outcome<T> {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Para asentamientos, la zapata corrida se trata como rectangular con L/B = 10. */
const STRIP_LENGTH_RATIO = 10;

export interface SoilStudyInput {
  sucs: SucsInput;
  bearing: TerzaghiInput;
  settlement: {
    /** Presión de contacto en kPa. Si se omite, se usa qa. */
    pressure?: number;
    elasticModulus: number;
    poisson: number;
    consolidation?: Omit<ConsolidationInput, "pressure" | "width" | "length">;
  };
}

export interface SettlementResult {
  pressure: number;
  shape: SettlementShape;
  immediate: ReturnType<typeof immediateSettlement>;
  consolidation?: ReturnType<typeof consolidationSettlement>;
  /** Asentamiento total, en m. */
  total: number;
}

export interface SoilStudyResult {
  sucs: Outcome<SucsResult>;
  bearing: Outcome<TerzaghiResult>;
  settlement: Outcome<SettlementResult>;
}

const settlementShape = (shape: FootingShape): SettlementShape =>
  shape === "corrida" ? "rectangular" : shape;

export function runSoilStudy(input: SoilStudyInput): SoilStudyResult {
  const sucs = attempt(() => classifySucs(input.sucs));
  const bearing = attempt(() => terzaghiBearingCapacity(input.bearing));

  const settlement = attempt((): SettlementResult => {
    const pressure = input.settlement.pressure ?? (bearing.ok ? bearing.value.allowable : undefined);
    if (pressure === undefined) {
      throw new RangeError("Corrige la capacidad de carga o captura la presión de contacto.");
    }
    const B = input.bearing.width;
    const shape = settlementShape(input.bearing.shape);
    const length = input.bearing.shape === "corrida" ? STRIP_LENGTH_RATIO * B : undefined;
    const immediate = immediateSettlement({
      pressure,
      width: B,
      length,
      shape,
      elasticModulus: input.settlement.elasticModulus,
      poisson: input.settlement.poisson,
    });
    const consolidation = input.settlement.consolidation
      ? consolidationSettlement({
          ...input.settlement.consolidation,
          pressure,
          width: B,
          // Corrida: se trabaja por metro lineal (sin L). Cuadrada: L = B.
          length: input.bearing.shape === "corrida" ? undefined : B,
        })
      : undefined;
    return {
      pressure,
      shape,
      immediate,
      consolidation,
      total: immediate.settlement + (consolidation?.settlement ?? 0),
    };
  });

  return { sucs, bearing, settlement };
}

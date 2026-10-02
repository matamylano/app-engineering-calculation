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
import { tablaDiseno, type TablaDiseno } from "./tabla-diseno";
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

/**
 * Asentamiento total admisible por omisión, en m (2.5 cm). Es el valor usual
 * para zapatas aisladas en suelos granulares y casas de mampostería
 * (Terzaghi y Peck; Das, Principios de Ingeniería de Cimentaciones). Las NTC
 * de Cimentaciones (CDMX) fijan límites por tipo de estructura que el
 * responsable debe revisar en su caso.
 */
export const ASENTAMIENTO_ADMISIBLE = 0.025;

export interface SoilStudyInput {
  sucs: SucsInput;
  bearing: TerzaghiInput;
  settlement: {
    /** Presión de contacto en kPa. Si se omite, se usa qa. */
    pressure?: number;
    elasticModulus: number;
    poisson: number;
    consolidation?: Omit<ConsolidationInput, "pressure" | "width" | "length">;
    /** Asentamiento total admisible, en m. Si se omite no se revisa (memorias viejas). */
    allowable?: number;
  };
}

export interface SettlementResult {
  pressure: number;
  shape: SettlementShape;
  immediate: ReturnType<typeof immediateSettlement>;
  consolidation?: ReturnType<typeof consolidationSettlement>;
  /** Asentamiento total, en m. */
  total: number;
  /** Asentamiento admisible, en m, y si el total no lo rebasa. Ausentes en memorias viejas. */
  allowable?: number;
  meetsAllowable?: boolean;
}

export interface SoilStudyResult {
  sucs: Outcome<SucsResult>;
  bearing: Outcome<TerzaghiResult>;
  settlement: Outcome<SettlementResult>;
  /** qa para varios anchos y profundidades. Ausente en memorias viejas o si falla la capacidad. */
  designTable?: TablaDiseno;
  /** Advertencias que no impiden la memoria (por ejemplo, asentamiento excesivo). */
  problemas?: string[];
}

const settlementShape = (shape: FootingShape): SettlementShape =>
  shape === "corrida" ? "rectangular" : shape;

export function runSoilStudy(input: SoilStudyInput): SoilStudyResult {
  const sucs = attempt(() => classifySucs(input.sucs));
  const bearing = attempt(() => terzaghiBearingCapacity(input.bearing));

  const allowable = input.settlement.allowable;
  const settlement = attempt((): SettlementResult => {
    if (allowable !== undefined && !(Number.isFinite(allowable) && allowable > 0)) {
      throw new RangeError("El asentamiento admisible debe ser mayor que cero.");
    }
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
    const total = immediate.settlement + (consolidation?.settlement ?? 0);
    return {
      pressure,
      shape,
      immediate,
      consolidation,
      total,
      ...(allowable === undefined ? {} : { allowable, meetsAllowable: total <= allowable }),
    };
  });

  const problemas: string[] = [];
  if (settlement.ok && settlement.value.meetsAllowable === false) {
    const cm = (m: number) => (m * 100).toFixed(2);
    problemas.push(
      `El asentamiento total (${cm(settlement.value.total)} cm) rebasa el admisible (${cm(allowable as number)} cm): ` +
        "amplía el cimiento, baja la presión de contacto o mejora el suelo.",
    );
  }

  return {
    sucs,
    bearing,
    settlement,
    ...(bearing.ok ? { designTable: tablaDiseno(input.bearing) } : {}),
    problemas,
  };
}

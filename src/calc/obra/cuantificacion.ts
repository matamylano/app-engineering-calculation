/**
 * Cuantificación de obra y presupuesto rápido: volúmenes de concreto, kilos de
 * acero y metros de cimbra, con precios unitarios que pone el usuario. Lo usan
 * los estudios de concreto para que la memoria diga cuánto material lleva y
 * cuánto cuesta.
 */
import { varilla } from "@/calc/concreto/ntc";

/** Peso del acero de refuerzo: 7 850 kg/m³ → 0.785 kg/m por cada cm² de área. */
export const KG_POR_M_POR_CM2 = 0.785;

/** Desperdicio que se suma a lo cuantificado (fracción). */
export const DESPERDICIO = { concreto: 0.05, acero: 0.07, cimbra: 0 } as const;

export type Material = "concreto" | "acero" | "cimbra";

export const UNIDADES: Record<Material, string> = { concreto: "m³", acero: "kg", cimbra: "m²" };

/** Precios de referencia en México (MXN, sin IVA), solo para arrancar: el usuario los cambia. */
export const PRECIOS_REFERENCIA: Record<Material, number> = { concreto: 2600, acero: 28, cimbra: 350 };

/** Kilos por metro de una varilla. */
export function kgPorMetro(numero: number) {
  const v = varilla(numero);
  if (!v) throw new RangeError("Varilla no disponible.");
  return v.area * KG_POR_M_POR_CM2;
}

export interface Partida {
  concepto: string;
  material: Material;
  /** Cantidad neta, sin desperdicio, en la unidad del material. */
  cantidad: number;
}

export interface RenglonPresupuesto extends Partida {
  unidad: string;
  /** Con desperdicio. */
  cantidadConDesperdicio: number;
  precioUnitario: number | null;
  importe: number | null;
}

export interface Presupuesto {
  renglones: RenglonPresupuesto[];
  totales: Record<Material, number>;
  /** Suma de importes; null si no hay ningún precio. */
  total: number | null;
  /** Piezas iguales que se cuantifican (por ejemplo, 8 zapatas iguales). */
  piezas: number;
}

/**
 * Multiplica por las piezas, suma el desperdicio y valora con los precios.
 * Un precio vacío (undefined) deja ese renglón sin importe.
 */
export function presupuesto(
  partidas: Partida[],
  precios: Partial<Record<Material, number>>,
  piezas = 1,
): Presupuesto {
  if (!Number.isInteger(piezas) || piezas < 1 || piezas > 1000) throw new RangeError("Las piezas deben ser de 1 a 1000.");
  for (const m of Object.keys(precios) as Material[]) {
    const p = precios[m];
    if (p !== undefined && !(p >= 0 && Number.isFinite(p))) throw new RangeError("Revisa los precios unitarios.");
  }
  const totales: Record<Material, number> = { concreto: 0, acero: 0, cimbra: 0 };
  let total: number | null = null;
  const renglones = partidas.map((p) => {
    const cantidadConDesperdicio = p.cantidad * piezas * (1 + DESPERDICIO[p.material]);
    totales[p.material] += cantidadConDesperdicio;
    const precioUnitario = precios[p.material] ?? null;
    const importe = precioUnitario === null ? null : cantidadConDesperdicio * precioUnitario;
    if (importe !== null) total = (total ?? 0) + importe;
    return { ...p, unidad: UNIDADES[p.material], cantidadConDesperdicio, precioUnitario, importe };
  });
  return { renglones, totales, total, piezas };
}

/** Campos del formulario para cuantificar (texto, como todos los formularios). "" = sin precio. */
export interface FormularioObra {
  piezas: string;
  precioConcreto: string;
  precioAcero: string;
  precioCimbra: string;
}

export const FORMULARIO_OBRA_INICIAL: FormularioObra = {
  piezas: "1",
  precioConcreto: String(PRECIOS_REFERENCIA.concreto),
  precioAcero: String(PRECIOS_REFERENCIA.acero),
  precioCimbra: String(PRECIOS_REFERENCIA.cimbra),
};

export const CAMPOS_OBRA = ["piezas", "precioConcreto", "precioAcero", "precioCimbra"] as const;

const opcional = (s: string | undefined) => (s === undefined || s.trim() === "" ? undefined : Number(s));

/** Lee los campos de obra; los que faltan (memorias viejas) toman 1 pieza y sin precio. */
export function preciosDeFormulario(f: Partial<FormularioObra>) {
  return {
    piezas: f.piezas === undefined || f.piezas.trim() === "" ? 1 : Number(f.piezas),
    precios: {
      concreto: opcional(f.precioConcreto),
      acero: opcional(f.precioAcero),
      cimbra: opcional(f.precioCimbra),
    },
  };
}

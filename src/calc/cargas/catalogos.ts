/**
 * Catálogos de ayuda para la bajada de cargas: sistemas de piso y tipos de
 * muro divisorio con su peso típico. Son valores de referencia para llenar el
 * formulario; el usuario puede cambiarlos por los de su fabricante.
 *
 * VALIDAR: los pesos salen de valores típicos de catálogos de fabricantes
 * mexicanos y de las tablas usuales de pesos de materiales; no son valores
 * normativos de las NTC. El ingeniero responsable debe confirmarlos.
 */

export type SistemaPiso =
  | "manual"
  | "maciza-10"
  | "maciza-12"
  | "vigueta-bovedilla-concreto"
  | "vigueta-bovedilla-eps"
  | "losacero";

export interface DatosSistemaPiso {
  nombre: string;
  /** Losa maciza: espesor en cm (el peso sale de espesor × peso del concreto). */
  espesor?: number;
  /** Sistemas aligerados: peso propio por m² de planta, en kg/m². */
  peso?: number;
}

export const SISTEMAS_PISO: Record<SistemaPiso, DatosSistemaPiso> = {
  manual: { nombre: "Losa maciza (capturar espesor a mano)" },
  // 0.10 m × 2.4 t/m³ = 240 kg/m² (concreto reforzado clase 1).
  "maciza-10": { nombre: "Losa maciza de 10 cm", espesor: 10 },
  // 0.12 m × 2.4 t/m³ = 288 kg/m².
  "maciza-12": { nombre: "Losa maciza de 12 cm", espesor: 12 },
  // Vigueta pretensada y bovedilla de cemento-arena, peralte 15 + 5 cm de capa de
  // compresión: 240 a 280 kg/m² en catálogos de fabricantes. Se toma el valor alto
  // del intervalo, redondeado. VALIDAR.
  "vigueta-bovedilla-concreto": { nombre: "Vigueta y bovedilla de concreto (15 + 5 cm)", peso: 270 },
  // Igual, con bovedilla de poliestireno: 170 a 200 kg/m² en catálogos. VALIDAR.
  "vigueta-bovedilla-eps": { nombre: "Vigueta y bovedilla de poliestireno (15 + 5 cm)", peso: 200 },
  // Lámina acanalada de 6.35 cm (2.5"), cal. 22, con 6 cm de concreto sobre la cresta:
  // espesor medio ≈ 6 + 6.35/2 ≈ 9.2 cm → 0.092 × 2400 ≈ 220 kg/m², más ≈ 10 kg/m² de
  // lámina. Tablas de fabricantes: 210 a 235 kg/m². VALIDAR.
  losacero: { nombre: "Losacero cal. 22 con 6 cm de concreto sobre la cresta", peso: 230 },
};

export type TipoMuro = "manual" | "tabique-rojo" | "block-concreto" | "tablaroca";

export interface DatosTipoMuro {
  nombre: string;
  /** Peso por m² de muro (de cara), en kg/m². */
  peso?: number;
}

export const TIPOS_MURO: Record<TipoMuro, DatosTipoMuro> = {
  manual: { nombre: "Capturar la carga equivalente a mano" },
  // Tabique 14 cm × ≈1.5 t/m³ ≈ 210 kg/m² + aplanado de mortero 2.5 cm por cara
  // (2 × 0.025 × 2.1 t/m³ ≈ 105 kg/m²) ≈ 300 kg/m², redondeado. VALIDAR.
  "tabique-rojo": { nombre: "Tabique rojo recocido de 14 cm, aplanado en ambas caras", peso: 300 },
  // Block hueco 15 × 20 × 40 cm (≈ 13 kg por pieza, 12.5 piezas/m²) ≈ 165 kg/m²
  // + juntas ≈ 15 + aplanado en ambas caras ≈ 105 ≈ 285 → 280 kg/m². VALIDAR.
  "block-concreto": { nombre: "Block hueco de concreto de 15 cm, aplanado en ambas caras", peso: 280 },
  // Una placa de yeso de 12.7 mm por cara (≈ 10 kg/m² cada una) con bastidor metálico
  // y pasta: 25 a 30 kg/m² en catálogos. VALIDAR.
  tablaroca: { nombre: "Tablaroca con bastidor metálico, una placa por cara", peso: 30 },
};

/**
 * Carga de muros divisorios repartida en la planta (kg/m²):
 *   w = peso del muro (kg/m² de muro) × altura × longitud de muros / área del nivel.
 */
export const muroEquivalente = (peso: number, altura: number, longitud: number, area: number) =>
  (peso * altura * longitud) / area;

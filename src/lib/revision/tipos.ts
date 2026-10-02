/**
 * Revisiones de un estudio: lo que actúa contra lo que permite la norma o
 * resiste el elemento. Se muestran en vivo mientras el usuario cambia datos.
 */
export interface Revision {
  nombre: string;
  /** Lo que pide la obra (carga, presión, gasto…). */
  actuante: number;
  /** Lo que se permite o resiste. */
  limite: number;
  unidad: string;
  /** "maximo": cumple si actuante ≤ límite; "minimo": si actuante ≥ límite. */
  tipo: "maximo" | "minimo";
  /** Qué cambiar si no cumple, o de dónde sale el límite. */
  nota?: string;
  decimales?: number;
}

export const cumpleRevision = (r: Revision) =>
  Number.isFinite(r.actuante) &&
  Number.isFinite(r.limite) &&
  (r.tipo === "maximo"
    ? r.actuante <= r.limite + 1e-9
    : r.actuante >= r.limite - 1e-9);

/** Qué tanto de la capacidad se usa (1 = justo en el límite). */
export const usoRevision = (r: Revision) =>
  r.tipo === "maximo"
    ? r.limite > 0
      ? r.actuante / r.limite
      : Infinity
    : r.actuante > 0
      ? r.limite / r.actuante
      : Infinity;

/** Ejemplo para probar el estudio con un clic. */
export interface Ejemplo<F> {
  nombre: string;
  descripcion: string;
  /** Lo que debe salir con estos datos; lo comprueban las pruebas. */
  cumple: boolean;
  valores: Partial<F>;
}

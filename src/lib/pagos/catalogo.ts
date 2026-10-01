/**
 * Precios en centavos de MXN, IVA incluido.
 * PROPUESTA: los fija el ingeniero según lo que hoy cobra (ver el plan,
 * «Decisiones pendientes»). Cambiar aquí cambia lo que cobra Stripe.
 */
export interface PaqueteCreditos {
  id: string;
  creditos: number;
  centavos: number;
}

export const PAQUETES: PaqueteCreditos[] = [
  { id: "c10", creditos: 10, centavos: 49_000 },
  { id: "c50", creditos: 50, centavos: 199_000 },
  { id: "c200", creditos: 200, centavos: 599_000 },
];

/** Revisión y firma de una memoria de suelos por el ingeniero de la suite. */
export const FIRMA_SUELOS_CENTAVOS = 250_000;

export const MONEDA = "mxn";

export const paquete = (id: string) => PAQUETES.find((p) => p.id === id);

export const pesos = (centavos: number) =>
  (centavos / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

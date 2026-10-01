import { FIRMA_SUELOS_CENTAVOS, MONEDA, paquete, pesos } from "@/lib/pagos/catalogo";
import { crearCheckout, type SesionCheckout } from "@/lib/pagos/stripe";
import { modoDemo, stripeConfigurado, urlApp, type Entorno } from "./config";
import { FOLIO_VALIDO, marcarFirmaPagada, type Resultado } from "./memorias";
import type { Almacen, Pago, RegistroMemoria, Usuario } from "./tipos";

export type Compra = { tipo: "creditos"; paquete: string } | { tipo: "firma"; folio: string };

/**
 * Crea el cobro y devuelve a dónde mandar al usuario: el Checkout de Stripe
 * o, sin Stripe, la página de pago simulado.
 */
export async function iniciarCompra(
  alm: Almacen,
  usuario: Usuario,
  compra: Compra,
  env: Entorno = process.env,
  fetcher: typeof fetch = fetch,
): Promise<Resultado<string>> {
  const base = urlApp(env);
  let datos: { descripcion: string; centavos: number; paquete?: string; folio?: string; regreso: string };

  if (compra.tipo === "creditos") {
    const p = paquete(compra.paquete);
    if (!p) return { ok: false, error: "Ese paquete no existe." };
    datos = { descripcion: `${p.creditos} créditos de cálculo`, centavos: p.centavos, paquete: p.id, regreso: "/cuenta" };
  } else {
    const m = FOLIO_VALIDO.test(compra.folio) ? await alm.memoria(compra.folio) : null;
    if (!m || m.usuarioId !== usuario.id) return { ok: false, error: "No encontramos esa memoria." };
    if (m.firmaPagada) return { ok: false, error: "La firma de esta memoria ya está pagada." };
    if (m.estado !== "borrador") return { ok: false, error: "Esta memoria no se puede mandar a firma." };
    datos = {
      descripcion: `Revisión y firma de la memoria ${m.folio}`,
      centavos: FIRMA_SUELOS_CENTAVOS,
      folio: m.folio,
      regreso: `/memorias/${m.folio}`,
    };
  }

  if (!stripeConfigurado(env)) {
    // Pagos simulados solo en modo demostración; con datos reales, sin Stripe no se cobra.
    if (!modoDemo(env)) return { ok: false, error: "Los pagos todavía no están activos. Intenta más tarde." };
    const q = new URLSearchParams({ tipo: compra.tipo, ...(datos.paquete ? { paquete: datos.paquete } : {}), ...(datos.folio ? { folio: datos.folio } : {}) });
    return { ok: true, valor: `/pagos/demo?${q}` };
  }

  const sesion = await crearCheckout(
    {
      usuarioId: usuario.id,
      email: usuario.email,
      tipo: compra.tipo,
      descripcion: datos.descripcion,
      centavos: datos.centavos,
      moneda: MONEDA,
      paquete: datos.paquete,
      folio: datos.folio,
      urlExito: `${base}${datos.regreso}?pago=ok`,
      urlCancelar: `${base}${datos.regreso}?pago=cancelado`,
    },
    env.STRIPE_SECRET_KEY!,
    fetcher,
  );
  return { ok: true, valor: sesion.url };
}

export interface EfectoPago {
  memoriaEnRevision?: RegistroMemoria;
}

/** Aplica un pago confirmado. Se puede llamar varias veces con el mismo pago. */
export async function aplicarPago(alm: Almacen, pago: Pago): Promise<Resultado<EfectoPago>> {
  const efecto: EfectoPago = {};
  if (pago.tipo === "creditos") {
    const p = pago.paquete ? paquete(pago.paquete) : undefined;
    if (!p) return { ok: false, error: `Paquete desconocido: ${pago.paquete}` };
    await alm.sumarCreditos(pago.usuarioId, p.creditos, "compra", `pago:${pago.id}`);
  } else {
    if (!pago.folio) return { ok: false, error: "Pago de firma sin folio" };
    const antes = await alm.memoria(pago.folio);
    if (!antes || antes.usuarioId !== pago.usuarioId) return { ok: false, error: `Memoria ${pago.folio} no es del usuario` };
    const r = await marcarFirmaPagada(alm, pago.folio);
    if (!r.ok) return r;
    if (!antes.firmaPagada && r.valor.estado === "en_revision") efecto.memoriaEnRevision = r.valor;
  }
  await alm.registrarPago(pago);
  return { ok: true, valor: efecto };
}

/** Convierte la sesión de Checkout pagada en un Pago. */
export function pagoDeCheckout(s: SesionCheckout): Pago | null {
  const md = s.metadata ?? {};
  if (s.payment_status !== "paid" || !md.usuario_id || (md.tipo !== "creditos" && md.tipo !== "firma")) return null;
  return {
    id: s.id,
    usuarioId: md.usuario_id,
    tipo: md.tipo,
    montoCentavos: s.amount_total ?? 0,
    moneda: s.currency ?? MONEDA,
    paquete: md.paquete || undefined,
    folio: md.folio || undefined,
  };
}

export function descripcionCompra(c: Compra) {
  if (c.tipo === "creditos") {
    const p = paquete(c.paquete);
    return p ? { texto: `${p.creditos} créditos de cálculo`, precio: pesos(p.centavos), centavos: p.centavos } : null;
  }
  return { texto: `Revisión y firma de la memoria ${c.folio}`, precio: pesos(FIRMA_SUELOS_CENTAVOS), centavos: FIRMA_SUELOS_CENTAVOS };
}

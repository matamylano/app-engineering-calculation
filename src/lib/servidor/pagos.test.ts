import { describe, expect, it, vi } from "vitest";
import { FORMULARIO_INICIAL } from "@/lib/estudios/suelos";
import { FREE_CREDITS } from "@/lib/creditos";
import { FIRMA_SUELOS_CENTAVOS } from "@/lib/pagos/catalogo";
import { AlmacenDemo } from "./almacen-demo";
import { generarMemoria } from "./memorias";
import { aplicarPago, iniciarCompra, pagoDeCheckout } from "./pagos";

const u = { id: "u-1", email: "u@obra.mx" };
const stripeEnv = {
  SUPABASE_URL: "https://x.supabase.co",
  SUPABASE_ANON_KEY: "a",
  SUPABASE_SERVICE_ROLE_KEY: "s",
  STRIPE_SECRET_KEY: "sk_test_1",
  STRIPE_WEBHOOK_SECRET: "whsec_1",
  APP_URL: "https://suite.mx",
};

async function preparar() {
  const alm = new AlmacenDemo();
  await alm.asegurarUsuario(u);
  const g = await generarMemoria(alm, u, "suelos", FORMULARIO_INICIAL);
  if (!g.ok) throw new Error(g.error);
  return { alm, folio: g.valor.folio };
}

describe("pagos", () => {
  it("modo demostración: manda a la página de pago simulado", async () => {
    const { alm, folio } = await preparar();
    expect(await iniciarCompra(alm, u, { tipo: "creditos", paquete: "c10" }, {})).toEqual({ ok: true, valor: "/pagos/demo?tipo=creditos&paquete=c10" });
    expect(await iniciarCompra(alm, u, { tipo: "firma", folio }, {})).toEqual({ ok: true, valor: `/pagos/demo?tipo=firma&folio=${folio}` });
  });

  it("con datos reales y sin Stripe no se simula el pago", async () => {
    const { alm } = await preparar();
    const env = { SUPABASE_URL: "https://x", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s" };
    expect((await iniciarCompra(alm, u, { tipo: "creditos", paquete: "c10" }, env)).ok).toBe(false);
  });

  it("valida paquete y memoria", async () => {
    const { alm, folio } = await preparar();
    expect((await iniciarCompra(alm, u, { tipo: "creditos", paquete: "c999" }, {})).ok).toBe(false);
    expect((await iniciarCompra(alm, { id: "otro", email: "o@o.mx" }, { tipo: "firma", folio }, {})).ok).toBe(false);
  });

  it("con Stripe crea la sesión de Checkout con precio del catálogo y metadata", async () => {
    const { alm, folio } = await preparar();
    const f = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" })));
    const r = await iniciarCompra(alm, u, { tipo: "firma", folio }, stripeEnv, f);
    expect(r).toEqual({ ok: true, valor: "https://checkout.stripe.com/c/cs_1" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    const body = new URLSearchParams(String(init?.body));
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe(String(FIRMA_SUELOS_CENTAVOS));
    expect(body.get("line_items[0][price_data][currency]")).toBe("mxn");
    expect(body.get("metadata[folio]")).toBe(folio);
    expect(body.get("metadata[usuario_id]")).toBe(u.id);
    expect(body.get("metadata[paquete]")).toBeNull();
    expect(body.get("success_url")).toBe(`https://suite.mx/memorias/${folio}?pago=ok`);
  });

  it("aplicar un pago de créditos dos veces suma una sola vez", async () => {
    const { alm } = await preparar();
    const pago = { id: "cs_1", usuarioId: u.id, tipo: "creditos" as const, montoCentavos: 49000, moneda: "mxn", paquete: "c10" };
    expect((await aplicarPago(alm, pago)).ok).toBe(true);
    expect((await aplicarPago(alm, pago)).ok).toBe(true);
    expect(await alm.saldo(u.id)).toBe(FREE_CREDITS - 1 + 10);
  });

  it("el pago de la firma manda la memoria a revisión una vez", async () => {
    const { alm, folio } = await preparar();
    const pago = { id: "cs_2", usuarioId: u.id, tipo: "firma" as const, montoCentavos: FIRMA_SUELOS_CENTAVOS, moneda: "mxn", folio };
    const r1 = await aplicarPago(alm, pago);
    expect(r1.ok && r1.valor.memoriaEnRevision?.estado).toBe("en_revision");
    const r2 = await aplicarPago(alm, pago);
    expect(r2.ok && r2.valor.memoriaEnRevision).toBeUndefined();
    expect((await aplicarPago(alm, { ...pago, id: "cs_3", usuarioId: "otro" })).ok).toBe(false);
  });

  it("solo convierte sesiones pagadas con metadata completa", () => {
    const s = { id: "cs_1", payment_status: "paid" as const, amount_total: 49000, currency: "mxn", metadata: { usuario_id: "u", tipo: "creditos", paquete: "c10" } };
    expect(pagoDeCheckout(s)).toEqual({ id: "cs_1", usuarioId: "u", tipo: "creditos", montoCentavos: 49000, moneda: "mxn", paquete: "c10", folio: undefined });
    expect(pagoDeCheckout({ ...s, payment_status: "unpaid" })).toBeNull();
    expect(pagoDeCheckout({ ...s, metadata: { tipo: "creditos" } })).toBeNull();
  });
});

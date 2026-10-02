import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { almacen } from "@/lib/servidor/config";
import { POST } from "./route";

const SECRETO = "whsec_prueba";
const firmar = (cuerpo: string) => {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${createHmac("sha256", SECRETO).update(`${t}.${cuerpo}`).digest("hex")}`;
};
const solicitud = (cuerpo: string, firma: string | null) =>
  new Request("http://localhost/api/pagos/stripe", {
    method: "POST",
    body: cuerpo,
    headers: firma ? { "stripe-signature": firma } : {},
  });

const evento = (type: string, payment_status = "paid") =>
  JSON.stringify({
    id: "evt_1",
    type,
    data: {
      object: {
        id: "cs_webhook_1",
        payment_status,
        amount_total: 49000,
        currency: "mxn",
        metadata: { usuario_id: "u-webhook", tipo: "creditos", paquete: "c10" },
      },
    },
  });

describe("POST /api/pagos/stripe", () => {
  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("503 sin Stripe", async () => {
    expect((await POST(solicitud(evento("checkout.session.completed"), null))).status).toBe(503);
  });

  it("400 con firma inválida", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRETO;
    expect((await POST(solicitud(evento("checkout.session.completed"), "t=1,v1=abc"))).status).toBe(400);
  });

  it("suma los créditos una vez aunque Stripe repita el evento", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRETO;
    const alm = almacen({});
    await alm.asegurarUsuario({ id: "u-webhook", email: "w@b.mx" });
    const antes = await alm.saldo("u-webhook");
    const cuerpo = evento("checkout.session.completed");
    expect((await POST(solicitud(cuerpo, firmar(cuerpo)))).status).toBe(200);
    expect((await POST(solicitud(cuerpo, firmar(cuerpo)))).status).toBe(200);
    expect(await alm.saldo("u-webhook")).toBe(antes + 10);
  });

  it("ignora pagos sin confirmar y otros eventos", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRETO;
    const pendiente = evento("checkout.session.completed", "unpaid");
    expect(await (await POST(solicitud(pendiente, firmar(pendiente)))).json()).toMatchObject({ ignorado: "sin pago confirmado" });
    const otro = evento("customer.created");
    expect(await (await POST(solicitud(otro, firmar(otro)))).json()).toMatchObject({ ignorado: "customer.created" });
  });
});

import { NextResponse } from "next/server";
import { verificarFirmaStripe, type SesionCheckout } from "@/lib/pagos/stripe";
import { avisarMemoriaPorRevisar } from "@/lib/servidor/avisos";
import { almacen } from "@/lib/servidor/config";
import { aplicarPago, pagoDeCheckout } from "@/lib/servidor/pagos";

/** Eventos que confirman el cobro (OXXO llega después como async_payment_succeeded). */
const EVENTOS_PAGADOS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

/**
 * POST /api/pagos/stripe — webhook de Stripe. Suma créditos o manda la
 * memoria a revisión cuando el pago queda confirmado.
 */
export async function POST(req: Request) {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secreto) return NextResponse.json({ error: "Stripe no está configurado" }, { status: 503 });

  const cuerpo = await req.text();
  if (!verificarFirmaStripe(cuerpo, req.headers.get("stripe-signature"), secreto)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  const evento = JSON.parse(cuerpo) as { id: string; type: string; data: { object: SesionCheckout } };
  if (!EVENTOS_PAGADOS.has(evento.type)) return NextResponse.json({ ok: true, ignorado: evento.type });

  const pago = pagoDeCheckout(evento.data.object);
  if (!pago) return NextResponse.json({ ok: true, ignorado: "sin pago confirmado" });

  try {
    const r = await aplicarPago(almacen(), pago);
    if (!r.ok) {
      console.error("pagos.stripe", evento.id, r.error);
      return NextResponse.json({ error: r.error }, { status: 422 });
    }
    if (r.valor.memoriaEnRevision) await avisarMemoriaPorRevisar(r.valor.memoriaEnRevision);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // 500 para que Stripe reintente.
    console.error("pagos.stripe", evento.id, e);
    return NextResponse.json({ error: "No se pudo aplicar el pago" }, { status: 500 });
  }
}

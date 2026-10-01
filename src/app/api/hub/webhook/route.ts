import { NextResponse } from "next/server";

import { CABECERA_FIRMA, FirmaInvalidaError, leerEvento } from "@/lib/whatsapp/hub-cliente";

/**
 * Eventos del Hub (WHATSAPP_MODO=hub), firmados con HUB_WEBHOOK_SECRETO.
 * Por ahora solo se verifican y se registran: las conversaciones de venta las
 * atiende el agente de agentsales (el Hub enruta el número hacia él), y los
 * estados de entrega se usarán cuando la app mande avisos de memorias.
 */
export async function POST(req: Request) {
  const secreto = process.env.HUB_WEBHOOK_SECRETO;
  if (!secreto) return new NextResponse("Hub no configurado", { status: 503 });
  const cuerpo = await req.text();
  let evento;
  try {
    evento = leerEvento(cuerpo, req.headers.get(CABECERA_FIRMA), secreto);
  } catch (e) {
    if (e instanceof FirmaInvalidaError) return new NextResponse("Firma inválida", { status: 401 });
    return new NextResponse("Evento inválido", { status: 400 });
  }
  console.info("hub.webhook", evento.tipo);
  return NextResponse.json({ ok: true, tipo: evento.tipo });
}

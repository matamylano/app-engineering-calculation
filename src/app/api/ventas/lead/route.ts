import { NextResponse } from "next/server";

import { enviarProspecto, type Prospecto } from "@/lib/ventas/agentsales";

const TAMANO_MAXIMO = 5_000; // bytes

/**
 * POST /api/ventas/lead — el usuario deja su WhatsApp para que el agente de
 * ventas lo contacte (firma del estudio o compra de créditos). Exige el
 * consentimiento `acepta_contacto`.
 */
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > TAMANO_MAXIMO) {
    return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
  }
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  // Honeypot: un campo oculto que una persona nunca llena.
  if (typeof cuerpo.website === "string" && cuerpo.website !== "") return NextResponse.json({ ok: true });
  if (cuerpo.acepta_contacto !== true) {
    return NextResponse.json({ error: "Necesitamos tu autorización para contactarte." }, { status: 400 });
  }
  const texto = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);
  const prospecto: Prospecto = {
    telefono: texto(cuerpo.telefono) ?? "",
    nombre: texto(cuerpo.nombre),
    ciudad: texto(cuerpo.ciudad),
    interes: (texto(cuerpo.interes) ?? "") as Prospecto["interes"],
    estudio: texto(cuerpo.estudio),
  };
  try {
    const r = await enviarProspecto(prospecto);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ventas.lead", e);
    return NextResponse.json({ error: "No pudimos registrar tu solicitud. Intenta de nuevo." }, { status: 502 });
  }
}

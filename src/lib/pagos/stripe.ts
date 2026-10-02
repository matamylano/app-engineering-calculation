import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe por su API REST, sin SDK. Checkout usa los métodos de pago activos
 * en el dashboard (tarjeta y, si se activa, OXXO).
 */

export interface DatosCheckout {
  usuarioId: string;
  email: string;
  tipo: "creditos" | "firma";
  descripcion: string;
  centavos: number;
  moneda: string;
  paquete?: string;
  folio?: string;
  urlExito: string;
  urlCancelar: string;
}

/** Codifica un objeto anidado como application/x-www-form-urlencoded de Stripe. */
export function formStripe(obj: Record<string, unknown>, prefijo = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const llave = prefijo ? `${prefijo}[${k}]` : k;
    if (v === undefined || v === null) return [];
    if (typeof v === "object") return formStripe(v as Record<string, unknown>, llave);
    return [`${encodeURIComponent(llave)}=${encodeURIComponent(String(v))}`];
  });
}

export async function crearCheckout(
  d: DatosCheckout,
  secreto: string,
  fetcher: typeof fetch = fetch,
): Promise<{ id: string; url: string }> {
  const metadata = { usuario_id: d.usuarioId, tipo: d.tipo, paquete: d.paquete, folio: d.folio };
  const cuerpo = formStripe({
    mode: "payment",
    success_url: d.urlExito,
    cancel_url: d.urlCancelar,
    customer_email: d.email,
    client_reference_id: d.usuarioId,
    locale: "es",
    line_items: {
      0: {
        quantity: 1,
        price_data: { currency: d.moneda, unit_amount: d.centavos, product_data: { name: d.descripcion } },
      },
    },
    metadata,
    payment_intent_data: { metadata },
  }).join("&");

  const res = await fetcher("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${secreto}`, "content-type": "application/x-www-form-urlencoded" },
    body: cuerpo,
  });
  const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !json.id || !json.url) throw new Error(`Stripe: ${json.error?.message ?? res.status}`);
  return { id: json.id, url: json.url };
}

/** Tolerancia de la firma del webhook, en segundos. */
const TOLERANCIA_S = 300;

/** Verifica la cabecera Stripe-Signature (t=…,v1=…) de un webhook. */
export function verificarFirmaStripe(cuerpo: string, cabecera: string | null, secreto: string, ahora = Date.now()) {
  if (!cabecera) return false;
  const partes = cabecera.split(",").map((p) => p.split("=", 2) as [string, string]);
  const t = Number(partes.find(([k]) => k === "t")?.[1]);
  const firmas = partes.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(t) || firmas.length === 0) return false;
  if (Math.abs(ahora / 1000 - t) > TOLERANCIA_S) return false;
  const esperada = Buffer.from(createHmac("sha256", secreto).update(`${t}.${cuerpo}`).digest("hex"));
  return firmas.some((f) => {
    const b = Buffer.from(f);
    return b.length === esperada.length && timingSafeEqual(b, esperada);
  });
}

export interface SesionCheckout {
  id: string;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, string> | null;
}

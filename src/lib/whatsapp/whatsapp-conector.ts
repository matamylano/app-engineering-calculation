// COPIA de matamylano/hub sdk/whatsapp-conector.ts — no editar aquí: se cambia en el repo del Hub y se vuelve a copiar.
/**
 * Conector de WhatsApp para las apps — tres modos, la misma interfaz.
 *
 *   WHATSAPP_MODO=simulado  (por defecto) nada sale a WhatsApp; sirve para probar gratis.
 *   WHATSAPP_MODO=directo   la app habla directo con Meta con sus propias credenciales.
 *   WHATSAPP_MODO=hub       la app habla con el Hub (una cuenta de Meta para todas las apps).
 *
 * Pasar de un modo a otro es cambiar variables de entorno: la lógica de la app no
 * cambia, porque los eventos que entran (mensaje recibido, cambio de estado) tienen
 * SIEMPRE la forma del protocolo Hub (EventoHub), vengan de Meta directo o del Hub.
 *
 * Se copia a cada app junto con hub-cliente.ts (sin otras dependencias).
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { ClienteHub, ErrorHub, type EventoHub, type Plantilla } from "./hub-cliente";

export type ModoWhatsApp = "simulado" | "directo" | "hub";

export type EnvioWhatsApp = {
  /** Teléfono en dígitos con lada de país ("526141234567"). */
  para: string;
  /** Misma clave = mismo mensaje (en modo hub el Hub no lo duplica). */
  clave?: string;
  metadata?: Record<string, unknown>;
} & ({ texto: string; plantilla?: never } | { plantilla: Required<Pick<Plantilla, "nombre">> & Plantilla; texto?: never });

export type ResultadoEnvio =
  | { ok: true; id: string; estado: "enviado" | "entregado" }
  | { ok: false; error: string; fueraDeVentana?: boolean };

export interface ConectorWhatsApp {
  readonly modo: ModoWhatsApp;
  enviar(envio: EnvioWhatsApp): Promise<ResultadoEnvio>;
}

// ---------------------------------------------------------------------------
// Simulado
// ---------------------------------------------------------------------------

/** No envía nada. El teléfono que termina en 0000 falla (para probar errores). */
export class ConectorSimulado implements ConectorWhatsApp {
  readonly modo = "simulado" as const;
  async enviar(envio: EnvioWhatsApp): Promise<ResultadoEnvio> {
    if (envio.para.endsWith("0000")) return { ok: false, error: "(simulado) Ese número no tiene WhatsApp" };
    return { ok: true, id: `sim_${randomUUID()}`, estado: "entregado" };
  }
}

// ---------------------------------------------------------------------------
// Directo (Meta Cloud API)
// ---------------------------------------------------------------------------

export type ConfigDirecto = { token: string; phoneNumberId: string; apiVersion?: string };

const CODIGO_FUERA_DE_VENTANA = 131047;

export class ConectorDirecto implements ConectorWhatsApp {
  readonly modo = "directo" as const;
  constructor(
    private readonly config: ConfigDirecto,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async enviar(envio: EnvioWhatsApp): Promise<ResultadoEnvio> {
    const cuerpo = envio.plantilla
      ? {
          messaging_product: "whatsapp",
          to: envio.para,
          type: "template",
          template: {
            name: envio.plantilla.nombre,
            language: { code: envio.plantilla.idioma ?? "es_MX" },
            components: envio.plantilla.variables?.length
              ? [{ type: "body", parameters: envio.plantilla.variables.map((text) => ({ type: "text", text })) }]
              : [],
          },
        }
      : { messaging_product: "whatsapp", to: envio.para, type: "text", text: { body: envio.texto.slice(0, 4096) } };
    try {
      const r = await this.fetchFn(`https://graph.facebook.com/${this.config.apiVersion ?? "v21.0"}/${this.config.phoneNumberId}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.config.token}`, "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(10_000),
      });
      const json = (await r.json().catch(() => null)) as { messages?: { id: string }[]; error?: { message?: string; code?: number } } | null;
      if (!r.ok || !json?.messages?.[0]?.id) {
        const codigo = json?.error?.code;
        return { ok: false, error: json?.error?.message ?? `Meta respondió ${r.status}`, fueraDeVentana: codigo === CODIGO_FUERA_DE_VENTANA };
      }
      return { ok: true, id: json.messages[0].id, estado: "enviado" };
    } catch (e) {
      return { ok: false, error: `No se pudo contactar a Meta: ${(e as Error).message}` };
    }
  }
}

/** Firma de Meta en X-Hub-Signature-256 ("sha256=<hmac del cuerpo con el app secret>"). */
export function verificarFirmaMeta(cuerpo: string | Buffer, cabecera: string | null, appSecret: string): boolean {
  const m = /^sha256=([0-9a-f]{64})$/.exec(cabecera ?? "");
  if (!m || !appSecret) return false;
  const esperado = Buffer.from(createHmac("sha256", appSecret).update(cuerpo).digest("hex"), "hex");
  const recibido = Buffer.from(m[1], "hex");
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

/** "5216141234567" (el 1 de celular de México) → "526141234567"; lo demás, en dígitos. */
function normalizar(tel: string): string {
  const d = tel.replace(/\D/g, "");
  return /^521\d{10}$/.test(d) ? `52${d.slice(3)}` : d;
}

const ESTADOS_META: Record<string, "enviado" | "entregado" | "leido" | "fallido"> = {
  sent: "enviado",
  delivered: "entregado",
  read: "leido",
  failed: "fallido",
};

type WebhookMeta = {
  object?: string;
  entry?: {
    changes?: {
      value?: {
        metadata?: { display_phone_number?: string };
        contacts?: { wa_id: string; profile?: { name?: string } }[];
        messages?: {
          from: string;
          id: string;
          type: string;
          text?: { body?: string };
          button?: { text?: string };
          interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
        }[];
        statuses?: { id: string; status: string; errors?: { message?: string; title?: string; code?: number }[] }[];
      };
    }[];
  }[];
};

/**
 * Convierte un webhook de Meta (modo directo) en eventos del protocolo Hub, para que
 * la app los procese igual que si vinieran del Hub. `mensaje_id` es el wamid.
 */
export function eventosDeMeta(payload: unknown): EventoHub[] {
  const p = payload as WebhookMeta;
  if (p?.object !== "whatsapp_business_account") return [];
  const fecha = new Date().toISOString();
  const eventos: EventoHub[] = [];
  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      const nombres = new Map((v.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? null]));
      for (const m of v.messages ?? []) {
        const texto = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? `[${m.type} no soportado]`;
        eventos.push({
          tipo: "mensaje.recibido",
          id: `meta_${m.id}`,
          fecha,
          datos: {
            mensaje_id: m.id,
            telefono: normalizar(m.from),
            texto,
            numero: v.metadata?.display_phone_number ? normalizar(v.metadata.display_phone_number) : null,
            nombre_perfil: nombres.get(m.from) ?? null,
          },
        });
      }
      for (const s of v.statuses ?? []) {
        const estado = ESTADOS_META[s.status];
        if (!estado) continue;
        const e = s.errors?.[0];
        eventos.push({
          tipo: "mensaje.estado",
          id: `meta_${s.id}_${s.status}`,
          fecha,
          datos: {
            mensaje_id: s.id,
            estado,
            error: e ? (e.message ?? e.title ?? `Error ${e.code}`) : null,
            clave_idempotencia: null,
            metadata: {},
          },
        });
      }
    }
  }
  return eventos;
}

// ---------------------------------------------------------------------------
// Hub
// ---------------------------------------------------------------------------

export class ConectorHub implements ConectorWhatsApp {
  readonly modo = "hub" as const;
  private readonly cliente: ClienteHub;
  constructor(config: { url: string; apiKey: string; fetch?: typeof fetch }) {
    this.cliente = new ClienteHub(config);
  }

  async enviar(envio: EnvioWhatsApp): Promise<ResultadoEnvio> {
    try {
      const m = envio.plantilla
        ? await this.cliente.enviarPlantilla({
            para: envio.para,
            plantilla: envio.plantilla.nombre,
            idioma: envio.plantilla.idioma,
            variables: envio.plantilla.variables,
            texto: envio.plantilla.texto,
            clave: envio.clave,
            metadata: envio.metadata,
          })
        : await this.cliente.enviarTexto({ para: envio.para, texto: envio.texto, clave: envio.clave, metadata: envio.metadata });
      if (m.estado === "fallido") return { ok: false, error: m.error ?? "Falló en el Hub" };
      return { ok: true, id: m.id, estado: m.estado === "entregado" || m.estado === "leido" ? "entregado" : "enviado" };
    } catch (e) {
      return { ok: false, error: e instanceof ErrorHub ? `Hub: ${e.message}` : `No se pudo contactar al Hub: ${(e as Error).message}` };
    }
  }
}

// ---------------------------------------------------------------------------
// Desde el entorno
// ---------------------------------------------------------------------------

export type EntornoWhatsApp = Record<string, string | undefined>;

/**
 * Conector según WHATSAPP_MODO. Si el modo pedido no tiene sus variables, cae en
 * simulado y lo dice en `aviso` (para mostrarlo en la app, nunca romperla).
 *   directo: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID (+ WHATSAPP_APP_SECRET y WHATSAPP_VERIFY_TOKEN para el webhook)
 *   hub:     HUB_URL, HUB_API_KEY (+ HUB_WEBHOOK_SECRETO para el webhook)
 */
export function conectorDesdeEntorno(env: EntornoWhatsApp = process.env): { conector: ConectorWhatsApp; aviso: string | null } {
  const modo = (env.WHATSAPP_MODO ?? "simulado").trim().toLowerCase();
  if (modo === "directo") {
    if (env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID) {
      return {
        conector: new ConectorDirecto({ token: env.WHATSAPP_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_ID, apiVersion: env.WHATSAPP_API_VERSION }),
        aviso: null,
      };
    }
    return { conector: new ConectorSimulado(), aviso: "WHATSAPP_MODO=directo pero faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_ID: se simula." };
  }
  if (modo === "hub") {
    if (env.HUB_URL && env.HUB_API_KEY) return { conector: new ConectorHub({ url: env.HUB_URL, apiKey: env.HUB_API_KEY }), aviso: null };
    return { conector: new ConectorSimulado(), aviso: "WHATSAPP_MODO=hub pero faltan HUB_URL o HUB_API_KEY: se simula." };
  }
  if (modo !== "simulado") return { conector: new ConectorSimulado(), aviso: `WHATSAPP_MODO="${modo}" no existe (simulado, directo o hub): se simula.` };
  return { conector: new ConectorSimulado(), aviso: null };
}

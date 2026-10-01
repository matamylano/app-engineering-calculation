// COPIA de matamylano/hub sdk/hub-cliente.ts — no editar aquí: se cambia en el repo del Hub y se vuelve a copiar.
/**
 * Cliente del Hub — protocolo Hub v1.
 *
 * UN SOLO ARCHIVO, SIN DEPENDENCIAS (solo node:crypto y fetch): se copia tal cual a
 * cada app que se conecta (agentsales, consultorios, las que vengan). El Hub usa
 * este mismo archivo para firmar, así que firma y verificación nunca se desfasan.
 *
 * Una app conectada:
 *   1. Manda mensajes con su clave:        new ClienteHub({ url, apiKey }).enviarTexto(…)
 *   2. Recibe eventos firmados en su webhook: leerEvento(cuerpo, cabecera, secreto)
 *   3. Expone su salud:                     GET /api/hub/salud → respuestaSalud(…)
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const VERSION_PROTOCOLO = "1";

/** Cabecera con la firma de cada evento: "t=<unix>,v1=<hmac sha256 hex>". */
export const CABECERA_FIRMA = "x-hub-firma";
/** Cabecera con el nombre del evento (también va en el cuerpo). */
export const CABECERA_EVENTO = "x-hub-evento";
/** Tolerancia por defecto entre el reloj del Hub y el de la app (evita reenvíos viejos). */
export const TOLERANCIA_FIRMA_SEG = 300;

// ---------------------------------------------------------------------------
// Tipos del contrato
// ---------------------------------------------------------------------------

export type EstadoMensaje = "pendiente" | "enviado" | "entregado" | "leido" | "fallido" | "recibido";

/** `texto`: la plantilla ya armada; el Hub la manda como texto donde no hay plantillas (sandbox de Zernio). */
export type Plantilla = { nombre: string; idioma?: string; variables?: string[]; texto?: string };

export type Mensaje = {
  id: string;
  direccion: "saliente" | "entrante";
  telefono: string;
  tipo: "texto" | "plantilla";
  texto: string | null;
  plantilla: Plantilla | null;
  estado: EstadoMensaje;
  proveedor: "simulado" | "meta";
  error: string | null;
  clave_idempotencia: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

/** Eventos que el Hub manda al webhook de la app. */
export type EventoHub =
  | {
      tipo: "mensaje.recibido";
      id: string;
      fecha: string;
      datos: { mensaje_id: string; telefono: string; texto: string; numero: string | null; nombre_perfil: string | null };
    }
  | {
      tipo: "mensaje.estado";
      id: string;
      fecha: string;
      datos: {
        mensaje_id: string;
        estado: EstadoMensaje;
        error: string | null;
        clave_idempotencia: string | null;
        metadata: Record<string, unknown>;
      };
    }
  | { tipo: "hub.prueba"; id: string; fecha: string; datos: { mensaje: string } };

export type TipoEvento = EventoHub["tipo"];

// ---------------------------------------------------------------------------
// Firma (HMAC sha256 sobre "<t>.<cuerpo>")
// ---------------------------------------------------------------------------

function hmac(secreto: string, texto: string): string {
  return createHmac("sha256", secreto).update(texto).digest("hex");
}

/** Cabecera de firma para `cuerpo` (el texto exacto que se manda). */
export function firmar(cuerpo: string, secreto: string, t: number = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v1=${hmac(secreto, `${t}.${cuerpo}`)}`;
}

/**
 * ¿La firma es del Hub y reciente? Compara en tiempo constante y rechaza firmas
 * con más de `toleranciaSeg` de diferencia (reenvíos viejos).
 */
export function verificarFirma(
  cuerpo: string,
  cabecera: string | null | undefined,
  secreto: string,
  { toleranciaSeg = TOLERANCIA_FIRMA_SEG, ahora = Date.now() }: { toleranciaSeg?: number; ahora?: number } = {},
): boolean {
  if (!cabecera || !secreto) return false;
  const partes = Object.fromEntries(
    cabecera.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(partes.t);
  const v1 = partes.v1;
  if (!Number.isInteger(t) || !v1 || !/^[0-9a-f]{64}$/.test(v1)) return false;
  if (Math.abs(ahora / 1000 - t) > toleranciaSeg) return false;
  const esperado = Buffer.from(hmac(secreto, `${t}.${cuerpo}`), "hex");
  const recibido = Buffer.from(v1, "hex");
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

export class FirmaInvalidaError extends Error {
  constructor() {
    super("Firma del Hub inválida o vencida");
    this.name = "FirmaInvalidaError";
  }
}

/**
 * Para el webhook de la app: verifica la firma y devuelve el evento.
 * Lanza FirmaInvalidaError si no es del Hub (responde 401 en ese caso).
 *
 *   const cuerpo = await request.text();
 *   const evento = leerEvento(cuerpo, request.headers.get(CABECERA_FIRMA), process.env.HUB_WEBHOOK_SECRETO!);
 */
export function leerEvento(cuerpo: string, cabecera: string | null | undefined, secreto: string, opciones?: { ahora?: number }): EventoHub {
  if (!verificarFirma(cuerpo, cabecera, secreto, opciones)) throw new FirmaInvalidaError();
  return JSON.parse(cuerpo) as EventoHub;
}

// ---------------------------------------------------------------------------
// Salud (GET /api/hub/salud de cada app)
// ---------------------------------------------------------------------------

export type Salud = {
  ok: boolean;
  /** Commit o versión desplegada (en Vercel: process.env.VERCEL_GIT_COMMIT_SHA). */
  version?: string | null;
  /** Estado de cada dependencia: { base_de_datos: true, … }. */
  detalles?: Record<string, boolean>;
};

/** Respuesta estándar de salud: 200 si todo bien, 503 si algo falla. */
export function respuestaSalud(salud: Salud): Response {
  return new Response(JSON.stringify({ protocolo: VERSION_PROTOCOLO, ...salud }), {
    status: salud.ok ? 200 : 503,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// ---------------------------------------------------------------------------
// Cliente para mandar mensajes
// ---------------------------------------------------------------------------

export class ErrorHub extends Error {
  constructor(
    mensaje: string,
    readonly status: number,
    readonly codigo: string | null,
  ) {
    super(mensaje);
    this.name = "ErrorHub";
  }
}

type Comunes = {
  /** Teléfono con lada de país o 10 dígitos de México ("614 123 4567" → 526141234567). */
  para: string;
  /** Misma clave = mismo mensaje: reintentar no duplica (p. ej. "cita-<id>:24h"). */
  clave?: string;
  /** Vuelve tal cual en los eventos mensaje.estado. */
  metadata?: Record<string, unknown>;
};

export class ClienteHub {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor({ url, apiKey, fetch: f, timeoutMs = 10_000 }: { url: string; apiKey: string; fetch?: typeof fetch; timeoutMs?: number }) {
    this.url = url.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.fetchFn = f ?? fetch;
    this.timeoutMs = timeoutMs;
  }

  /** Texto libre: solo llega si el contacto escribió en las últimas 24 h (regla de WhatsApp). */
  enviarTexto(datos: Comunes & { texto: string }): Promise<Mensaje> {
    return this.pedir("POST", "/api/v1/mensajes", { para: datos.para, texto: datos.texto, clave: datos.clave, metadata: datos.metadata });
  }

  /**
   * Plantilla aprobada: la única forma de escribir primero (recordatorios, aperturas).
   * `texto` (opcional) es la plantilla ya armada: el Hub la manda como texto donde no
   * hay plantillas, como en la sandbox de Zernio.
   */
  enviarPlantilla(datos: Comunes & { plantilla: string; idioma?: string; variables?: string[]; texto?: string }): Promise<Mensaje> {
    return this.pedir("POST", "/api/v1/mensajes", {
      para: datos.para,
      plantilla: { nombre: datos.plantilla, idioma: datos.idioma, variables: datos.variables ?? [], texto: datos.texto },
      clave: datos.clave,
      metadata: datos.metadata,
    });
  }

  obtenerMensaje(id: string): Promise<Mensaje> {
    return this.pedir("GET", `/api/v1/mensajes/${encodeURIComponent(id)}`);
  }

  private async pedir<T>(metodo: "GET" | "POST", ruta: string, cuerpo?: unknown): Promise<T> {
    const r = await this.fetchFn(`${this.url}${ruta}`, {
      method: metodo,
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const datos = (await r.json().catch(() => null)) as { error?: { mensaje?: string; codigo?: string } } | null;
    if (!r.ok) throw new ErrorHub(datos?.error?.mensaje ?? `El Hub respondió ${r.status}`, r.status, datos?.error?.codigo ?? null);
    return datos as T;
  }
}

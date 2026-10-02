/**
 * Envío de prospectos al agente de ventas (matamylano/agentsales) por su API
 * POST /api/leads. El agente los contacta por WhatsApp a través del Hub.
 *
 * Variables: AGENTSALES_URL, AGENTSALES_API_KEY (su ADMIN_API_KEY) y
 * AGENTSALES_TENANT_ID. Sin ellas, el envío se simula y solo se registra.
 * Solo se usa en el servidor.
 */

export type InteresVenta = "firma" | "creditos" | "estudio";

export interface Prospecto {
  /** Teléfono mexicano de 10 dígitos. */
  telefono: string;
  nombre?: string;
  ciudad?: string;
  interes: InteresVenta;
  /** Estudio de la suite desde el que llegó (por ejemplo "suelos"). */
  estudio?: string;
}

export type ResultadoProspecto =
  | { ok: true; simulado: boolean; duplicado?: boolean }
  | { ok: false; error: string };

export function agenteVentasConfigurado(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.AGENTSALES_URL && env.AGENTSALES_API_KEY && env.AGENTSALES_TENANT_ID);
}

/** Deja solo dígitos y quita la lada 52 si viene. */
export function normalizarTelefono(telefono: string) {
  const digitos = telefono.replace(/\D/g, "");
  return digitos.length === 12 && digitos.startsWith("52") ? digitos.slice(2) : digitos;
}

export function validarProspecto(p: Prospecto): string | null {
  if (!/^\d{10}$/.test(normalizarTelefono(p.telefono))) return "Escribe un número mexicano de 10 dígitos.";
  if (!["firma", "creditos", "estudio"].includes(p.interes)) return "Interés no válido.";
  if (p.nombre && p.nombre.length > 100) return "El nombre es demasiado largo.";
  if (p.ciudad && p.ciudad.length > 100) return "La ciudad es demasiado larga.";
  return null;
}

export async function enviarProspecto(
  p: Prospecto,
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): Promise<ResultadoProspecto> {
  const error = validarProspecto(p);
  if (error) return { ok: false, error };
  const telefono = normalizarTelefono(p.telefono);

  if (!agenteVentasConfigurado(env)) {
    console.info("ventas.prospecto.simulado", { interes: p.interes, estudio: p.estudio });
    return { ok: true, simulado: true };
  }

  const res = await fetcher(new URL("/api/leads", env.AGENTSALES_URL).toString(), {
    method: "POST",
    headers: { authorization: `Bearer ${env.AGENTSALES_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      tenant_id: env.AGENTSALES_TENANT_ID,
      telefono,
      nombre: p.nombre || null,
      ciudad: p.ciudad || null,
      especialidad: p.estudio ?? null,
      fuente: "suite-ingenieria",
      datos_extra: { interes: p.interes },
      opt_in: true,
    }),
  });
  if (res.status === 201) return { ok: true, simulado: false };
  // 409: ese teléfono ya es prospecto del tenant; para el usuario es éxito.
  if (res.status === 409) return { ok: true, simulado: false, duplicado: true };
  return { ok: false, error: `El agente de ventas respondió ${res.status}.` };
}

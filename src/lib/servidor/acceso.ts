import { createHash } from "node:crypto";
import { CODIGO_DEMO, modoDemo, type Entorno } from "./config";
import type { Usuario } from "./tipos";

/**
 * Entrada con código por correo (Supabase Auth, OTP de 6 dígitos). La
 * plantilla «Magic Link» de Supabase debe incluir {{ .Token }}.
 * En modo demostración no se manda correo y el código es CODIGO_DEMO.
 */

export const normalizarEmail = (email: string) => email.trim().toLowerCase();

export function emailValido(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Id estable con forma de UUID para las cuentas de demostración. */
export function idDemo(email: string) {
  const h = createHash("sha256").update(`demo:${email}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

async function auth(ruta: string, cuerpo: unknown, env: Entorno, fetcher: typeof fetch) {
  return fetcher(`${env.SUPABASE_URL!.replace(/\/$/, "")}/auth/v1/${ruta}`, {
    method: "POST",
    cache: "no-store",
    headers: { apikey: env.SUPABASE_ANON_KEY!, "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

export async function pedirCodigo(
  emailCrudo: string,
  env: Entorno = process.env,
  fetcher: typeof fetch = fetch,
): Promise<Resultado<{ demo: boolean }>> {
  const email = normalizarEmail(emailCrudo);
  if (!emailValido(email)) return { ok: false, error: "Escribe un correo válido." };
  if (modoDemo(env)) return { ok: true, valor: { demo: true } };
  const res = await auth("otp", { email, create_user: true }, env, fetcher);
  if (res.status === 429) return { ok: false, error: "Ya te mandamos un código. Espera un minuto antes de pedir otro." };
  if (!res.ok) {
    console.error("acceso.otp", res.status, await res.text().catch(() => ""));
    return { ok: false, error: "No pudimos mandar el código. Intenta de nuevo." };
  }
  return { ok: true, valor: { demo: false } };
}

export async function verificarCodigo(
  emailCrudo: string,
  codigoCrudo: string,
  env: Entorno = process.env,
  fetcher: typeof fetch = fetch,
): Promise<Resultado<Usuario>> {
  const email = normalizarEmail(emailCrudo);
  const codigo = codigoCrudo.replace(/\s/g, "");
  if (!emailValido(email) || !/^\d{6}$/.test(codigo)) return { ok: false, error: "Escribe el código de 6 dígitos." };

  if (modoDemo(env)) {
    return codigo === CODIGO_DEMO
      ? { ok: true, valor: { id: idDemo(email), email } }
      : { ok: false, error: "Código incorrecto." };
  }

  const res = await auth("verify", { type: "email", email, token: codigo }, env, fetcher);
  if (!res.ok) return { ok: false, error: "Código incorrecto o vencido." };
  const datos = (await res.json()) as { user?: { id?: string; email?: string } };
  if (!datos.user?.id) return { ok: false, error: "No pudimos verificar tu cuenta." };
  return { ok: true, valor: { id: datos.user.id, email: normalizarEmail(datos.user.email ?? email) } };
}

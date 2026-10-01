import { createHmac, timingSafeEqual } from "node:crypto";
import type { Usuario } from "./tipos";

/** Duración de la sesión: 30 días. */
export const DURACION_SESION_S = 30 * 24 * 60 * 60;

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const firmar = (datos: string, secreto: string) => createHmac("sha256", secreto).update(datos).digest("base64url");

/** Token de sesión firmado: base64url(json).firma */
export function crearToken(u: Usuario, secreto: string, ahora = Date.now()) {
  const datos = b64(JSON.stringify({ id: u.id, email: u.email, exp: Math.floor(ahora / 1000) + DURACION_SESION_S }));
  return `${datos}.${firmar(datos, secreto)}`;
}

export function leerToken(token: string | undefined, secreto: string, ahora = Date.now()): Usuario | null {
  if (!token) return null;
  const [datos, firma, ...resto] = token.split(".");
  if (!datos || !firma || resto.length > 0) return null;
  const esperada = Buffer.from(firmar(datos, secreto));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  try {
    const p = JSON.parse(Buffer.from(datos, "base64url").toString()) as { id?: unknown; email?: unknown; exp?: unknown };
    if (typeof p.id !== "string" || typeof p.email !== "string" || typeof p.exp !== "number") return null;
    if (p.exp * 1000 <= ahora) return null;
    return { id: p.id, email: p.email };
  } catch {
    return null;
  }
}

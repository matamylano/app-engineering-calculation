import { conectorDesdeEntorno, type ConectorWhatsApp } from "./whatsapp-conector";

/**
 * WhatsApp de la app según WHATSAPP_MODO (simulado · directo · hub). Sin
 * variables, todo se simula. Ver docs/whatsapp-y-ventas.md.
 * Solo se usa en el servidor (rutas de API).
 */
let cache: { conector: ConectorWhatsApp; aviso: string | null } | undefined;

export function whatsapp() {
  cache ??= conectorDesdeEntorno(process.env);
  return cache;
}

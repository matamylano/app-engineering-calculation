import { AlmacenDemo } from "./almacen-demo";
import { AlmacenSupabase } from "./almacen-supabase";
import type { Almacen } from "./tipos";

export type Entorno = Record<string, string | undefined>;

/**
 * Sin Supabase la app corre en modo demostración: cuentas y memorias viven en
 * la memoria del servidor, el código de acceso es fijo y los pagos se simulan.
 */
export const supabaseConfigurado = (env: Entorno = process.env) =>
  Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY);

export const stripeConfigurado = (env: Entorno = process.env) =>
  Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);

export const modoDemo = (env: Entorno = process.env) => !supabaseConfigurado(env);

/** Código que acepta el modo demostración para entrar. */
export const CODIGO_DEMO = "123456";

const SECRETO_DEMO = "solo-para-modo-demostracion-no-usar-en-produccion";

export function secretoSesion(env: Entorno = process.env) {
  if (env.SESION_SECRETO && env.SESION_SECRETO.length >= 32) return env.SESION_SECRETO;
  if (modoDemo(env)) return SECRETO_DEMO;
  throw new Error("Falta SESION_SECRETO (32 caracteres o más).");
}

/** Correos que pueden entrar al panel de firma (separados por coma). */
export function esFirmante(email: string, env: Entorno = process.env) {
  const lista = (env.FIRMANTES ?? (modoDemo(env) ? "firmante@demo.mx" : ""))
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.toLowerCase());
}

/** URL pública de la app, para los regresos de Stripe. */
export function urlApp(env: Entorno = process.env) {
  return (env.APP_URL ?? (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
}

const global = globalThis as unknown as { __almacenDemo?: AlmacenDemo };

export function almacen(env: Entorno = process.env): Almacen {
  if (supabaseConfigurado(env)) {
    return new AlmacenSupabase(env.SUPABASE_URL!.replace(/\/$/, ""), env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  global.__almacenDemo ??= new AlmacenDemo();
  return global.__almacenDemo;
}

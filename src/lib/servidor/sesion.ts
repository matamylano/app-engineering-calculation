import { cookies } from "next/headers";
import { esFirmante, secretoSesion, urlApp } from "./config";
import { crearToken, DURACION_SESION_S, leerToken } from "./token";
import type { Usuario } from "./tipos";

const COOKIE = "sesion";

export interface Sesion extends Usuario {
  firmante: boolean;
}

/** Usuario de la cookie de sesión, o null si no ha entrado. */
export async function sesionActual(): Promise<Sesion | null> {
  const u = leerToken((await cookies()).get(COOKIE)?.value, secretoSesion());
  return u ? { ...u, firmante: esFirmante(u.email) } : null;
}

/** Solo en Server Actions o Route Handlers. */
export async function abrirSesion(u: Usuario) {
  (await cookies()).set(COOKIE, crearToken(u, secretoSesion()), {
    httpOnly: true,
    // Segura cuando la app se sirve por https; así también entra en Docker por http.
    secure: urlApp().startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_S,
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}

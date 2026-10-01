"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerFormulario } from "@/lib/estudios/suelos";
import { pedirCodigo, verificarCodigo } from "@/lib/servidor/acceso";
import { avisarMemoriaPorRevisar, avisarResultadoRevision } from "@/lib/servidor/avisos";
import { almacen, modoDemo, stripeConfigurado } from "@/lib/servidor/config";
import {
  actualizarMemoria,
  aprobarMemoria,
  generarMemoria,
  guardarTelefonoAviso,
  rechazarMemoria,
  reenviarARevision,
} from "@/lib/servidor/memorias";
import { guardarPerfil } from "@/lib/servidor/firmante";
import { aplicarPago, iniciarCompra, type Compra } from "@/lib/servidor/pagos";
import { abrirSesion, cerrarSesion, sesionActual } from "@/lib/servidor/sesion";

/**
 * Server Actions de la suite. Cada una revisa la sesión por su cuenta: se
 * pueden llamar con un POST directo, no solo desde la interfaz.
 */

export interface EstadoForm {
  error?: string;
  aviso?: string;
  paso?: "correo" | "codigo";
  email?: string;
}

const texto = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

/** Solo rutas internas, para no redirigir a otro sitio. */
const destinoSeguro = (s: string) => (s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/cuenta");

// ---------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------

export async function accionPedirCodigo(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const email = texto(fd, "email");
  const r = await pedirCodigo(email);
  if (!r.ok) return { paso: "correo", error: r.error, email };
  return {
    paso: "codigo",
    email: email.trim().toLowerCase(),
    aviso: r.valor.demo
      ? "Modo demostración: no se manda correo. El código es 123456."
      : "Te mandamos un código de 6 dígitos a tu correo.",
  };
}

export async function accionVerificarCodigo(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const email = texto(fd, "email");
  const r = await verificarCodigo(email, texto(fd, "codigo"));
  if (!r.ok) return { paso: "codigo", email, error: r.error };
  await almacen().asegurarUsuario(r.valor);
  await abrirSesion(r.valor);
  redirect(destinoSeguro(texto(fd, "siguiente")));
}

export async function accionSalir() {
  await cerrarSesion();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Memorias del cliente
// ---------------------------------------------------------------------------

export type RespuestaMemoria = { ok: true; folio: string } | { ok: false; error: string; entrar?: boolean };

/** Genera (1 crédito) o corrige (gratis) la memoria del estudio de suelos. */
export async function accionGuardarMemoria(formularioCrudo: unknown, folio?: string): Promise<RespuestaMemoria> {
  const sesion = await sesionActual();
  if (!sesion) return { ok: false, entrar: true, error: "Entra con tu correo para generar la memoria." };
  const formulario = leerFormulario(formularioCrudo);
  if (!formulario) return { ok: false, error: "Los datos del formulario no son válidos." };
  const alm = almacen();
  const r = folio
    ? await actualizarMemoria(alm, sesion, folio, formulario)
    : await generarMemoria(alm, sesion, formulario);
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  return { ok: true, folio: r.valor.folio };
}

export async function accionComprar(fd: FormData) {
  const sesion = await sesionActual();
  const compra: Compra =
    texto(fd, "tipo") === "firma"
      ? { tipo: "firma", folio: texto(fd, "folio") }
      : { tipo: "creditos", paquete: texto(fd, "paquete") };
  const regreso = compra.tipo === "firma" ? `/memorias/${compra.folio}` : "/cuenta";
  if (!sesion) redirect(`/entrar?siguiente=${encodeURIComponent(regreso)}`);
  const r = await iniciarCompra(almacen(), sesion, compra);
  if (!r.ok) redirect(`${regreso}?error=${encodeURIComponent(r.error)}`);
  redirect(r.valor);
}

export async function accionTelefonoAviso(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const sesion = await sesionActual();
  if (!sesion) return { error: "Tu sesión terminó. Vuelve a entrar." };
  const r = await guardarTelefonoAviso(almacen(), sesion, texto(fd, "folio"), texto(fd, "telefono"));
  if (!r.ok) return { error: r.error };
  revalidatePath(`/memorias/${r.valor.folio}`);
  return { aviso: r.valor.telefonoAviso ? "Listo, te avisamos por WhatsApp." : "Quitamos el aviso por WhatsApp." };
}

export async function accionReenviar(fd: FormData) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");
  const folio = texto(fd, "folio");
  const r = await reenviarARevision(almacen(), sesion, folio);
  if (!r.ok) redirect(`/memorias/${folio}?error=${encodeURIComponent(r.error)}`);
  await avisarMemoriaPorRevisar(r.valor);
  revalidatePath(`/memorias/${folio}`);
  redirect(`/memorias/${folio}`);
}

/** Confirma un pago simulado. Solo existe en modo demostración. */
export async function accionPagoDemo(fd: FormData) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");
  if (!modoDemo() || stripeConfigurado()) redirect("/cuenta");
  const tipo = texto(fd, "tipo") === "firma" ? "firma" : "creditos";
  const folio = texto(fd, "folio") || undefined;
  const r = await aplicarPago(almacen(), {
    id: `demo_${crypto.randomUUID()}`,
    usuarioId: sesion.id,
    tipo,
    montoCentavos: Number(texto(fd, "centavos")) || 0,
    moneda: "mxn",
    paquete: texto(fd, "paquete") || undefined,
    folio,
  });
  const regreso = tipo === "firma" && folio ? `/memorias/${folio}` : "/cuenta";
  if (!r.ok) redirect(`${regreso}?error=${encodeURIComponent(r.error)}`);
  if (r.valor.memoriaEnRevision) await avisarMemoriaPorRevisar(r.valor.memoriaEnRevision);
  revalidatePath("/", "layout");
  redirect(`${regreso}?pago=ok`);
}

// ---------------------------------------------------------------------------
// Panel de firma
// ---------------------------------------------------------------------------

export async function accionAprobar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const sesion = await sesionActual();
  if (!sesion?.firmante) return { error: "Solo el ingeniero firmante puede aprobar." };
  if (fd.get("confirmo") !== "si") return { error: "Confirma que revisaste la memoria completa." };
  const alm = almacen();
  const datos = { nombre: texto(fd, "nombre"), cedula: texto(fd, "cedula"), registro: texto(fd, "registro") };
  const r = await aprobarMemoria(alm, sesion, texto(fd, "folio"), datos);
  if (!r.ok) return { error: r.error };
  // Recuerda sus datos para la siguiente; conserva su firma y sello.
  await guardarPerfil(alm, sesion, datos);
  await avisarResultadoRevision(r.valor);
  revalidatePath("/firma");
  redirect(`/firma?aprobada=${r.valor.folio}`);
}

export async function accionRechazar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const sesion = await sesionActual();
  if (!sesion?.firmante) return { error: "Solo el ingeniero firmante puede pedir cambios." };
  const r = await rechazarMemoria(almacen(), texto(fd, "folio"), texto(fd, "notas"));
  if (!r.ok) return { error: r.error };
  await avisarResultadoRevision(r.valor);
  revalidatePath("/firma");
  redirect(`/firma?rechazada=${r.valor.folio}`);
}

async function bytes(fd: FormData, k: string) {
  const v = fd.get(k);
  return v instanceof File && v.size > 0 ? new Uint8Array(await v.arrayBuffer()) : undefined;
}

export async function accionPerfilFirmante(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const sesion = await sesionActual();
  if (!sesion?.firmante) return { error: "Solo el ingeniero firmante puede cambiar su perfil." };
  const r = await guardarPerfil(almacen(), sesion, {
    nombre: texto(fd, "nombre"),
    cedula: texto(fd, "cedula"),
    registro: texto(fd, "registro"),
    firma: await bytes(fd, "firma"),
    sello: await bytes(fd, "sello"),
    quitarFirma: fd.get("quitarFirma") === "si",
    quitarSello: fd.get("quitarSello") === "si",
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/firma/perfil");
  return { aviso: "Guardamos tu perfil. Tu firma y sello se pondrán en las memorias que apruebes." };
}

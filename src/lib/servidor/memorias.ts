import { createHash, randomBytes } from "node:crypto";
import { runSoilStudy } from "@/calc/soils/study";
import { entradaDesdeFormulario, unitsOf, type FormularioSuelos } from "@/lib/estudios/suelos";
import { normalizarTelefono } from "@/lib/ventas/agentsales";
import type { Almacen, DatosFirmante, DatosMemoria, FirmaMemoria, RegistroMemoria, Usuario } from "./tipos";

/**
 * Reglas de las memorias: generar (gasta un crédito), corregir, mandar a
 * firma, aprobar o rechazar. No confía en nada de lo que calcula el navegador.
 */

export type Resultado<T = RegistroMemoria> = { ok: true; valor: T } | { ok: false; error: string };

const falla = (error: string) => ({ ok: false as const, error });

/** Folio con la fecha de México: SUE-AAAAMMDD-XXXXXX. */
export function nuevoFolio(fecha = new Date()) {
  const ymd = fecha.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }).replace(/-/g, "");
  return `SUE-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export const FOLIO_VALIDO = /^SUE-\d{8}-[0-9A-F]{4,6}$/;

/** Recalcula en el servidor. Error si alguna parte del estudio no cierra. */
export function calcular(formulario: FormularioSuelos): Resultado<DatosMemoria> {
  const entrada = entradaDesdeFormulario(formulario);
  const resultado = runSoilStudy(entrada);
  const errores = [resultado.sucs, resultado.bearing, resultado.settlement].flatMap((r) => (r.ok ? [] : [r.error]));
  if (errores.length) return falla(`Corrige los datos del estudio: ${errores[0]}`);
  return {
    ok: true,
    valor: { formulario, proyecto: formulario.project, unidades: unitsOf(formulario), entrada, resultado },
  };
}

export async function generarMemoria(
  alm: Almacen,
  usuario: Usuario,
  formulario: FormularioSuelos,
  ahora = new Date(),
): Promise<Resultado> {
  const datos = calcular(formulario);
  if (!datos.ok) return datos;
  const fecha = ahora.toISOString();
  const memoria: RegistroMemoria = {
    folio: nuevoFolio(ahora),
    usuarioId: usuario.id,
    estudio: "suelos",
    estado: "borrador",
    version: 1,
    creadaEn: fecha,
    actualizadaEn: fecha,
    datos: datos.valor,
    firmaPagada: false,
  };
  const r = await alm.crearMemoriaConCredito(memoria);
  if (r === "sin-creditos") return falla("Ya no tienes créditos. Compra un paquete para generar más memorias.");
  return { ok: true, valor: memoria };
}

async function propia(alm: Almacen, usuario: Usuario, folio: string): Promise<Resultado> {
  const m = FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
  if (!m || m.usuarioId !== usuario.id) return falla("No encontramos esa memoria.");
  return { ok: true, valor: m };
}

async function guardar(alm: Almacen, m: RegistroMemoria, cambios: Partial<RegistroMemoria>, ahora: Date) {
  const nueva: RegistroMemoria = { ...m, ...cambios, version: m.version + 1, actualizadaEn: ahora.toISOString() };
  const ok = await alm.guardarMemoria(nueva, m.version);
  return ok ? { ok: true as const, valor: nueva } : falla("La memoria cambió mientras la editabas. Recarga la página.");
}

/** Corregir los datos no gasta otro crédito. Solo antes de la revisión o si la rechazaron. */
export async function actualizarMemoria(
  alm: Almacen,
  usuario: Usuario,
  folio: string,
  formulario: FormularioSuelos,
  ahora = new Date(),
): Promise<Resultado> {
  const m = await propia(alm, usuario, folio);
  if (!m.ok) return m;
  if (m.valor.estado === "en_revision") return falla("La memoria está en revisión; espera la respuesta del ingeniero.");
  if (m.valor.estado === "aprobada") return falla("La memoria ya está firmada y no se puede cambiar.");
  const datos = calcular(formulario);
  if (!datos.ok) return datos;
  return guardar(alm, m.valor, { datos: datos.valor }, ahora);
}

/** Después del pago de la firma: pasa a revisión. Idempotente. */
export async function marcarFirmaPagada(alm: Almacen, folio: string, ahora = new Date()): Promise<Resultado> {
  const m = await alm.memoria(folio);
  if (!m) return falla(`No existe la memoria ${folio}`);
  if (m.firmaPagada) return { ok: true, valor: m };
  return guardar(alm, m, { firmaPagada: true, estado: m.estado === "borrador" ? "en_revision" : m.estado }, ahora);
}

/** Guarda el WhatsApp para avisar cuando la firmen. */
export async function guardarTelefonoAviso(
  alm: Almacen,
  usuario: Usuario,
  folio: string,
  telefono: string,
  ahora = new Date(),
): Promise<Resultado> {
  const m = await propia(alm, usuario, folio);
  if (!m.ok) return m;
  const t = normalizarTelefono(telefono);
  if (t !== "" && !/^\d{10}$/.test(t)) return falla("Escribe un número de 10 dígitos.");
  return guardar(alm, m.valor, { telefonoAviso: t || undefined }, ahora);
}

/** Una memoria rechazada y ya pagada vuelve a revisión sin pagar otra vez. */
export async function reenviarARevision(alm: Almacen, usuario: Usuario, folio: string, ahora = new Date()) {
  const m = await propia(alm, usuario, folio);
  if (!m.ok) return m;
  if (m.valor.estado !== "rechazada" || !m.valor.firmaPagada) return falla("Esta memoria no está para reenviarse.");
  return guardar(alm, m.valor, { estado: "en_revision" }, ahora);
}

/** JSON con las llaves ordenadas, para que la huella no dependa del orden. */
export function jsonEstable(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(jsonEstable).join(",")}]`;
  if (x && typeof x === "object") {
    return `{${Object.keys(x)
      .filter((k) => (x as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${jsonEstable((x as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(x);
}

export function huellaMemoria(m: RegistroMemoria, firmante: Omit<FirmaMemoria, "huella">) {
  const contenido = { folio: m.folio, version: m.version, estudio: m.estudio, datos: m.datos, firmante };
  return createHash("sha256").update(jsonEstable(contenido)).digest("hex");
}

export function validarFirmante(d: DatosFirmante): string | null {
  if (!d.nombre.trim() || !d.cedula.trim() || !d.registro.trim()) {
    return "Escribe nombre, cédula profesional y registro.";
  }
  if (d.nombre.length > 120 || d.cedula.length > 40 || d.registro.length > 120) return "Algún dato es demasiado largo.";
  return null;
}

/** El ingeniero aprueba: la memoria se congela con su firma y su huella. */
export async function aprobarMemoria(
  alm: Almacen,
  firmante: Usuario,
  folio: string,
  datos: DatosFirmante,
  ahora = new Date(),
): Promise<Resultado> {
  const error = validarFirmante(datos);
  if (error) return falla(error);
  const m = FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
  if (!m) return falla("No encontramos esa memoria.");
  if (m.estado !== "en_revision") return falla("Esa memoria no está en revisión.");
  const versionFinal = m.version + 1;
  // La firma y el sello guardados en su perfil se copian a la memoria congelada.
  const perfil = await alm.perfilFirmante(firmante.id);
  const base = {
    nombre: datos.nombre.trim(),
    cedula: datos.cedula.trim(),
    registro: datos.registro.trim(),
    firmaImagen: perfil?.firmaImagen,
    selloImagen: perfil?.selloImagen,
    firmanteId: firmante.id,
    aprobadaEn: ahora.toISOString(),
  };
  const huella = huellaMemoria({ ...m, version: versionFinal }, base);
  return guardar(alm, m, { estado: "aprobada", notasRevision: undefined, firma: { ...base, huella } }, ahora);
}

export async function rechazarMemoria(
  alm: Almacen,
  folio: string,
  notas: string,
  ahora = new Date(),
): Promise<Resultado> {
  const texto = notas.trim();
  if (!texto) return falla("Escribe qué hay que corregir.");
  if (texto.length > 2000) return falla("Las notas son demasiado largas.");
  const m = FOLIO_VALIDO.test(folio) ? await alm.memoria(folio) : null;
  if (!m) return falla("No encontramos esa memoria.");
  if (m.estado !== "en_revision") return falla("Esa memoria no está en revisión.");
  return guardar(alm, m, { estado: "rechazada", notasRevision: texto }, ahora);
}

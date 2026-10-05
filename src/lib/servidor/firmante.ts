import type { Almacen, DatosFirmante, PerfilFirmante, Usuario } from "./tipos";
import { validarFirmante } from "./memorias";

/** Tamaño máximo de cada imagen (firma o sello), en bytes. */
export const MAX_IMAGEN = 250_000;

const FIRMAS: { tipo: string; inicio: number[] }[] = [
  { tipo: "image/png", inicio: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { tipo: "image/jpeg", inicio: [0xff, 0xd8, 0xff] },
];

/**
 * Convierte los bytes de una imagen en data URL. Revisa el tipo por los
 * primeros bytes, no por la extensión ni lo que diga el navegador.
 */
export function imagenDataUrl(bytes: Uint8Array): { ok: true; valor: string } | { ok: false; error: string } {
  if (bytes.length > MAX_IMAGEN) return { ok: false, error: "Cada imagen debe pesar menos de 250 KB." };
  const f = FIRMAS.find((x) => x.inicio.every((b, i) => bytes[i] === b));
  if (!f) return { ok: false, error: "Sube la imagen en PNG o JPG." };
  return { ok: true, valor: `data:${f.tipo};base64,${Buffer.from(bytes).toString("base64")}` };
}

export interface CambiosPerfil extends DatosFirmante {
  /** Bytes de una imagen nueva; sin ellos se queda la anterior. */
  firma?: Uint8Array;
  sello?: Uint8Array;
  quitarFirma?: boolean;
  quitarSello?: boolean;
}

export async function guardarPerfil(
  alm: Almacen,
  firmante: Usuario,
  c: CambiosPerfil,
): Promise<{ ok: true; valor: PerfilFirmante } | { ok: false; error: string }> {
  const error = validarFirmante(c);
  if (error) return { ok: false, error };
  const anterior = await alm.perfilFirmante(firmante.id);
  const imagen = (nueva: Uint8Array | undefined, quitar: boolean | undefined, actual: string | undefined) => {
    if (nueva && nueva.length > 0) return imagenDataUrl(nueva);
    return { ok: true as const, valor: quitar ? undefined : actual };
  };
  const firma = imagen(c.firma, c.quitarFirma, anterior?.firmaImagen);
  if (!firma.ok) return firma;
  const sello = imagen(c.sello, c.quitarSello, anterior?.selloImagen);
  if (!sello.ok) return sello;
  const perfil: PerfilFirmante = {
    nombre: c.nombre.trim(),
    cedula: c.cedula.trim(),
    registro: c.registro.trim(),
    firmaImagen: firma.valor,
    selloImagen: sello.valor,
  };
  await alm.guardarPerfilFirmante(firmante.id, perfil);
  return { ok: true, valor: perfil };
}

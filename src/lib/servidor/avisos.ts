import { whatsapp } from "@/lib/whatsapp";
import { urlApp } from "./config";
import type { RegistroMemoria } from "./tipos";

/**
 * Avisos por WhatsApp a través del Hub. Si fallan, solo se registran: un
 * aviso nunca detiene un pago ni una firma.
 */

const conLada = (tel: string) => (tel.length === 10 ? `52${tel}` : tel);

async function enviar(para: string, texto: string, clave: string) {
  try {
    const r = await whatsapp().conector.enviar({ para: conLada(para), texto, clave });
    if (!r.ok) console.warn("avisos.whatsapp", clave, r.error);
  } catch (e) {
    console.error("avisos.whatsapp", clave, e);
  }
}

/** Al ingeniero: hay una memoria nueva por revisar. Teléfono en AVISO_FIRMA_TELEFONO. */
export async function avisarMemoriaPorRevisar(m: RegistroMemoria) {
  const tel = process.env.AVISO_FIRMA_TELEFONO;
  if (!tel) return;
  await enviar(
    tel.replace(/\D/g, ""),
    `Hay una memoria por revisar: ${m.folio} (${m.datos.proyecto.obra || "sin nombre de obra"}). ${urlApp()}/firma/${m.folio}`,
    `revision:${m.folio}:${m.version}`,
  );
}

/** Al cliente: su memoria se aprobó o se rechazó. */
export async function avisarResultadoRevision(m: RegistroMemoria) {
  if (!m.telefonoAviso) return;
  const texto =
    m.estado === "aprobada"
      ? `Tu memoria ${m.folio} ya está firmada. Descárgala aquí: ${urlApp()}/memorias/${m.folio}`
      : `El ingeniero pidió cambios en tu memoria ${m.folio}. Revisa sus notas: ${urlApp()}/memorias/${m.folio}`;
  await enviar(m.telefonoAviso, texto, `resultado:${m.folio}:${m.version}`);
}

import { stripeConfigurado, supabaseConfigurado } from "@/lib/servidor/config";
import { agenteVentasConfigurado } from "@/lib/ventas/agentsales";
import { whatsapp } from "@/lib/whatsapp";
import { respuestaSalud } from "@/lib/whatsapp/hub-cliente";

export const dynamic = "force-dynamic";

/** Salud para el monitoreo del Hub (protocolo Hub v1). Funciona en cualquier modo. */
export async function GET() {
  const { conector, aviso } = whatsapp();
  return respuestaSalud({
    ok: true,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    detalles: {
      whatsapp_configurado: aviso === null,
      [`whatsapp_${conector.modo}`]: true,
      agente_ventas_configurado: agenteVentasConfigurado(),
      cuentas_configuradas: supabaseConfigurado(),
      pagos_configurados: stripeConfigurado(),
    },
  });
}

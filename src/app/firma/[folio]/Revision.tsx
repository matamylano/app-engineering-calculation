"use client";

import { useActionState } from "react";
import { accionAprobar, accionRechazar, type EstadoForm } from "@/app/acciones";
import { inputClass } from "@/components/form";
import { Boton, Mensajes } from "@/components/ui";
import type { DatosFirmante } from "@/lib/servidor/tipos";

/** Aprobar (congela la memoria con los datos del ingeniero) o pedir cambios. */
export default function Revision({ folio, datos }: { folio: string; datos?: DatosFirmante }) {
  const [aprobacion, aprobar, aprobando] = useActionState<EstadoForm, FormData>(accionAprobar, {});
  const [rechazo, rechazar, rechazando] = useActionState<EstadoForm, FormData>(accionRechazar, {});

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={aprobar} className="grid content-start gap-3 rounded-lg border border-emerald-300 p-5 dark:border-emerald-800">
        <h2 className="text-lg font-semibold">Aprobar</h2>
        <input type="hidden" name="folio" value={folio} />
        {(
          [
            ["nombre", "Nombre del ingeniero"],
            ["cedula", "Cédula profesional"],
            ["registro", "Registro (DRO o corresponsable)"],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="grid gap-1 text-sm">
            <span className="font-medium">{label}</span>
            <input name={name} required defaultValue={datos?.[name]} className={inputClass} />
          </label>
        ))}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="confirmo" value="si" required className="mt-1" />
          <span>Revisé la memoria completa y asumo la responsabilidad técnica del estudio.</span>
        </label>
        <Mensajes error={aprobacion.error} />
        <Boton pendiente={aprobando}>Aprobar y congelar</Boton>
      </form>

      <form action={rechazar} className="grid content-start gap-3 tarjeta p-6 border-red-300 dark:border-red-800">
        <h2 className="text-lg font-semibold">Pedir cambios</h2>
        <input type="hidden" name="folio" value={folio} />
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Qué debe corregir el cliente</span>
          <textarea name="notas" required rows={6} maxLength={2000} className={inputClass} />
        </label>
        <Mensajes error={rechazo.error} />
        <Boton secundario pendiente={rechazando}>
          Mandar notas al cliente
        </Boton>
      </form>
    </div>
  );
}

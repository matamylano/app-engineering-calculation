"use client";

import { useActionState } from "react";
import { accionTelefonoAviso, type EstadoForm } from "@/app/acciones";
import { inputClass } from "@/components/form";
import { Boton, Mensajes } from "@/components/ui";

/** WhatsApp para avisar al cliente cuando el ingeniero responda. */
export default function AvisoWhatsApp({ folio, telefono }: { folio: string; telefono?: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(accionTelefonoAviso, {});
  return (
    <form action={accion} className="mt-3 flex flex-wrap items-end gap-3">
      <input type="hidden" name="folio" value={folio} />
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Avísame por WhatsApp</span>
        <input
          name="telefono"
          type="tel"
          inputMode="tel"
          defaultValue={telefono}
          placeholder="10 dígitos"
          className={`${inputClass} w-48`}
        />
      </label>
      <Boton secundario pendiente={pendiente}>
        Guardar
      </Boton>
      <Mensajes error={estado.error} aviso={estado.aviso} />
    </form>
  );
}

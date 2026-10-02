"use client";

import { useActionState } from "react";
import { accionPerfilFirmante, type EstadoForm } from "@/app/acciones";
import { inputClass } from "@/components/form";
import { Boton, Mensajes } from "@/components/ui";
import type { PerfilFirmante } from "@/lib/servidor/tipos";

function Imagen({ name, label, actual, quitar }: { name: string; label: string; actual?: string; quitar: string }) {
  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {actual && (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL guardada */}
          <img src={actual} alt={label} className="h-20 max-w-48 rounded border border-zinc-200 bg-white object-contain p-1" />
          <label className="flex items-center gap-2">
            <input type="checkbox" name={quitar} value="si" /> Quitar
          </label>
        </div>
      )}
      <input name={name} type="file" accept="image/png,image/jpeg" className="text-sm" />
    </div>
  );
}

export default function FormPerfil({ perfil }: { perfil: PerfilFirmante | null }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(accionPerfilFirmante, {});
  return (
    <form action={accion} className="mt-6 grid max-w-xl gap-4">
      {(
        [
          ["nombre", "Nombre del ingeniero"],
          ["cedula", "Cédula profesional"],
          ["registro", "Registro (DRO o corresponsable)"],
        ] as const
      ).map(([name, label]) => (
        <label key={name} className="grid gap-1 text-sm">
          <span className="font-medium">{label}</span>
          <input name={name} required defaultValue={perfil?.[name]} className={inputClass} />
        </label>
      ))}
      <Imagen name="firma" label="Firma (PNG con fondo transparente o blanco)" actual={perfil?.firmaImagen} quitar="quitarFirma" />
      <Imagen name="sello" label="Sello" actual={perfil?.selloImagen} quitar="quitarSello" />
      <p className="text-xs text-zinc-500">Cada imagen debe pesar menos de 250 KB.</p>
      <Mensajes error={estado.error} aviso={estado.aviso} />
      <Boton pendiente={pendiente}>Guardar perfil</Boton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { accionPedirCodigo, accionVerificarCodigo, type EstadoForm } from "@/app/acciones";
import { inputClass } from "@/components/form";
import { Boton, Mensajes } from "@/components/ui";

export default function FormEntrar({ siguiente }: { siguiente: string }) {
  const [pedido, pedir, pidiendo] = useActionState<EstadoForm, FormData>(accionPedirCodigo, { paso: "correo" });
  const [verificado, verificar, verificando] = useActionState<EstadoForm, FormData>(accionVerificarCodigo, {});

  if (pedido.paso !== "codigo") {
    return (
      <form action={pedir} className="mt-6 grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Correo</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={pedido.email}
            className={inputClass}
            placeholder="tu@correo.com"
          />
        </label>
        <Mensajes error={pedido.error} />
        <Boton pendiente={pidiendo}>Mandarme un código</Boton>
      </form>
    );
  }

  return (
    <form action={verificar} className="mt-6 grid gap-4">
      <input type="hidden" name="email" value={pedido.email} />
      <input type="hidden" name="siguiente" value={siguiente} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Correo: <b>{pedido.email}</b>
      </p>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Código de 6 dígitos</span>
        <input
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          className={`${inputClass} font-mono tracking-widest`}
        />
      </label>
      <Mensajes error={verificado.error} aviso={verificado.error ? undefined : pedido.aviso} />
      <Boton pendiente={verificando}>Entrar</Boton>
    </form>
  );
}

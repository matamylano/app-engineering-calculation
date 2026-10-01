"use client";

import { useState } from "react";
import type { InteresVenta } from "@/lib/ventas/agentsales";
import { ErrorText, Field } from "./form";

interface Props {
  interes: InteresVenta;
  estudio: string;
  titulo: string;
  descripcion: string;
}

/** Deja el WhatsApp del usuario para que el agente de ventas lo contacte. */
export default function ContactoVentas({ interes, estudio, titulo, descripcion }: Props) {
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [website, setWebsite] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "listo">("idle");
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEstado("enviando");
    try {
      const res = await fetch("/api/ventas/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telefono, nombre, interes, estudio, acepta_contacto: acepta, website }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "No pudimos registrar tu solicitud.");
      }
      setEstado("listo");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setEstado("idle");
    }
  };

  if (estado === "listo") {
    return (
      <div className="no-print rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        Listo. Te escribiremos por WhatsApp.
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="no-print rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h3 className="font-semibold">{titulo}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{descripcion}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field type="text" label="WhatsApp" value={telefono} onChange={setTelefono} placeholder="442 123 4567" />
        <Field type="text" label="Nombre" value={nombre} onChange={setNombre} />
      </div>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        aria-hidden="true"
      />
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
        <span>Acepto que me contacten por WhatsApp sobre este servicio.</span>
      </label>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={estado === "enviando"}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {estado === "enviando" ? "Enviando…" : "Quiero que me contacten"}
        </button>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    </form>
  );
}

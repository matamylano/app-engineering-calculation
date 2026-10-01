"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionGuardarMemoria } from "@/app/acciones";
import { ESTUDIOS } from "@/lib/estudios/registro";
import type { Estudio } from "@/lib/servidor/tipos";

/**
 * Genera o corrige la memoria de un estudio. Si el usuario no ha entrado,
 * guarda lo capturado en el navegador, lo manda a entrar y lo recupera al
 * volver.
 */
export function useGuardarMemoria<F>(estudio: Estudio, folio: string | undefined, restaurar: (f: F) => void) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const clave = `${estudio}-borrador`;

  useEffect(() => {
    if (folio) return;
    try {
      const raw = window.sessionStorage.getItem(clave);
      if (!raw) return;
      window.sessionStorage.removeItem(clave);
      restaurar(JSON.parse(raw) as F);
    } catch {
      // Sin almacenamiento: se queda con los valores de ejemplo.
    }
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = (formulario: F) => {
    setError(null);
    startTransition(async () => {
      const r = await accionGuardarMemoria(estudio, formulario, folio);
      if (r.ok) {
        router.push(`/memorias/${r.folio}`);
        return;
      }
      if (r.entrar) {
        try {
          window.sessionStorage.setItem(clave, JSON.stringify(formulario));
        } catch {
          // Sin almacenamiento: al volver se pierden los datos capturados.
        }
        router.push(`/entrar?siguiente=${encodeURIComponent(ESTUDIOS[estudio].ruta)}`);
        return;
      }
      setError(r.error);
    });
  };

  return { guardar, pendiente, error, setError };
}

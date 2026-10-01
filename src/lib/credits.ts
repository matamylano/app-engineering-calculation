"use client";

import { useSyncExternalStore } from "react";

/**
 * Créditos de cálculo. Versión provisional: se guardan en el navegador y no
 * hay cobro. Se reemplaza por cuentas y pagos reales en el servidor.
 */
export const FREE_CREDITS = 5;
const KEY = "creditos-calculo";
const listeners = new Set<() => void>();

function read(): number {
  try {
    const raw = window.localStorage.getItem(KEY);
    const n = raw === null ? FREE_CREDITS : Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : FREE_CREDITS;
  } catch {
    return FREE_CREDITS;
  }
}

function write(n: number) {
  try {
    window.localStorage.setItem(KEY, String(n));
  } catch {
    // Sin almacenamiento disponible: los créditos solo duran la sesión.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCredits() {
  const credits = useSyncExternalStore(subscribe, read, () => FREE_CREDITS);
  /** Gasta un crédito. Devuelve false si no hay. */
  const spend = () => {
    const current = read();
    if (current <= 0) return false;
    write(current - 1);
    return true;
  };
  return { credits, spend };
}

/**
 * Prellenado de un estudio desde otro con la URL, por ejemplo
 * /civil/zapata?carga=20.5&cargaUltima=28.1&qa=10 desde la bajada de cargas.
 * Solo acepta campos de la lista y números cortos; lo demás se ignora.
 */
export function prellenar<F extends object>(
  base: F,
  params: Record<string, string | string[] | undefined>,
  campos: readonly (keyof F & string)[],
): F | undefined {
  const cambios: Partial<Record<keyof F, string>> = {};
  for (const k of campos) {
    const v = params[k];
    if (typeof v === "string" && /^-?\d{1,7}(\.\d{1,4})?$/.test(v)) cambios[k] = v;
  }
  return Object.keys(cambios).length ? { ...base, ...cambios } : undefined;
}

/** Arma la URL de prellenado con números redondeados. */
export function urlPrellenado(ruta: string, valores: Record<string, number | undefined>, decimales = 2) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(valores)) if (v !== undefined && Number.isFinite(v)) q.set(k, String(Number(v.toFixed(decimales))));
  return `${ruta}?${q}`;
}

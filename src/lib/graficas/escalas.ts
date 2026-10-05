/** Escalas y marcas de eje "redondas" para las gráficas. */

/** Paso redondo (1, 2, 2.5 o 5 × 10ⁿ) para tener unas `cuantas` divisiones. */
export function pasoRedondo(rango: number, cuantas = 5) {
  if (!(rango > 0) || !Number.isFinite(rango)) return 1;
  const bruto = rango / cuantas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / potencia;
  const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return m * potencia;
}

/** Extiende [min, max] a múltiplos del paso y da las marcas. */
export function marcasLineales(min: number, max: number, cuantas = 5) {
  if (min === max) {
    const d = Math.abs(min) || 1;
    min -= d / 2;
    max += d / 2;
  }
  const paso = pasoRedondo(max - min, cuantas);
  const ini = Math.floor(min / paso + 1e-9) * paso;
  const fin = Math.ceil(max / paso - 1e-9) * paso;
  const marcas: number[] = [];
  for (let v = ini; v <= fin + paso / 2; v += paso) marcas.push(Math.abs(v) < paso / 1e6 ? 0 : v);
  return { min: ini, max: fin, marcas };
}

/** Décadas completas que cubren [min, max] (ambos > 0), con marcas 1, 2 y 5. */
export function marcasLog(min: number, max: number) {
  const ini = Math.floor(Math.log10(min) + 1e-9);
  let fin = Math.ceil(Math.log10(max) - 1e-9);
  if (fin === ini) fin += 1;
  const marcas: number[] = [];
  for (let e = ini; e <= fin; e++) for (const m of [1, 2, 5]) if (e < fin || m === 1) marcas.push(m * 10 ** e);
  return { min: 10 ** ini, max: 10 ** fin, marcas };
}

/** Número corto para las marcas: sin ceros sobrantes, con separador de miles. */
export function numeroEje(v: number) {
  const abs = Math.abs(v);
  const dec = abs === 0 || abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  return Number(v.toFixed(dec)).toLocaleString("es-MX", { maximumFractionDigits: dec });
}

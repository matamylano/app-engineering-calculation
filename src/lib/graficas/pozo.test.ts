import { describe, expect, it } from "vitest";
import { disenarPozo } from "@/calc/pozos/pozo";
import { entradaPozo, FORMULARIO_POZO_INICIAL } from "@/lib/estudios/pozo";
import { graficasPozoExtra } from "./pozo";

describe("gráficas adicionales del pozo", () => {
  const e = entradaPozo(FORMULARIO_POZO_INICIAL);
  const r = disenarPozo(e);

  it("la curva del sistema pasa por el punto de operación", () => {
    const [g] = graficasPozoExtra(e, r);
    if (g.tipo !== "xy") throw new Error();
    const p = g.series[0].puntos;
    expect(p[0]).toEqual([0, e.nivelEstatico + e.cargaDescarga]);
    // El punto 20 de 30 es el gasto de diseño (1.5 · 20/30 = 1).
    expect(p[20][0]).toBeCloseTo(e.gastoDiseno, 9);
    expect(p[20][1]).toBeCloseTo(r.carga, 9);
    expect(g.notas?.[0].y).toBe(r.carga);
  });

  it("solo compara con la concesión si hay volumen concesionado", () => {
    expect(graficasPozoExtra(e, r)).toHaveLength(1);
    const e2 = { ...e, volumenConcesionado: 300000 };
    const g = graficasPozoExtra(e2, disenarPozo(e2))[1];
    if (g.tipo !== "barras") throw new Error();
    expect(g.referencia?.valor).toBe(300000);
    // Memorias anteriores sin extracción: solo la curva.
    expect(graficasPozoExtra(e, { ...r, extraccion: undefined as never })).toHaveLength(1);
  });
});

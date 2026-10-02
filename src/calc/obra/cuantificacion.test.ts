import { describe, expect, it } from "vitest";
import { kgPorMetro, preciosDeFormulario, presupuesto } from "./cuantificacion";

describe("cuantificación", () => {
  it("peso de varillas comerciales", () => {
    expect(kgPorMetro(3)).toBeCloseTo(0.557, 3);
    expect(kgPorMetro(4)).toBeCloseTo(0.997, 3);
    expect(kgPorMetro(5)).toBeCloseTo(1.562, 3);
  });

  it("piezas, desperdicio e importes", () => {
    const p = presupuesto(
      [
        { concepto: "Concreto", material: "concreto", cantidad: 0.675 },
        { concepto: "Acero #4", material: "acero", cantidad: 22.3 },
      ],
      { concreto: 2600 },
      4,
    );
    // 0.675 × 4 × 1.05 = 2.835 m³ → $7,371
    expect(p.totales.concreto).toBeCloseTo(2.835, 6);
    expect(p.renglones[0].importe).toBeCloseTo(7371, 6);
    // Sin precio de acero: sin importe, pero sí cantidad.
    expect(p.renglones[1].importe).toBeNull();
    expect(p.totales.acero).toBeCloseTo(22.3 * 4 * 1.07, 6);
    expect(p.total).toBeCloseTo(7371, 6);
  });

  it("sin precios no hay total y las memorias viejas cuentan una pieza", () => {
    expect(presupuesto([{ concepto: "c", material: "concreto", cantidad: 1 }], {}).total).toBeNull();
    expect(preciosDeFormulario({})).toEqual({ piezas: 1, precios: { concreto: undefined, acero: undefined, cimbra: undefined } });
  });

  it("rechaza piezas y precios inválidos", () => {
    expect(() => presupuesto([], {}, 0)).toThrow();
    expect(() => presupuesto([], { acero: -1 })).toThrow();
  });
});

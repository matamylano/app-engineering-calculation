import { describe, expect, it } from "vitest";
import { disenarColumna, resistenciaNominal, type EntradaColumna } from "./columna";

const base: EntradaColumna = {
  carga: 40,
  momento: 1,
  altura: 2.7,
  b: 30,
  h: 30,
  recubrimiento: 4,
  fc: 250,
  fy: 4200,
  varilla: 5,
  estribo: 3,
};

describe("disenarColumna", () => {
  // Revisado a mano: d' = 4 + 0.953 + 0.794 = 5.75 cm. Cuantía mínima 1 % = 9 cm² → 5 #5 → 6 #5 (11.94 cm²).
  it("diseña una columna de casa", () => {
    const r = disenarColumna(base);
    expect(r.armado).toMatchObject({ cantidad: 6, varilla: 5, cabe: true });
    expect(r.armado.area).toBeCloseTo(11.94, 6);

    // Po = 212.5·(900 − 11.94) + 4200·11.94 = 238.86 t; PR = 0.8·0.65·Po = 124.2 t.
    expect(r.cargaResistente).toBeCloseTo(124.208, 2);

    // e mín = 2 cm → 0.8 t·m < 1 t·m. kL/r = 270/9 = 30; EI = 0.4·14000√250·67 500/1.6;
    // Pc = π² EI / 270² = 505.7 t; δ = 1/(1 − 40/(0.75·505.7)) = 1.118.
    expect(r.excentricidadMinima).toBe(2);
    expect(r.momentoMinimo).toBeCloseTo(0.8, 6);
    expect(r.esbeltez).toBeCloseTo(30, 6);
    expect(r.cargaCritica).toBeCloseTo(505.72, 0);
    expect(r.amplificacion).toBeCloseTo(1.1179, 3);
    expect(r.momentoDiseno).toBeCloseTo(1.1179, 3);

    // Con Pu = 40 t el eje neutro queda en c ≈ 12.6 cm y FR·Mn ≈ 0.65·10.60 = 6.89 t·m.
    expect(r.momentoResistente).toBeCloseTo(6.89, 1);

    // Estribos: menor de 850·1.588/√4200 = 20.8, 48·0.953 = 45.7 y 30/2 = 15 → #3 @ 15.
    expect(r.estribos).toEqual({ varilla: 3, separacion: 15 });
    expect(r.cumple).toBe(true);
  });

  it("calcula la resistencia nominal en un punto revisado a mano", () => {
    const s = { b: 30, h: 30, dp: 5.747, area: 11.94, fc: 250, fy: 4200 };
    const { p, m } = resistenciaNominal(12.5, s);
    // Cc = 212.5·0.85·12.5·30 = 67 734; acero arriba 5.97·(3241.4 − 212.5); abajo fluye a tensión.
    expect(p).toBeCloseTo(67734.4 + 5.97 * (6000 * (12.5 - 5.747) / 12.5 - 212.5) - 5.97 * 4200, 0);
    expect(m).toBeGreaterThan(0);
  });

  it("agrega varillas cuando el momento lo pide", () => {
    const r = disenarColumna({ ...base, momento: 8 });
    expect(r.armado.cantidad).toBeGreaterThan(6);
    expect(r.momentoResistente).toBeGreaterThanOrEqual(r.momentoDiseno);
    expect(r.cumple).toBe(r.armado.cabe);
  });

  it("dice por qué no pasa", () => {
    expect(disenarColumna({ ...base, carga: 200 }).problemas.join()).toMatch(/carga axial/);
    expect(disenarColumna({ ...base, b: 20, h: 20, altura: 6 }).problemas.join()).toMatch(/esbelta/);
  });
});

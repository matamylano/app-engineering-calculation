import { describe, expect, it } from "vitest";
import {
  capasCuatroCaras,
  cuantificarColumna,
  disenarColumna,
  resistenciaCapas,
  resistenciaNominal,
  type EntradaColumna,
} from "./columna";

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

  it("sin segundo momento da lo mismo que antes", () => {
    const r = disenarColumna({ ...base, momentoB: 0 });
    expect(r).toEqual(disenarColumna(base));
    expect(r.biaxial).toBeNull();
    expect(r.armado).toMatchObject({ caras: 2, porCaraB: 3, porCaraH: 2 });
  });

  it("las capas generales dan lo mismo que las dos caras", () => {
    const s = { b: 30, h: 30, dp: 5.747, area: 11.94, fc: 250, fy: 4200 };
    const capas = [
      { y: s.dp, area: s.area / 2 },
      { y: s.h - s.dp, area: s.area / 2 },
    ];
    for (const c of [3, 12.5, 25, 60]) {
      const a = resistenciaNominal(c, s);
      const b = resistenciaCapas(c, s, capas);
      expect(b.p).toBeCloseTo(a.p, 6);
      expect(b.m).toBeCloseTo(a.m, 6);
    }
    // 3 varillas por cara de ancho b y 4 por cara lateral: dos capas intermedias de 2 varillas.
    expect(capasCuatroCaras(30, 6, 3, 4, 2)).toEqual([
      { y: 6, area: 6 },
      { y: 12, area: 4 },
      { y: 18, area: 4 },
      { y: 24, area: 6 },
    ]);
  });

  it("revisa la flexión biaxial con Bresler", () => {
    const r = disenarColumna({ ...base, momentoB: 1 });
    // Mínimo 1 % = 9 cm²: 4 esquinas + 1 en cada cara de ancho b → 6 #5 (11.94 cm²).
    expect(r.armado).toMatchObject({ cantidad: 6, caras: 4, porCaraB: 3, porCaraH: 2 });
    const x = r.biaxial!;
    // PR0 = 0.65 · (212.5 · (900 − 11.94) + 4200 · 11.94) = 155.26 t.
    expect(x.carga0).toBeCloseTo(155.26, 1);
    // Con e = 2.8 cm en h la carga llega al tope 0.8 FR Po = 124.21 t.
    expect(x.cargaX).toBeCloseTo(124.208, 2);
    // 1/PR = 1/PRx + 1/PRy − 1/PR0.
    expect(1 / x.cargaBresler).toBeCloseTo(1 / x.cargaX + 1 / x.cargaY - 1 / x.carga0, 9);
    expect(x.metodo).toBe("bresler");
    expect(x.indice).toBeCloseTo(40 / x.cargaBresler, 9);
    // Lado b = h: misma amplificación en las dos direcciones.
    expect(x.amplificacion).toBeCloseTo(r.amplificacion, 9);
    expect(r.cumple).toBe(true);
  });

  it("con más momento en b baja la carga resistente y, si hace falta, agrega acero", () => {
    const poco = disenarColumna({ ...base, momentoB: 1 }).biaxial!;
    const mucho = disenarColumna({ ...base, momentoB: 4 }).biaxial!;
    expect(mucho.cargaY).toBeLessThan(poco.cargaY);
    expect(mucho.indice).toBeLessThanOrEqual(1);
    const r = disenarColumna({ ...base, b: 40, h: 40, momentoB: 12 });
    expect(r.armado.cantidad).toBeGreaterThan(8);
    expect(r.biaxial!.indice).toBeLessThanOrEqual(1);
  });

  it("con poca carga usa Mx/MRx + My/MRy", () => {
    const r = disenarColumna({ ...base, carga: 5, momentoB: 1 });
    expect(r.biaxial!.metodo).toBe("lineal");
    expect(r.biaxial!.indice).toBeCloseTo(r.momentoDiseno / r.momentoResistente + r.biaxial!.momentoDiseno / r.biaxial!.momentoResistente, 9);
  });

  // Revisado a mano: concreto 0.30 · 0.30 · 2.70 = 0.243 m³; varilla 2.70 + 40 · 0.01588 = 3.335 m,
  // 6 · 3.335 · 1.562 = 31.26 kg; 270/15 + 1 = 19 estribos de (2·22 + 2·22 + 20·0.953) = 107.06 cm → 11.34 kg;
  // cimbra 4 · 0.30 · 2.70 = 3.24 m².
  it("cuantifica la columna", () => {
    const p = cuantificarColumna(base, disenarColumna(base));
    expect(p.map((x) => x.cantidad)).toEqual([
      expect.closeTo(0.243, 6),
      expect.closeTo(31.26, 2),
      expect.closeTo(11.337, 2),
      expect.closeTo(3.24, 6),
    ]);
    expect(p[2].concepto).toMatch(/19 por columna/);
  });
});

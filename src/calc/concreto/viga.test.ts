import { describe, expect, it } from "vitest";
import { disenarViga, type EntradaViga } from "./viga";

const base: EntradaViga = {
  claro: 5,
  apoyo: "simple",
  muerta: 1.5,
  viva: 0.5,
  b: 20,
  h: 40,
  recubrimiento: 3,
  fc: 250,
  fy: 4200,
  varilla: 5,
  estribo: 3,
};

describe("disenarViga", () => {
  // Revisado a mano: peso propio 0.192 t/m; wu = 1.3·1.692 + 1.5·0.5 = 2.950 t/m;
  // d = 40 − 3 − 0.953 − 1.588/2 = 35.25 cm.
  it("diseña una viga simplemente apoyada", () => {
    const r = disenarViga(base);
    expect(r.pesoPropio).toBeCloseTo(0.192, 6);
    expect(r.cargaUltima).toBeCloseTo(2.9496, 4);
    expect(r.d).toBeCloseTo(35.253, 3);

    // Mu+ = 2.95·5²/8 = 9.22 t·m → As = 7.76 cm²: 4 #5, que no caben en 20 cm.
    expect(r.inferior.momento).toBeCloseTo(9.2175, 4);
    expect(r.inferior.requerido).toBeCloseTo(7.761, 2);
    expect(r.inferior.cantidad).toBe(4);
    expect(r.inferior.cabe).toBe(false);
    expect(r.cumple).toBe(false);

    // Sin momento negativo: acero mínimo arriba, 0.7√250/4200·20·35.25 = 1.86 cm² → 2 #5.
    expect(r.superior.momento).toBe(0);
    expect(r.aceroMinimo).toBeCloseTo(1.858, 3);
    expect(r.superior.cantidad).toBe(2);
    expect(r.aceroMaximo).toBeCloseTo(13.377, 2);

    // Vu a d = 7.374 − 29.5·35.25/1000 = 6.33 t; VcR = 0.375·√250·20·35.25 = 4.18 t;
    // estribos #3 por cálculo a 73 cm, por mínimo a 62.9 cm, máximo d/2 = 17.6 → @ 17.5 cm.
    expect(r.cortante.actuante).toBeCloseTo(6.334, 3);
    expect(r.cortante.concreto).toBeCloseTo(4.18, 2);
    expect(r.cortante.separacion).toBe(17.5);
    expect(r.cortante.cumple).toBe(true);
    expect(r.peralteMinimo).toBeCloseTo(31.25, 6);
  });

  it("cumple con una sección más ancha", () => {
    const r = disenarViga({ ...base, b: 25 });
    expect(r.inferior.cabe).toBe(true);
    expect(r.cumple).toBe(true);
  });

  it("usa los coeficientes de cada apoyo", () => {
    const interior = disenarViga({ ...base, apoyo: "ambos-continuos" });
    expect(interior.superior.momento).toBeCloseTo((2.9496 * 25) / 11, 4);
    expect(interior.inferior.momento).toBeCloseTo((2.9496 * 25) / 16, 4);
    const volado = disenarViga({ ...base, apoyo: "voladizo", claro: 1.5 });
    expect(volado.superior.momento).toBeCloseTo((2.9496 * 2.25) / 2, 4);
    expect(volado.inferior.momento).toBe(0);
  });

  it("avisa cuando la sección no alcanza", () => {
    expect(() => disenarViga({ ...base, claro: 10, muerta: 5 })).toThrow(/no resiste/);
    const r = disenarViga({ ...base, b: 15, h: 60, claro: 2, muerta: 40, viva: 20, varilla: 8 });
    expect(r.cortante.cumple).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { disenarLosa, type EntradaLosa } from "./losa";

const base: EntradaLosa = {
  claro: 3,
  apoyo: "simple",
  h: 10,
  recubrimiento: 2,
  muerta: 150,
  viva: 190,
  incrementos: true,
  fc: 250,
  fy: 4200,
  varilla: 3,
};

describe("disenarLosa", () => {
  // Revisado a mano: CM = 240 + 40 + 150 = 430 kg/m²; wu = 1.3·430 + 1.5·190 = 844 kg/m²;
  // d = 10 − 2 − 0.953/2 = 7.52 cm.
  it("diseña una franja de losa simplemente apoyada", () => {
    const r = disenarLosa(base);
    expect(r.muertaTotal).toBeCloseTo(430, 6);
    expect(r.cargaUltima).toBeCloseTo(844, 6);
    expect(r.d).toBeCloseTo(7.5235, 4);

    // Mu = 8.44·300²/8 = 0.95 t·m/m → As = 3.50 cm²/m → #3 @ 20 cm.
    expect(r.positivo.momento).toBeCloseTo(0.9495, 4);
    expect(r.positivo.requerido).toBeCloseTo(3.4997, 3);
    expect(r.positivo.separacion).toBe(20);
    expect(r.positivo.areaColocada).toBeCloseTo(3.55, 6);

    // Mínimo 0.7√250/4200·100·7.52 = 1.98 cm²/m; sin momento negativo: #3 @ 35 (= 3.5 h).
    expect(r.aceroMinimo).toBeCloseTo(1.9826, 3);
    expect(r.negativo.momento).toBe(0);
    expect(r.negativo.separacion).toBe(35);
    // Temperatura 660·10/(4200·110)·100 = 1.43 cm²/m → @ 35 por separación máxima.
    expect(r.temperatura.diseno).toBeCloseTo(1.4286, 3);
    expect(r.temperatura.separacion).toBe(35);

    // Vu = 8.44·150 − 8.44·7.52 = 1.20 t; VcR = 0.375·√250·100·7.52 = 4.46 t.
    expect(r.cortante.actuante).toBeCloseTo(1.2025, 3);
    expect(r.cortante.resistente).toBeCloseTo(4.461, 2);
    expect(r.cumple).toBe(true);
    expect(r.espesorMinimo).toBe(15);
  });

  it("sin incrementos no suma los 40 kg/m²", () => {
    expect(disenarLosa({ ...base, incrementos: false }).muertaTotal).toBeCloseTo(390, 6);
  });

  it("losa continua lleva acero negativo", () => {
    const r = disenarLosa({ ...base, apoyo: "ambos-continuos" });
    expect(r.negativo.momento).toBeCloseTo((8.44 * 90000) / 11 / 1e5, 6);
    expect(r.espesorMinimo).toBeCloseTo(300 / 28, 6);
  });

  it("avisa cuando el espesor no alcanza", () => {
    expect(() => disenarLosa({ ...base, claro: 6, muerta: 600, viva: 500 })).toThrow(/espesor/);
  });
});

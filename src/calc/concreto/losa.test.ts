import { describe, expect, it } from "vitest";
import { disenarLosa, partidasLosa, problemasLosa, type EntradaLosa } from "./losa";

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
    expect(r.cortante.cumple).toBe(true);
    expect(r.espesorMinimo).toBe(15);
    // Con 10 cm (< 15 cm) se calcula la flecha: Ie = 4 300 cm⁴, δi = 0.69 cm, total 1.81 > 1.75 cm.
    expect(r.deflexion!.total).toBeCloseTo(1.81, 1);
    expect(r.flechaExcedida).toBe(true);
    expect(r.cumple).toBe(false);
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

  it("revisa la flecha de la franja", () => {
    // h = 12: CM = 288 + 40 + 150 = 478; w = 6.68 kg/cm; Ma = 6.68·300²/8 = 0.752 t·m < Mag = 0.759 t·m
    // → Ie = Ig = 14 400 cm⁴; δi = 5·6.68·300⁴/(384·221 359·14 400) = 0.221 cm;
    // sostenida (478 + 0.42·190)/668 → 0.186 cm × 2 = 0.371; total 0.59 < 3/240·100 + 0.5 = 1.75 cm.
    const r = disenarLosa({ ...base, h: 12, vivaSostenida: 0.42 });
    expect(r.deflexion!.ie).toBe(14_400);
    expect(r.deflexion!.inmediata).toBeCloseTo(0.221, 3);
    expect(r.deflexion!.total).toBeCloseTo(0.592, 2);
    expect(r.deflexion!.limite).toBeCloseTo(1.75, 6);
    expect(r.cumple).toBe(true);
    // Claro de 5 m con 12 cm (mínimo 25 cm) y cargas altas: no pasa por flecha.
    const larga = disenarLosa({ ...base, claro: 5, h: 12, muerta: 300, viva: 350, varilla: 4 });
    expect(larga.flechaExcedida).toBe(true);
    expect(larga.cumple).toBe(false);
    expect(problemasLosa(larga).join()).toMatch(/flecha/);
  });

  it("cuantifica un tablero", () => {
    const e = { ...base, h: 12 };
    const p = partidasLosa(e, disenarLosa(e), 6);
    // 3 × 6 × 0.12 = 2.16 m³; gancho #3 = 19.24 + 11.44 = 30.68 cm;
    // abajo @ 22.5: 28 × 3.614 m × 0.557 = 56.39 kg; bastones @ 27.5: 2 × 23 × (0.75 + 0.307) × 0.557 = 27.09 kg;
    // temperatura @ 40: 9 × 6 m × 0.557 = 30.10 kg; cimbra 18 m².
    expect(p.map((x) => Number(x.cantidad.toFixed(2)))).toEqual([2.16, 56.39, 27.09, 30.1, 18]);
    expect(() => partidasLosa(e, disenarLosa(e), 0)).toThrow(/largo/);
  });
});

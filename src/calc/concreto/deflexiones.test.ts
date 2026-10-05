import { describe, expect, it } from "vitest";
import { calcularFlecha, factorDiferido, inerciaAgrietada, inerciaEfectiva, limiteFlecha, type EntradaFlecha } from "./deflexiones";

// Viga de 25 × 40 cm, L = 5 m, simplemente apoyada, 4 #5 abajo y 2 #5 arriba (d = 35.25, d' = 4.75).
const centro = { b: 25, h: 40, d: 35.253, dc: 4.747, As: 7.96, Asc: 3.98 };
const base: EntradaFlecha = {
  caso: "tramo",
  extremosContinuos: 0,
  L: 500,
  w: 22.4, // 1.5 + 0.24 + 0.5 t/m
  wSostenida: 19.4, // 1.74 + 0.4 · 0.5 t/m
  mCentro: (22.4 * 500 ** 2) / 8,
  mApoyo: 0,
  fc: 250,
  centro,
  apoyo: { ...centro, As: 3.98, Asc: 7.96 },
  elementosFragiles: false,
};

describe("deflexiones", () => {
  it("límites de las NTC y factor de largo plazo", () => {
    expect(limiteFlecha(500, false, false)).toBeCloseTo(500 / 240 + 0.5, 9);
    expect(limiteFlecha(500, false, true)).toBeCloseTo(500 / 480 + 0.3, 9);
    expect(limiteFlecha(150, true, false)).toBeCloseTo(2 * (150 / 240 + 0.5), 9);
    expect(factorDiferido(0)).toBe(2);
    expect(factorDiferido(0.01)).toBeCloseTo(4 / 3, 9);
  });

  it("sección agrietada e inercia efectiva", () => {
    // n = 2·10⁶ / (14 000 √250) = 9.035; 12.5 c² + 103.9 c − 2686 = 0 → c = 11.08 cm;
    // Iag = 25·11.08³/3 + 32.0·6.33² + 71.9·24.17² ≈ 54 640 cm⁴.
    const { c, I } = inerciaAgrietada(centro, 9.0351);
    expect(c).toBeCloseTo(11.08, 1);
    expect(I).toBeGreaterThan(54_500);
    expect(I).toBeLessThan(54_800);
    expect(inerciaEfectiva(1000, 400, 50, 40)).toBe(1000);
    // (1/2)³ = 0.125 → 0.125·1000 + 0.875·400 = 475.
    expect(inerciaEfectiva(1000, 400, 50, 100)).toBeCloseTo(475, 9);
  });

  it("flecha de una viga simplemente apoyada", () => {
    // Ig = 133 333; Mag = 2√250·133 333/20 = 2.108 t·m; Ma = 7.0 t·m; (Mag/Ma)³ = 0.0273;
    // Ie = 0.0273·133 333 + 0.9727·54 643 = 56 790 cm⁴.
    // δi = 5·22.4·500⁴ / (384·221 359·56 790) = 1.45 cm; δsost = 1.45·19.4/22.4 = 1.256 cm;
    // p' = 3.98/(25·35.25) = 0.00452 → 2/(1 + 0.226) = 1.632; δdif = 2.05; total 3.50 > 2.58 cm.
    const r = calcularFlecha(base);
    expect(r.mag).toBeCloseTo(2.108, 3);
    expect(r.ie).toBeCloseTo(56_790, -1);
    expect(r.inmediata).toBeCloseTo(1.45, 2);
    expect(r.inmediataSostenida).toBeCloseTo(1.256, 2);
    expect(r.factorDiferido).toBeCloseTo(1.632, 3);
    expect(r.total).toBeCloseTo(3.5, 2);
    expect(r.limite).toBeCloseTo(2.583, 3);
    expect(r.cumple).toBe(false);
  });

  it("los extremos continuos reducen la flecha y el voladizo usa w L⁴ / 8 E I", () => {
    // Con la misma inercia: [wL²/16 − 0.1·2·wL²/11] / (wL²/8) = 0.3545 de la flecha simple.
    const sinGrieta = { ...base, w: 1, wSostenida: 1, mCentro: (500 ** 2) / 8 };
    const simple = calcularFlecha(sinGrieta);
    const continua = calcularFlecha({ ...sinGrieta, extremosContinuos: 2, mCentro: 500 ** 2 / 16, mApoyo: 500 ** 2 / 11 });
    expect(continua.inmediata / simple.inmediata).toBeCloseTo(0.3545, 3);
    const volado = calcularFlecha({ ...sinGrieta, caso: "voladizo", L: 150, mCentro: 0, mApoyo: 150 ** 2 / 2 });
    expect(volado.inmediata).toBeCloseTo((150 ** 4) / (8 * volado.ec * volado.ig), 9);
  });
});

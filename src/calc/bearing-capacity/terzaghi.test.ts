import { describe, expect, it } from "vitest";
import { terzaghiBearingCapacity, terzaghiFactors } from "./terzaghi";

describe("terzaghiFactors", () => {
  // Valores de Nc y Nq de la tabla de Terzaghi publicada en Das,
  // Principios de Ingeniería de Cimentaciones.
  it.each([
    [0, 5.7, 1.0],
    [20, 17.69, 7.44],
    [25, 25.13, 12.72],
    [30, 37.16, 22.46],
    [35, 57.75, 41.44],
    [40, 95.66, 81.27],
  ])("φ = %i°: Nc = %f, Nq = %f", (phi, Nc, Nq) => {
    const f = terzaghiFactors(phi);
    expect(f.Nc).toBeCloseTo(Nc, 1);
    expect(f.Nq).toBeCloseTo(Nq, 1);
  });

  it("Nγ es cero para φ = 0 y crece con φ", () => {
    expect(terzaghiFactors(0).Ngamma).toBe(0);
    const values = [10, 20, 30, 40].map((p) => terzaghiFactors(p).Ngamma);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it("Nγ queda dentro de 6 % de la tabla de Kumbhojkar", () => {
    for (const [phi, table] of [
      [30, 19.13],
      [35, 45.41],
      [40, 115.31],
    ]) {
      const ratio = terzaghiFactors(phi).Ngamma / table;
      expect(ratio).toBeGreaterThan(1);
      expect(ratio).toBeLessThan(1.06);
    }
  });
});

describe("terzaghiBearingCapacity", () => {
  it("arcilla en cimentación corrida (φ = 0): qu = 5.71c + γDf", () => {
    const r = terzaghiBearingCapacity({
      cohesion: 50,
      frictionAngle: 0,
      unitWeight: 18,
      depth: 1,
      width: 2,
      shape: "corrida",
    });
    expect(r.ultimate).toBeCloseTo(50 * (1.5 * Math.PI + 1) + 18, 6);
    expect(r.terms.selfWeight).toBe(0);
    expect(r.allowable).toBeCloseTo(r.ultimate / 3, 6);
  });

  it("arena en zapata cuadrada (c = 0, φ = 30°)", () => {
    const r = terzaghiBearingCapacity({
      cohesion: 0,
      frictionAngle: 30,
      unitWeight: 18,
      depth: 1,
      width: 2,
      shape: "cuadrada",
    });
    const f = terzaghiFactors(30);
    expect(r.surcharge).toBe(18);
    expect(r.terms.cohesion).toBe(0);
    expect(r.terms.surcharge).toBeCloseTo(18 * f.Nq, 6);
    expect(r.terms.selfWeight).toBeCloseTo(0.4 * 18 * 2 * f.Ngamma, 6);
    expect(r.ultimate).toBeCloseTo(693.87, 1);
  });

  it("aplica los coeficientes de forma de Terzaghi", () => {
    const base = { cohesion: 20, frictionAngle: 25, unitWeight: 17, depth: 1.5, width: 1.8 };
    const strip = terzaghiBearingCapacity({ ...base, shape: "corrida" });
    const square = terzaghiBearingCapacity({ ...base, shape: "cuadrada" });
    const circle = terzaghiBearingCapacity({ ...base, shape: "circular" });
    expect(square.terms.cohesion).toBeCloseTo(1.3 * strip.terms.cohesion, 6);
    expect(square.terms.selfWeight).toBeCloseTo(0.8 * strip.terms.selfWeight, 6);
    expect(circle.terms.selfWeight).toBeCloseTo(0.6 * strip.terms.selfWeight, 6);
    expect(circle.terms.surcharge).toBeCloseTo(strip.terms.surcharge, 6);
  });

  it("falla local reduce c a 2/3 y tanφ a 2/3", () => {
    const r = terzaghiBearingCapacity({
      cohesion: 30,
      frictionAngle: 30,
      unitWeight: 18,
      depth: 1,
      width: 2,
      shape: "corrida",
      failureMode: "local",
    });
    expect(r.cohesionUsed).toBeCloseTo(20, 6);
    expect(r.frictionAngleUsed).toBeCloseTo(21.05, 2);
  });

  it("usa el factor de seguridad indicado", () => {
    const r = terzaghiBearingCapacity({
      cohesion: 10,
      frictionAngle: 28,
      unitWeight: 18,
      depth: 1,
      width: 1.5,
      shape: "cuadrada",
      safetyFactor: 2.5,
    });
    expect(r.allowable).toBeCloseTo(r.ultimate / 2.5, 6);
  });

  it.each([
    [{ cohesion: -1 }, /cohesión/],
    [{ frictionAngle: 55 }, /fricción/],
    [{ unitWeight: 0 }, /peso volumétrico/],
    [{ depth: -0.5 }, /desplante/],
    [{ width: 0 }, /ancho/],
    [{ safetyFactor: 0.5 }, /seguridad/],
    [{ cohesion: Number.NaN }, /cohesión/],
  ])("rechaza datos inválidos %o", (override, message) => {
    const input = {
      cohesion: 10,
      frictionAngle: 25,
      unitWeight: 18,
      depth: 1,
      width: 1.5,
      shape: "corrida" as const,
      ...override,
    };
    expect(() => terzaghiBearingCapacity(input)).toThrow(message);
  });
});

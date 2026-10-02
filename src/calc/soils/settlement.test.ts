import { describe, expect, it } from "vitest";
import {
  consolidationSettlement,
  immediateSettlement,
  rigidInfluenceFactor,
  stressIncrement21,
} from "./settlement";

describe("rigidInfluenceFactor", () => {
  it("usa π/4 para circular y 0.82 para cuadrada", () => {
    expect(rigidInfluenceFactor("circular")).toBeCloseTo(Math.PI / 4, 6);
    expect(rigidInfluenceFactor("cuadrada")).toBe(0.82);
  });

  it("interpola por L/B en rectangular", () => {
    expect(rigidInfluenceFactor("rectangular", 2)).toBeCloseTo(1.2, 6);
    expect(rigidInfluenceFactor("rectangular", 3.5)).toBeCloseTo(1.45, 6);
    expect(rigidInfluenceFactor("rectangular", 20)).toBe(2.1);
  });
});

describe("immediateSettlement", () => {
  it("zapata cuadrada: Se = qB(1 − ν²)Ir/Es", () => {
    const r = immediateSettlement({
      pressure: 150,
      width: 2,
      shape: "cuadrada",
      elasticModulus: 15000,
      poisson: 0.3,
    });
    expect(r.settlement).toBeCloseTo((150 * 2 * 0.91 * 0.82) / 15000, 9);
  });

  it("rechaza datos inválidos", () => {
    expect(() =>
      immediateSettlement({ pressure: 100, width: 2, shape: "cuadrada", elasticModulus: 0, poisson: 0.3 }),
    ).toThrow(/módulo/);
    expect(() =>
      immediateSettlement({ pressure: 100, width: 2, shape: "rectangular", length: 1, elasticModulus: 1e4, poisson: 0.3 }),
    ).toThrow(/largo/);
  });
});

describe("consolidationSettlement", () => {
  const base = {
    pressure: 100,
    width: 2,
    length: 2,
    depthToMidLayer: 2,
    thickness: 3,
    initialStress: 50,
    voidRatio: 0.9,
    compressionIndex: 0.3,
  };

  it("método 2:1", () => {
    expect(stressIncrement21(100, 2, 2, 2)).toBeCloseTo(25, 9);
    expect(stressIncrement21(100, 2, 2)).toBeCloseTo(50, 9);
  });

  it("arcilla normalmente consolidada", () => {
    const r = consolidationSettlement(base);
    expect(r.increment).toBeCloseTo(25, 9);
    expect(r.settlement).toBeCloseTo((0.3 * 3) / 1.9 * Math.log10(75 / 50), 9);
  });

  it("preconsolidada sin pasar σ'c usa solo Cs", () => {
    const r = consolidationSettlement({ ...base, recompressionIndex: 0.05, preconsolidationStress: 100 });
    expect(r.settlement).toBeCloseTo((0.05 * 3) / 1.9 * Math.log10(75 / 50), 9);
  });

  it("preconsolidada que pasa σ'c usa Cs y Cc", () => {
    const r = consolidationSettlement({ ...base, recompressionIndex: 0.05, preconsolidationStress: 60 });
    const k = 3 / 1.9;
    expect(r.settlement).toBeCloseTo(0.05 * k * Math.log10(60 / 50) + 0.3 * k * Math.log10(75 / 60), 9);
  });

  it("pide Cs cuando hay preconsolidación", () => {
    expect(() => consolidationSettlement({ ...base, preconsolidationStress: 60 })).toThrow(/Cs/);
  });
});

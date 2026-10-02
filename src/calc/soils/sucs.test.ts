import { describe, expect, it } from "vitest";
import { classifySucs } from "./sucs";

describe("classifySucs", () => {
  it.each([
    // Suelos finos (≥ 50 % pasa la No. 200)
    [{ passingNo200: 80, passingNo4: 100, liquidLimit: 40, plasticLimit: 20 }, "CL"],
    [{ passingNo200: 80, passingNo4: 100, liquidLimit: 70, plasticLimit: 30 }, "CH"],
    [{ passingNo200: 80, passingNo4: 100, liquidLimit: 60, plasticLimit: 40 }, "MH"],
    [{ passingNo200: 80, passingNo4: 100, liquidLimit: 30, plasticLimit: 25 }, "ML"],
    [{ passingNo200: 80, passingNo4: 100, liquidLimit: 25, plasticLimit: 19 }, "CL-ML"],
    [{ passingNo200: 70, passingNo4: 100 }, "ML"],
    // Gruesos limpios (< 5 % de finos)
    [{ passingNo200: 2, passingNo4: 30, uniformity: 6, curvature: 2 }, "GW"],
    [{ passingNo200: 2, passingNo4: 30, uniformity: 3, curvature: 2 }, "GP"],
    [{ passingNo200: 3, passingNo4: 90, uniformity: 7, curvature: 1.5 }, "SW"],
    [{ passingNo200: 3, passingNo4: 90, uniformity: 5, curvature: 1.5 }, "SP"],
    // Gruesos con finos (> 12 %)
    [{ passingNo200: 25, passingNo4: 85, liquidLimit: 30, plasticLimit: 25 }, "SM"],
    [{ passingNo200: 25, passingNo4: 85, liquidLimit: 40, plasticLimit: 20 }, "SC"],
    [{ passingNo200: 25, passingNo4: 85, liquidLimit: 25, plasticLimit: 19 }, "SC-SM"],
    [{ passingNo200: 20, passingNo4: 40, liquidLimit: 40, plasticLimit: 20 }, "GC"],
    // Símbolo doble (5 a 12 % de finos)
    [{ passingNo200: 8, passingNo4: 90, liquidLimit: 30, plasticLimit: 26, uniformity: 7, curvature: 2 }, "SW-SM"],
    [{ passingNo200: 8, passingNo4: 90, liquidLimit: 40, plasticLimit: 20, uniformity: 3, curvature: 2 }, "SP-SC"],
    [{ passingNo200: 10, passingNo4: 30, liquidLimit: 25, plasticLimit: 19, uniformity: 5, curvature: 2 }, "GW-GC"],
  ])("%o → %s", (input, symbol) => {
    expect(classifySucs(input).symbol).toBe(symbol);
  });

  it("calcula IP, línea A y fracciones", () => {
    const r = classifySucs({ passingNo200: 40, passingNo4: 75, liquidLimit: 45, plasticLimit: 20 });
    expect(r.plasticityIndex).toBe(25);
    expect(r.aLine).toBeCloseTo(18.25, 6);
    expect(r.gravel).toBe(25);
    expect(r.sand).toBe(35);
    expect(r.fines).toBe(40);
    expect(r.name).toBe("Arena arcillosa");
  });

  it("pide Cu y Cc cuando hay 12 % de finos o menos", () => {
    expect(() => classifySucs({ passingNo200: 3, passingNo4: 90 })).toThrow(/Cu y Cc/);
  });

  it.each([
    [{ passingNo200: 120, passingNo4: 100 }, /No. 200/],
    [{ passingNo200: 60, passingNo4: 50 }, /no puede ser mayor/],
    [{ passingNo200: 60, passingNo4: 100, liquidLimit: 40 }, /ambos límites/],
    [{ passingNo200: 60, passingNo4: 100, liquidLimit: 20, plasticLimit: 30 }, /límite plástico/],
  ])("rechaza datos inválidos %o", (input, message) => {
    expect(() => classifySucs(input)).toThrow(message);
  });
});

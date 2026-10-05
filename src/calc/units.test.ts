import { describe, expect, it } from "vitest";
import { fromKNm3, fromKPa, toKNm3, toKPa } from "./units";

describe("unidades", () => {
  it("1 t/m² = 9.80665 kPa y 1 kg/cm² = 98.0665 kPa", () => {
    expect(toKPa(1, "t/m²")).toBeCloseTo(9.80665, 9);
    expect(toKPa(1, "kg/cm²")).toBeCloseTo(98.0665, 9);
    expect(fromKPa(98.0665, "t/m²")).toBeCloseTo(10, 9);
  });

  it("1 t/m³ = 9.80665 kN/m³", () => {
    expect(toKNm3(1.8, "t/m³")).toBeCloseTo(17.65197, 5);
    expect(fromKNm3(toKNm3(1.8, "t/m³"), "t/m³")).toBeCloseTo(1.8, 9);
  });
});

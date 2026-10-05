import { describe, expect, it } from "vitest";
import { profundidadesTabla, tablaDiseno } from "./tabla-diseno";
import { terzaghiFactors } from "./terzaghi";

describe("profundidadesTabla", () => {
  it("toma la capturada y ±0.5 m", () => {
    expect(profundidadesTabla(1.2)).toEqual([0.7, 1.2, 1.7]);
  });
  it("no baja de 0.3 m", () => {
    expect(profundidadesTabla(0.6)).toEqual([0.3, 0.6, 1.1]);
    expect(profundidadesTabla(0.3)).toEqual([0.3, 0.8]);
    expect(profundidadesTabla(0.2)).toEqual([0.2, 0.7]);
  });
});

describe("tablaDiseno", () => {
  it("calcula qa con Terzaghi para cada ancho y profundidad", () => {
    // Arena sin cohesión, φ = 30°, γ = 18 kN/m³, zapata cuadrada, FS = 3.
    // Para Df = 1.0 m y B = 1.5 m: qu = q·Nq + 0.4·γ·B·Nγ
    //   q = 18·1.0 = 18 kPa; Nq(30°) ≈ 22.46; Nγ(30°) = 19.13
    //   qu ≈ 18·22.46 + 0.4·18·1.5·19.13 ≈ 404.3 + 206.6 = 610.9 kPa → qa ≈ 203.6 kPa
    const t = tablaDiseno({ cohesion: 0, frictionAngle: 30, unitWeight: 18, depth: 1, width: 1.5, shape: "cuadrada" });
    expect(t.profundidades).toEqual([0.5, 1, 1.5]);
    expect(t.anchos).toHaveLength(8);
    const { Nq, Ngamma } = terzaghiFactors(30);
    const j = t.anchos.indexOf(1.5);
    expect(t.qa[1][j]).toBeCloseTo((18 * Nq + 0.4 * 18 * 1.5 * Ngamma) / 3, 6);
    expect(t.qa[1][j]).toBeCloseTo(203.6, 0);
    // Más ancho y más profundo da más capacidad en arena.
    expect(t.qa[2][j]!).toBeGreaterThan(t.qa[1][j]!);
    expect(t.qa[1][j + 1]!).toBeGreaterThan(t.qa[1][j]!);
  });

  it("marca con null lo que no se puede calcular", () => {
    const t = tablaDiseno({ cohesion: -1, frictionAngle: 30, unitWeight: 18, depth: 1, width: 1.5, shape: "cuadrada" });
    expect(t.qa.flat().every((x) => x === null)).toBe(true);
  });
});

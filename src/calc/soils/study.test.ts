import { describe, expect, it } from "vitest";
import { runSoilStudy, type SoilStudyInput } from "./study";

const input: SoilStudyInput = {
  sucs: { passingNo200: 35, passingNo4: 90, liquidLimit: 32, plasticLimit: 20 },
  bearing: {
    cohesion: 20,
    frictionAngle: 28,
    unitWeight: 18,
    depth: 1.2,
    width: 1.5,
    shape: "cuadrada",
  },
  settlement: { elasticModulus: 15000, poisson: 0.3 },
};

describe("runSoilStudy", () => {
  it("calcula las tres partes y usa qa como presión de contacto", () => {
    const r = runSoilStudy(input);
    expect(r.sucs.ok && r.sucs.value.symbol).toBe("SC");
    expect(r.bearing.ok).toBe(true);
    expect(r.settlement.ok).toBe(true);
    if (!r.bearing.ok || !r.settlement.ok) return;
    expect(r.settlement.value.pressure).toBeCloseTo(r.bearing.value.allowable, 9);
    expect(r.settlement.value.total).toBeCloseTo(r.settlement.value.immediate.settlement, 12);
  });

  it("suma la consolidación al asentamiento total", () => {
    const r = runSoilStudy({
      ...input,
      settlement: {
        ...input.settlement,
        consolidation: {
          depthToMidLayer: 2,
          thickness: 3,
          initialStress: 50,
          voidRatio: 0.9,
          compressionIndex: 0.3,
        },
      },
    });
    if (!r.settlement.ok) throw new Error(r.settlement.error);
    const s = r.settlement.value;
    expect(s.consolidation).toBeDefined();
    expect(s.total).toBeCloseTo(s.immediate.settlement + (s.consolidation?.settlement ?? 0), 12);
  });

  it("trata la zapata corrida como rectangular L/B = 10 para el asentamiento", () => {
    const r = runSoilStudy({ ...input, bearing: { ...input.bearing, shape: "corrida" } });
    if (!r.settlement.ok) throw new Error(r.settlement.error);
    expect(r.settlement.value.shape).toBe("rectangular");
    expect(r.settlement.value.immediate.influence).toBeCloseTo(2.1, 6);
  });

  it("un error en una parte no impide calcular las demás", () => {
    const r = runSoilStudy({ ...input, sucs: { passingNo200: 150, passingNo4: 90 } });
    expect(r.sucs.ok).toBe(false);
    expect(r.bearing.ok).toBe(true);
  });

  it("sin capacidad de carga ni presión no hay asentamiento", () => {
    const r = runSoilStudy({ ...input, bearing: { ...input.bearing, width: 0 } });
    expect(r.settlement.ok).toBe(false);
  });
});

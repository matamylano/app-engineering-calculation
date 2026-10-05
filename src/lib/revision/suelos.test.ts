import { describe, expect, it } from "vitest";
import { runSoilStudy } from "@/calc/soils/study";
import {
  entradaDesdeFormulario,
  FORMULARIO_INICIAL,
  unitsOf,
  type FormularioSuelos,
} from "@/lib/estudios/suelos";
import { EJEMPLOS_SUELOS, revisionesSuelos } from "./suelos";
import { cumpleRevision } from "./tipos";

const calcular = (valores: Partial<FormularioSuelos>) => {
  const f = { ...FORMULARIO_INICIAL, ...valores };
  const e = entradaDesdeFormulario(f);
  const r = runSoilStudy(e);
  const ok = r.sucs.ok && r.bearing.ok && r.settlement.ok;
  return { f, e, r, ok, rev: revisionesSuelos(e, r, unitsOf(f)) };
};

describe("revisiones del estudio de suelos", () => {
  it.each(EJEMPLOS_SUELOS)("el ejemplo «$nombre» da lo que promete", (ej) => {
    const c = calcular(ej.valores);
    expect(c.ok).toBe(true);
    expect(c.rev.length).toBeGreaterThan(0);
    expect(c.rev.every(cumpleRevision)).toBe(ej.cumple);
  });

  it("con qa como presión, todas pasan exactamente cuando el motor no reporta problemas", () => {
    let vistas = 0;
    let fallan = 0;
    for (const unitsId of ["obra", "si"])
      for (const shape of ["cuadrada", "corrida", "circular"] as const)
        for (const b of ["0.6", "1.5", "3"])
          for (const es of ["300", "1500", "5000"])
            for (const hasClay of [false, true]) {
              const c = calcular({
                unitsId,
                shape,
                hasClay,
                useQa: true,
                values: {
                  ...FORMULARIO_INICIAL.values,
                  b,
                  es: unitsId === "si" ? String(Number(es) * 9.80665) : es,
                  ...(hasClay
                    ? { z: "2", h: "3", s0: "3", e0: "1.2", ccomp: "0.4" }
                    : {}),
                },
              });
              if (!c.ok) continue;
              vistas++;
              const sinProblemas = (c.r.problemas ?? []).length === 0;
              if (!sinProblemas) fallan++;
              expect(
                c.rev.every(cumpleRevision),
                `${unitsId} ${shape} B${b} Es${es} arcilla ${hasClay}`,
              ).toBe(sinProblemas);
            }
    expect(vistas).toBeGreaterThan(100);
    expect(fallan).toBeGreaterThan(0);
    expect(fallan).toBeLessThan(vistas);
  });

  it("con presión capturada, además exige q ≤ qa", () => {
    let vistas = 0;
    for (const pressure of ["2", "8", "20", "60"])
      for (const b of ["0.8", "1.5", "2.5"])
        for (const phi of ["10", "28"]) {
          const c = calcular({
            useQa: false,
            values: { ...FORMULARIO_INICIAL.values, pressure, b, phi },
          });
          if (!c.ok || !c.r.bearing.ok) continue;
          vistas++;
          const esperado =
            (c.r.problemas ?? []).length === 0 &&
            c.e.settlement.pressure! <= c.r.bearing.value.allowable;
          expect(c.rev.every(cumpleRevision)).toBe(esperado);
        }
    expect(vistas).toBeGreaterThan(10);
  });

  it("sin cálculo completo no hay revisiones", () => {
    const c = calcular({ values: { ...FORMULARIO_INICIAL.values, b: "" } });
    expect(c.rev).toEqual([]);
  });
});

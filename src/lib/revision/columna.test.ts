import { describe, expect, it } from "vitest";
import { disenarColumna } from "@/calc/concreto/columna";
import {
  entradaColumna,
  FORMULARIO_COLUMNA_INICIAL,
} from "@/lib/estudios/columna";
import { EJEMPLOS_COLUMNA, revisionesColumna } from "./columna";
import { cumpleRevision } from "./tipos";

const calcular = (valores: object) => {
  const e = entradaColumna({ ...FORMULARIO_COLUMNA_INICIAL, ...valores });
  try {
    return { e, r: disenarColumna(e) };
  } catch {
    return null;
  }
};

describe("revisiones de la columna", () => {
  it.each(EJEMPLOS_COLUMNA)("el ejemplo «$nombre» da lo que promete", (ej) => {
    const c = calcular(ej.valores);
    expect(c).not.toBeNull();
    expect(c!.r.cumple).toBe(ej.cumple);
    expect(revisionesColumna(c!.e, c!.r).every(cumpleRevision)).toBe(ej.cumple);
  });

  it("todas pasan exactamente cuando la columna cumple", () => {
    let vistas = 0;
    let cumplen = 0;
    for (const carga of [20, 60, 150, 300])
      for (const [b, h] of [
        [20, 20],
        [25, 40],
        [30, 30],
        [40, 40],
        [50, 60],
      ])
        for (const altura of [2.5, 3.5, 5])
          for (const [momento, momentoB] of [
            ["0", ""],
            ["4", ""],
            ["15", ""],
            ["4", "3"],
            ["15", "10"],
          ])
            for (const varilla of ["5", "8"]) {
              const c = calcular({
                carga: String(carga),
                b: String(b),
                h: String(h),
                altura: String(altura),
                momento,
                momentoB,
                varilla,
              });
              if (!c) continue;
              vistas++;
              if (c.r.cumple) cumplen++;
              expect(
                revisionesColumna(c.e, c.r).every(cumpleRevision),
                `${carga} t, ${b}×${h}, ${altura} m, M ${momento}/${momentoB}, #${varilla}`,
              ).toBe(c.r.cumple);
            }
    expect(vistas).toBeGreaterThan(100);
    expect(cumplen).toBeGreaterThan(10);
    expect(vistas - cumplen).toBeGreaterThan(10);
  });
});

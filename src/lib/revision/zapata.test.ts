import { describe, expect, it } from "vitest";
import { disenarZapata } from "@/calc/concreto/zapata";
import {
  entradaZapata,
  FORMULARIO_ZAPATA_INICIAL,
} from "@/lib/estudios/zapata";
import { cumpleRevision } from "./tipos";
import { EJEMPLOS_ZAPATA, revisionesZapata } from "./zapata";

const calcular = (valores: object) => {
  const e = entradaZapata({ ...FORMULARIO_ZAPATA_INICIAL, ...valores });
  try {
    return { e, r: disenarZapata(e) };
  } catch {
    return null;
  }
};

describe("revisiones de la zapata", () => {
  it.each(EJEMPLOS_ZAPATA)("el ejemplo «$nombre» da lo que promete", (ej) => {
    const c = calcular(ej.valores);
    expect(c).not.toBeNull();
    expect(c!.r.cumple).toBe(ej.cumple);
    expect(revisionesZapata(c!.e, c!.r).every(cumpleRevision)).toBe(ej.cumple);
  });

  it("todas pasan exactamente cuando la zapata cumple", () => {
    let vistas = 0;
    let cumplen = 0;
    for (const carga of [10, 30, 60, 120])
      for (const qa of [5, 12, 25])
        for (const h of [20, 30, 50])
          for (const [lado, largo] of [
            ["", ""],
            ["1.2", ""],
            ["2.5", ""],
            ["1.5", "2"],
            ["2.2", "3"],
          ])
            for (const momento of ["", "3", "12"]) {
              const c = calcular({
                carga: String(carga),
                cargaUltima: String(carga * 1.4),
                qa: String(qa),
                h: String(h),
                lado,
                largo,
                momento,
                c1: "35",
                c2: "40",
              });
              if (!c) continue;
              vistas++;
              if (c.r.cumple) cumplen++;
              expect(
                revisionesZapata(c.e, c.r).every(cumpleRevision),
                `${carga} t, qa ${qa}, h ${h}, ${lado}×${largo}, M ${momento}`,
              ).toBe(c.r.cumple);
            }
    expect(vistas).toBeGreaterThan(100);
    expect(cumplen).toBeGreaterThan(10);
    expect(vistas - cumplen).toBeGreaterThan(10);
  });
});

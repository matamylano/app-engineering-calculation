import { describe, expect, it } from "vitest";
import { disenarViga } from "@/calc/concreto/viga";
import { entradaViga, FORMULARIO_VIGA_INICIAL } from "@/lib/estudios/viga";
import { cumpleRevision } from "./tipos";
import { EJEMPLOS_VIGA, revisionesViga } from "./viga";

const calcular = (valores: object) => {
  const e = entradaViga({ ...FORMULARIO_VIGA_INICIAL, ...valores });
  try {
    return { e, r: disenarViga(e) };
  } catch {
    return null;
  }
};

describe("revisiones de la viga", () => {
  it.each(EJEMPLOS_VIGA)("el ejemplo «$nombre» da lo que promete", (ej) => {
    const c = calcular(ej.valores);
    expect(c).not.toBeNull();
    expect(c!.r.cumple).toBe(ej.cumple);
  });

  it("todas pasan exactamente cuando la viga cumple", () => {
    let vistas = 0;
    for (const apoyo of [
      "simple",
      "un-extremo-continuo",
      "ambos-continuos",
      "voladizo",
    ])
      for (const claro of [2, 4, 6, 8, 10])
        for (const [b, h] of [
          [15, 25],
          [20, 30],
          [25, 40],
          [30, 60],
          [20, 70],
        ])
          for (const muerta of [0.5, 2, 5]) {
            const c = calcular({
              apoyo,
              claro: String(claro),
              b: String(b),
              h: String(h),
              muerta: String(muerta),
              tributaria: false,
            });
            if (!c) continue;
            vistas++;
            expect(
              revisionesViga(c.e, c.r).every(cumpleRevision),
              `${apoyo} ${claro} ${b}x${h} ${muerta}`,
            ).toBe(c.r.cumple);
          }
    expect(vistas).toBeGreaterThan(100);
  });
});

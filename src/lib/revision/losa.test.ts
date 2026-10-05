import { describe, expect, it } from "vitest";
import { disenarLosa } from "@/calc/concreto/losa";
import { entradaLosa, FORMULARIO_LOSA_INICIAL } from "@/lib/estudios/losa";
import { EJEMPLOS_LOSA, revisionesLosa } from "./losa";
import { cumpleRevision } from "./tipos";

const calcular = (valores: object) => {
  const e = entradaLosa({ ...FORMULARIO_LOSA_INICIAL, ...valores });
  try {
    return { e, r: disenarLosa(e) };
  } catch {
    return null;
  }
};

describe("revisiones de la losa", () => {
  it.each(EJEMPLOS_LOSA)("el ejemplo «$nombre» da lo que promete", (ej) => {
    const c = calcular(ej.valores);
    expect(c).not.toBeNull();
    expect(c!.r.cumple).toBe(ej.cumple);
    expect(revisionesLosa(c!.e, c!.r).every(cumpleRevision)).toBe(ej.cumple);
  });

  it("todas pasan exactamente cuando la losa cumple", () => {
    let vistas = 0;
    let fallan = 0;
    for (const apoyo of [
      "simple",
      "un-extremo-continuo",
      "ambos-continuos",
      "voladizo",
    ])
      for (const claro of [1, 2, 3, 4.5, 6])
        for (const h of [8, 10, 12, 15, 20])
          for (const [muerta, viva] of [
            [100, 170],
            [300, 350],
            [1200, 500],
          ])
            for (const varilla of ["3", "4"]) {
              const c = calcular({
                apoyo,
                claro: String(claro),
                h: String(h),
                muerta: String(muerta),
                viva: String(viva),
                varilla,
              });
              if (!c) continue;
              vistas++;
              if (!c.r.cumple) fallan++;
              expect(
                revisionesLosa(c.e, c.r).every(cumpleRevision),
                `${apoyo} ${claro} h${h} ${muerta}/${viva} #${varilla}`,
              ).toBe(c.r.cumple);
            }
    expect(vistas).toBeGreaterThan(100);
    expect(fallan).toBeGreaterThan(0);
  });
});

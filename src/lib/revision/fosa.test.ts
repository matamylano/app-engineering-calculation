import { describe, expect, it } from "vitest";
import { disenarFosa } from "@/calc/drenaje/fosa";
import { entradaFosa, FORMULARIO_FOSA_INICIAL } from "@/lib/estudios/fosa";
import { EJEMPLOS_FOSA, revisionesFosa } from "./fosa";
import { cumpleRevision } from "./tipos";

const calcular = (valores: object) => {
  const e = entradaFosa({ ...FORMULARIO_FOSA_INICIAL, ...valores });
  try {
    return { e, r: disenarFosa(e) };
  } catch {
    return null;
  }
};

describe("revisiones de la fosa séptica", () => {
  it.each(EJEMPLOS_FOSA)("el ejemplo «$nombre» da lo que promete", (ej) => {
    const c = calcular(ej.valores);
    expect(c).not.toBeNull();
    expect(c!.r.cumple).toBe(ej.cumple);
    expect(revisionesFosa(c!.e, c!.r).every(cumpleRevision)).toBe(ej.cumple);
  });

  it("todas pasan exactamente cuando la fosa cumple", () => {
    let vistas = 0;
    let fallan = 0;
    for (const habitantes of [1, 4, 8, 15, 30, 60])
      for (const aportacion of [80, 150, 250])
        for (const limpieza of [1, 3, 5])
          for (const temperatura of [8, 18, 28])
            for (const profundidad of [0.9, 1.2, 1.5, 1.8, 2.2, 2.5, 2.8, 3.3])
              for (const [disposicion, trampa] of [
                ["zanjas", ""],
                ["pozo", "si"],
              ]) {
                const c = calcular({
                  habitantes: String(habitantes),
                  aportacion: String(aportacion),
                  limpieza: String(limpieza),
                  temperatura: String(temperatura),
                  profundidad: String(profundidad),
                  tasaAplicacion: "25",
                  disposicion,
                  diametroPozo: "1.2",
                  profundidadMaximaPozo: "3",
                  trampa,
                  metodoTrampa: habitantes > 10 ? "gasto" : "personas",
                });
                if (!c) continue;
                vistas++;
                if (!c.r.cumple) fallan++;
                expect(
                  revisionesFosa(c.e, c.r).every(cumpleRevision),
                  `${habitantes} ${aportacion} ${limpieza} ${temperatura} ${profundidad} ${disposicion}`,
                ).toBe(c.r.cumple);
              }
    expect(vistas).toBeGreaterThan(100);
    expect(fallan).toBeGreaterThan(0);
    expect(fallan).toBeLessThan(vistas);
  });
});

import { describe, expect, it } from "vitest";
import { disenarPluvial } from "@/calc/drenaje/pluvial";
import {
  entradaPluvial,
  FORMULARIO_PLUVIAL_INICIAL,
} from "@/lib/estudios/pluvial";
import { EJEMPLOS_PLUVIAL, revisionesPluvial } from "./pluvial";
import { cumpleRevision } from "./tipos";

const calcular = (valores: object) => {
  const e = entradaPluvial({ ...FORMULARIO_PLUVIAL_INICIAL, ...valores });
  try {
    return { e, r: disenarPluvial(e) };
  } catch {
    return null;
  }
};

describe("revisiones del drenaje pluvial", () => {
  it.each(EJEMPLOS_PLUVIAL)("el ejemplo «$nombre» da lo que promete", (ej) => {
    const c = calcular(ej.valores);
    expect(c).not.toBeNull();
    expect(c!.r.cumple).toBe(ej.cumple);
    expect(revisionesPluvial(c!.e, c!.r).every(cumpleRevision)).toBe(ej.cumple);
  });

  it("los nombres de las revisiones no se repiten", () => {
    const c = calcular(EJEMPLOS_PLUVIAL[0].valores)!;
    const n = revisionesPluvial(c.e, c.r).map((r) => r.nombre);
    expect(new Set(n).size).toBe(n.length);
  });

  it("todas pasan exactamente cuando el drenaje cumple", () => {
    let vistas = 0;
    let fallan = 0;
    for (const azotea of [0, 80, 400, 2500, 12000])
      for (const pavimento of [0, 300, 6000])
        for (const intensidad of [60, 120, 200])
          for (const pendiente of [0.5, 2])
            for (const infiltracion of ["", "2", "15", "80"])
              for (const diametroBajada of ["75", "150"]) {
                const c = calcular({
                  areas: {
                    azotea: String(azotea),
                    pavimento: String(pavimento),
                    jardin: "50",
                  },
                  intensidad: String(intensidad),
                  pendiente: String(pendiente),
                  infiltracion,
                  diametroBajada,
                  diametroPozo: "1.2",
                  profundidadPozo: "4",
                });
                if (!c) continue;
                vistas++;
                if (!c.r.cumple) fallan++;
                expect(
                  revisionesPluvial(c.e, c.r).every(cumpleRevision),
                  `${azotea} ${pavimento} ${intensidad} ${pendiente} ${infiltracion} ${diametroBajada}`,
                ).toBe(c.r.cumple);
              }
    expect(vistas).toBeGreaterThan(100);
    expect(fallan).toBeGreaterThan(0);
    expect(fallan).toBeLessThan(vistas);
  });
});

import { describe, expect, it } from "vitest";
import { disenarCasa } from "@/calc/hidrosanitaria/casa";
import {
  entradaHidrosanitaria,
  FORMULARIO_HIDROSANITARIA_INICIAL,
} from "@/lib/estudios/hidrosanitaria";
import {
  EJEMPLOS_HIDROSANITARIA,
  revisionesHidrosanitaria,
} from "./hidrosanitaria";
import { cumpleRevision } from "./tipos";

const calcular = (valores: object) => {
  const e = entradaHidrosanitaria({
    ...FORMULARIO_HIDROSANITARIA_INICIAL,
    ...valores,
  });
  try {
    return { e, r: disenarCasa(e) };
  } catch {
    return null;
  }
};

describe("revisiones de la instalación hidrosanitaria", () => {
  it.each(EJEMPLOS_HIDROSANITARIA)(
    "el ejemplo «$nombre» da lo que promete",
    (ej) => {
      const c = calcular(ej.valores);
      expect(c).not.toBeNull();
      expect(c!.r.cumple).toBe(ej.cumple);
      expect(revisionesHidrosanitaria(c!.e, c!.r).every(cumpleRevision)).toBe(
        ej.cumple,
      );
    },
  );

  it("todas pasan exactamente cuando la instalación cumple", () => {
    let vistas = 0;
    let fallan = 0;
    const base = FORMULARIO_HIDROSANITARIA_INICIAL.muebles;
    for (const habitantes of [3, 6, 12])
      for (const banos of [1, 3, 8])
        for (const alturaTinaco of [1, 2.5, 4, 8])
          for (const longitudTinaco of [5, 20, 60])
            for (const [alturaBombeo, tiempoLlenado] of [
              [5, 30],
              [12, 10],
              [30, 3],
              [45, 5],
            ])
              for (const calentador of [
                "ninguno",
                "paso",
                "deposito",
                "solar",
              ]) {
                const c = calcular({
                  habitantes: String(habitantes),
                  muebles: {
                    ...base,
                    excusado: String(banos * 2),
                    lavabo: String(banos * 2),
                    regadera: String(banos),
                  },
                  alturaTinaco: String(alturaTinaco),
                  longitudTinaco: String(longitudTinaco),
                  alturaBombeo: String(alturaBombeo),
                  tiempoLlenado: String(tiempoLlenado),
                  diasTinaco: tiempoLlenado < 10 ? "3" : "1",
                  calentador,
                });
                if (!c) continue;
                vistas++;
                if (!c.r.cumple) fallan++;
                expect(
                  revisionesHidrosanitaria(c.e, c.r).every(cumpleRevision),
                  JSON.stringify(c.e),
                ).toBe(c.r.cumple);
              }
    expect(vistas).toBeGreaterThan(100);
    expect(fallan).toBeGreaterThan(10);
  });
});

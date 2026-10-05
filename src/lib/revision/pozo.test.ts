import { describe, expect, it } from "vitest";
import { disenarPozo } from "@/calc/pozos/pozo";
import { entradaPozo, FORMULARIO_POZO_INICIAL } from "@/lib/estudios/pozo";
import { EJEMPLOS_POZO, revisionesPozo } from "./pozo";
import { cumpleRevision } from "./tipos";

const calcular = (valores: object) => {
  const e = entradaPozo({ ...FORMULARIO_POZO_INICIAL, ...valores });
  try {
    return { e, r: disenarPozo(e) };
  } catch {
    return null;
  }
};

describe("revisiones del pozo", () => {
  it.each(EJEMPLOS_POZO)("el ejemplo «$nombre» da lo que promete", (ej) => {
    const c = calcular(ej.valores);
    expect(c).not.toBeNull();
    expect(c!.r.cumple).toBe(ej.cumple);
    expect(revisionesPozo(c!.e, c!.r).every(cumpleRevision)).toBe(ej.cumple);
  });

  it("los ejemplos traen sus propias lecturas", () => {
    for (const ej of EJEMPLOS_POZO)
      expect(ej.valores.lecturas!.length).toBeGreaterThanOrEqual(3);
  });

  it("todas pasan exactamente cuando el pozo cumple", () => {
    let vistas = 0;
    let fallan = 0;
    for (const gastoDiseno of [2, 8, 20, 40, 60, 90])
      for (const profundidad of [40, 60, 100, 300])
        for (const nivelEstatico of [10, 30, 80])
          for (const horasBombeo of [8, 24, 2000])
            for (const volumenConcesionado of ["", "50000", "500000"])
              for (const cargaDescarga of [5, 400]) {
                const c = calcular({
                  gastoDiseno: String(gastoDiseno),
                  profundidad: String(profundidad),
                  nivelEstatico: String(nivelEstatico),
                  horasBombeo: String(horasBombeo),
                  volumenConcesionado,
                  cargaDescarga: String(cargaDescarga),
                });
                if (!c) continue;
                vistas++;
                if (!c.r.cumple) fallan++;
                expect(
                  revisionesPozo(c.e, c.r).every(cumpleRevision),
                  JSON.stringify(c.e),
                ).toBe(c.r.cumple);
              }
    expect(vistas).toBeGreaterThan(100);
    expect(fallan).toBeGreaterThan(10);
  });

  it("la colocación al metro entero coincide con el fondo del pozo", () => {
    const base = calcular(EJEMPLOS_POZO[0].valores)!;
    const k = base.r.colocacion;
    const vistos = new Set<boolean>();
    for (const d of [-0.5, 0, 0.001, 0.5, 1, 1.5]) {
      const c = calcular({
        ...EJEMPLOS_POZO[0].valores,
        profundidad: String(k + d),
      });
      if (!c) continue;
      expect(c.r.colocacion).toBe(k);
      const ok = revisionesPozo(c.e, c.r).every(cumpleRevision);
      expect(ok, `profundidad ${k + d}`).toBe(c.r.cumple);
      vistos.add(ok);
    }
    expect(vistos.size).toBe(2);
  });
});

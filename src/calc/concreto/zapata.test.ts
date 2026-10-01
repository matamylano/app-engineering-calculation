import { describe, expect, it } from "vitest";
import { disenarZapata, type EntradaZapata } from "./zapata";

const base: EntradaZapata = {
  carga: 20,
  cargaUltima: 28,
  qa: 10,
  incremento: 0.1,
  c1: 30,
  c2: 30,
  h: 30,
  recubrimiento: 5,
  fc: 250,
  fy: 4200,
  varilla: 4,
};

describe("disenarZapata", () => {
  // Revisado a mano: B = √(22/10) = 1.483 → 1.50 m; qu = 28/2.25 = 12.44 t/m²;
  // d = 30 − 5 − 1.5·1.27 = 23.10 cm.
  it("dimensiona y revisa una zapata cuadrada", () => {
    const r = disenarZapata(base);
    expect(r.ladoMinimo).toBe(1.5);
    expect(r.lado).toBe(1.5);
    expect(r.presionServicio).toBeCloseTo(9.778, 3);
    expect(r.presionUltima).toBeCloseTo(12.444, 3);
    expect(r.d).toBeCloseTo(23.095, 3);

    // Penetración: bo = 4·53.1 = 212.4 cm; Vu = 1.244·(150² − 53.1²) = 24.49 t; vu = 4.99 kg/cm².
    expect(r.penetracion.perimetro).toBeCloseTo(212.38, 2);
    expect(r.penetracion.actuante).toBeCloseTo(4.993, 2);
    expect(r.penetracion.resistente).toBeCloseTo(0.75 * Math.sqrt(250), 6);
    expect(r.penetracion.cumple).toBe(true);

    // Viga ancha a d de la cara: Vu = 1.244·150·(60 − 23.1) = 6.89 t; VcR = 0.375·√250·150·23.1 = 20.54 t.
    expect(r.vigaAncha.actuante).toBeCloseTo(6.889, 2);
    expect(r.vigaAncha.resistente).toBeCloseTo(20.54, 1);

    // Flexión: Mu = 1.244·150·60²/2 = 3.36 t·m; As = 3.89 cm² < As,min = 0.7√250/4200·150·23.1 = 9.13 cm².
    expect(r.momento).toBeCloseTo(3.36, 3);
    expect(r.aceroFlexion).toBeCloseTo(3.89, 2);
    expect(r.aceroMinimo).toBeCloseTo(9.129, 2);
    expect(r.aceroDiseno).toBe(r.aceroMinimo);

    // 9.13 / 1.27 = 7.2 → 8 varillas #4 en 140 cm: a cada 20 cm.
    expect(r.armado).toEqual({ varilla: 4, cantidad: 8, separacion: 20, areaColocada: 8 * 1.27 });
    expect(r.cumple).toBe(true);
  });

  it("usa el lado dado si alcanza y avisa si no", () => {
    expect(disenarZapata({ ...base, lado: 1.8 }).lado).toBe(1.8);
    expect(() => disenarZapata({ ...base, lado: 1.2 })).toThrow(/al menos 1.50/);
  });

  it("marca la penetración cuando el peralte no alcanza", () => {
    const r = disenarZapata({ ...base, carga: 80, cargaUltima: 112, h: 20 });
    expect(r.penetracion.cumple).toBe(false);
    expect(r.cumple).toBe(false);
  });

  it("gobierna la flexión con cargas grandes", () => {
    const r = disenarZapata({ ...base, carga: 60, cargaUltima: 84, varilla: 5 });
    expect(r.aceroFlexion).toBeGreaterThan(r.aceroMinimo);
    expect(r.armado.areaColocada).toBeGreaterThanOrEqual(r.aceroDiseno);
    expect(r.armado).toMatchObject({ varilla: 5, cantidad: 15, separacion: 17.5 });
    expect(r.armado.separacion).toBeLessThanOrEqual(Math.min(50, 3.5 * 30));
  });

  it("rechaza datos imposibles", () => {
    expect(() => disenarZapata({ ...base, cargaUltima: 10 })).toThrow(/no puede ser menor/);
    expect(() => disenarZapata({ ...base, varilla: 7 })).toThrow(/Varilla/);
    expect(() => disenarZapata({ ...base, h: 10 })).toThrow(/peralte/);
  });
});

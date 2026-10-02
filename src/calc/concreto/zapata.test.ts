import { describe, expect, it } from "vitest";
import { cuantificarZapata, disenarZapata, type EntradaZapata } from "./zapata";

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

  it("da lo mismo con y sin las opciones nuevas apagadas", () => {
    const r = disenarZapata({ ...base, momento: 0 });
    expect(r).toEqual(disenarZapata(base));
    expect(r.largo).toBe(1.5);
    expect(r.presiones).toBeNull();
    expect(r.direcciones.ancho.armado).toEqual(r.direcciones.largo.armado);
    expect(r.problemas).toEqual([]);
  });

  // Revisado a mano: L = 2.00 m; B ≥ 22 / (2 · 10) = 1.10 m; qu = 28 / 2.2 = 12.727 t/m² = 1.2727 kg/cm².
  it("diseña una zapata rectangular en las dos direcciones", () => {
    const r = disenarZapata({ ...base, largo: 2 });
    expect(r.ladoMinimo).toBe(1.1);
    expect(r).toMatchObject({ lado: 1.1, largo: 2, cuadrada: false });
    expect(r.presionServicio).toBeCloseTo(10, 6);
    // Penetración: Vu = 1.2727 · (110 · 200 − 53.095²) = 24.41 t; vu = 24 411 / (212.38 · 23.095) = 4.977.
    expect(r.penetracion.actuante).toBeCloseTo(4.977, 2);

    // Varillas paralelas a L: volado 85 cm en 110 cm de ancho. Vu = 1.2727·110·61.9 = 8.667 t; Mu = 1.2727·110·85²/2 = 5.058 t·m.
    const l = r.direcciones.largo;
    expect(l.volado).toBeCloseTo(85, 9);
    expect(l.vigaAncha.actuante).toBeCloseTo(8.667, 2);
    expect(l.momento).toBeCloseTo(5.0575, 3);
    // As = 5.93 cm² < As,min = 0.002635·110·23.1 = 6.695 → 6 #4 en 100 cm, a cada 20 cm.
    expect(l.aceroFlexion).toBeCloseTo(5.93, 2);
    expect(l.aceroMinimo).toBeCloseTo(6.695, 2);
    expect(l.armado).toMatchObject({ cantidad: 6, separacion: 20 });
    expect(l.factorFranja).toBe(1);

    // Varillas paralelas a B (lado corto): volado 40 cm en 200 cm. Mu = 1.2727·200·40²/2 = 2.036 t·m.
    const b = r.direcciones.ancho;
    expect(b.volado).toBeCloseTo(40, 9);
    expect(b.momento).toBeCloseTo(2.036, 3);
    // Franja central: β = 2/1.1, 2β/(β+1) = 1.290; 12.17 · 1.290 = 15.71 cm² → 13 #4 en 190 cm @ 15.
    expect(b.aceroDiseno).toBeCloseTo(12.172, 2);
    expect(b.factorFranja).toBeCloseTo(1.2903, 3);
    expect(b.armado).toMatchObject({ cantidad: 13, separacion: 15 });
    expect(r.cumple).toBe(true);
  });

  // Revisado a mano: L = 2 m, M = 3 t·m. B ≥ (22/2 + 6·3/2²)/10 = 1.55 m.
  it("revisa presiones y penetración con momento", () => {
    const r = disenarZapata({ ...base, largo: 2, momento: 3 });
    expect(r.lado).toBe(1.55);
    const p = r.presiones!;
    expect(p.excentricidad).toBeCloseTo(3 / 22, 6);
    expect(p.maxima).toBeCloseTo(10, 6);
    expect(p.minima).toBeCloseTo(4.1935, 3);
    // Mu = 3 · 28/20 = 4.2 t·m; qu = 9.032 ± 4.065 t/m².
    expect(p.momentoUltimo).toBeCloseTo(4.2, 6);
    expect(p.maximaUltima).toBeCloseTo(13.097, 3);
    // α = 1 − 1/1.67 = 0.4012; Jc = 2 413 520 cm⁴; v = 0.4012 · 420 000 · 26.55 / Jc = 1.854 kg/cm².
    expect(r.penetracion.alfa).toBeCloseTo(0.4012, 4);
    expect(r.penetracion.porMomento).toBeCloseTo(1.854, 2);
    expect(r.penetracion.directo).toBeCloseTo(5.19, 2);
    // Del lado más cargado la presión crece hacia el borde: el momento pasa del de presión uniforme.
    const l = r.direcciones.largo;
    expect(l.presionBorde).toBeCloseTo(13.097, 3);
    expect(l.momento).toBeGreaterThan((0.90323 * 155 * 85 * 85) / 2 / 1e5);
    expect(r.cumple).toBe(true);
  });

  it("agranda la cuadrada por el momento y avisa si no alcanza", () => {
    // 22/s² + 30/s³ ≤ 10: con 1.90 m da 10.47 y con 1.95 m, 9.83.
    expect(disenarZapata({ ...base, momento: 5 }).lado).toBe(1.95);
    const chica = disenarZapata({ ...base, momento: 5, lado: 1.5 });
    expect(chica.cumple).toBe(false);
    expect(chica.problemas.join()).toMatch(/presión máxima/);
    // e = 5/22 = 0.227 m > L/6 = 0.20 m.
    const corta = disenarZapata({ ...base, momento: 5, largo: 1.2 });
    expect(corta.problemas.join()).toMatch(/tensión/);
    expect(corta.cumple).toBe(false);
  });

  // Revisado a mano: 1.5 × 1.5 × 0.30 = 0.675 m³; plantilla 0.1125 m³; varilla 150 − 10 + 2·12·1.27 = 170.5 cm;
  // 16 varillas · 1.7048 m · 0.997 kg/m = 27.19 kg; cimbra 4 · 1.5 · 0.3 = 1.8 m².
  it("cuantifica la zapata", () => {
    const r = disenarZapata(base);
    const p = cuantificarZapata(base, r, { cimbra: true });
    expect(p.map((x) => x.material)).toEqual(["concreto", "concreto", "acero", "cimbra"]);
    expect(p[0].cantidad).toBeCloseTo(0.675, 6);
    expect(p[1].cantidad).toBeCloseTo(0.1125, 6);
    expect(p[2].cantidad).toBeCloseTo(16 * 1.7048 * 1.27 * 0.785, 3);
    expect(p[3].cantidad).toBeCloseTo(1.8, 6);
    expect(cuantificarZapata(base, r, { cimbra: false })).toHaveLength(3);
    // Rectangular: una partida de acero por dirección.
    const rr = disenarZapata({ ...base, largo: 2 });
    expect(cuantificarZapata(base, rr, { cimbra: false }).filter((x) => x.material === "acero")).toHaveLength(2);
  });
});

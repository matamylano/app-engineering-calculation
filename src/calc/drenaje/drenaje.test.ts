import { describe, expect, it } from "vitest";
import { disenarFosa, type EntradaFosa } from "./fosa";
import {
  capacidadBajada,
  disenarBajadas,
  disenarCaptacion,
  disenarPluvial,
  tuboLleno,
  type EntradaCaptacion,
  type EntradaPluvial,
} from "./pluvial";

const pluvial: EntradaPluvial = {
  areas: { azotea: 120, pavimento: 40, jardin: 60 },
  intensidad: 100,
  duracion: 60,
  pendiente: 1,
  infiltracion: 20,
  diametroPozo: 1.5,
  profundidadPozo: 3,
};

describe("disenarPluvial", () => {
  it("calcula la capacidad de un tubo lleno con Manning", () => {
    // 100 mm al 1 %: v = (1/0.009)·0.025^(2/3)·0.1 = 0.95 m/s; Q = 7.46 L/s.
    const t = tuboLleno(100, 1);
    expect(t.velocidad).toBeCloseTo(0.95, 2);
    expect(t.capacidad).toBeCloseTo(7.46, 1);
  });

  // Revisado a mano: CA = 0.95·120 + 0.85·40 + 0.2·60 = 160 m²; Q = 160·100/3600 = 4.44 L/s.
  it("dimensiona tubería y pozos de absorción", () => {
    const r = disenarPluvial(pluvial);
    expect(r.areaEfectiva).toBeCloseTo(160, 6);
    expect(r.gasto).toBeCloseTo(4.444, 3);
    expect(r.tuberia.diametro).toBe(100);
    // 1 h de tormenta: 16 m³.
    expect(r.volumen).toBeCloseTo(16, 6);
    // Pozo de 1.5 × 3 m: 5.30 m³ y 15.9 m² de infiltración a 0.02 m/h = 0.318 m³/h.
    expect(r.pozos!.almacenamiento).toBeCloseTo(5.301, 3);
    expect(r.pozos!.infiltracion).toBeCloseTo(0.3181, 3);
    expect(r.pozos!.cantidad).toBe(3);
    expect(r.pozos!.vaciado).toBeCloseTo(16.67, 1);
    expect(r.cumple).toBe(true);
  });

  it("sin infiltración no calcula pozos", () => {
    expect(disenarPluvial({ ...pluvial, infiltracion: undefined }).pozos).toBeUndefined();
  });

  it("avisa cuando el suelo infiltra muy poco", () => {
    const r = disenarPluvial({ ...pluvial, infiltracion: 5 });
    expect(r.problemas.join()).toMatch(/48 h/);
  });

  it("sube de diámetro con más área", () => {
    expect(disenarPluvial({ ...pluvial, areas: { azotea: 400, pavimento: 0, jardin: 0 } }).tuberia.diametro).toBe(150);
  });
});

describe("bajadas pluviales", () => {
  it("capacidad de la bajada con Wyly-Eaton a 7/24", () => {
    // 4 in: 27.8 · (7/24)^(5/3) · 3.937^(8/3) = 27.8 · 0.1283 · 38.6 = 138 gpm = 8.7 L/s.
    expect(capacidadBajada(100)).toBeCloseTo(8.7, 1);
    expect(capacidadBajada(75)).toBeCloseTo(4.04, 1);
    expect(capacidadBajada(150)).toBeCloseTo(25.6, 0);
  });

  it("manda el área cuando el tubo sobra", () => {
    // Q = 0.95 · 120 · 100 / 3 600 = 3.17 L/s → 1 por gasto; 120 / 100 → 2 por área.
    const b = disenarPluvial(pluvial).bajadas!;
    expect(b.gasto).toBeCloseTo(3.1667, 3);
    expect(b.porGasto).toBe(1);
    expect(b.porArea).toBe(2);
    expect(b.cantidad).toBe(2);
  });

  it("manda el gasto con lluvia fuerte y tubo chico", () => {
    // Q = 0.95 · 120 · 300 / 3 600 = 9.5 L/s; 9.5 / 4.04 → 3 bajadas de 75 mm.
    expect(disenarBajadas(120, 300, 75).cantidad).toBe(3);
    expect(() => disenarBajadas(120, 100, 90)).toThrow(/75, 100, 150/);
  });

  it("sin azotea no hay bajadas", () => {
    expect(disenarPluvial({ ...pluvial, areas: { azotea: 0, pavimento: 40, jardin: 60 } }).bajadas).toBeUndefined();
  });
});

describe("captación de agua de lluvia", () => {
  // Techo de 100 m² con C = 0.8: cada mm da 0.08 m³. 800 mm al año → 64 m³.
  const lluvia = [0, 0, 0, 0, 50, 150, 200, 200, 150, 50, 0, 0];
  const base: EntradaCaptacion = { lluviaMensual: lluvia, area: 100, coeficiente: 0.8, demandaDiaria: 100 };

  it("si la lluvia alcanza, la cisterna cubre los meses secos", () => {
    // Demanda 36.5 m³/año. Déficit de noviembre a abril: 3.0 + 3.1 + 3.1 + 2.8 + 3.1 + 3.0 = 18.1 → 18.5 m³.
    const r = disenarCaptacion(base);
    expect(r.captacionAnual).toBeCloseTo(64, 6);
    expect(r.demandaAnual).toBeCloseTo(36.5, 6);
    expect(r.meses![6].captacion).toBeCloseTo(16, 6);
    expect(r.cisternaRecomendada).toBe(18.5);
    expect(r.cobertura).toBeCloseTo(1, 6);
    // Abril termina con 18.5 − 18.1 = 0.4 m³.
    expect(r.meses![3].almacenamiento).toBeCloseTo(0.4, 6);
    expect(r.meses!.reduce((a, m) => a + m.derrame, 0)).toBeCloseTo(64 - 36.5, 6);
    // Comparación: 2.5, 5 y 10 m³ y la recomendada; con 10 m³ se cubre 28.4 / 36.5 (ver abajo).
    expect(r.comparacion!.map((x) => x.cisterna)).toEqual([2.5, 5, 10, 18.5]);
    expect(r.comparacion![2].cobertura).toBeCloseTo(28.4 / 36.5, 6);
    expect(r.comparacion![3].cobertura).toBeCloseTo(1, 6);
  });

  it("con una cisterna más chica falta agua al final del estiaje", () => {
    // 10 m³ llena en octubre: alcanza hasta enero (0.8 m³); faltan 2.0 + 3.1 + 3.0 = 8.1 m³.
    const r = disenarCaptacion({ ...base, cisterna: 10 });
    expect(r.cisterna).toBe(10);
    expect(r.aprovechadoAnual).toBeCloseTo(36.5 - 8.1, 6);
    expect(r.cobertura).toBeCloseTo(28.4 / 36.5, 6);
  });

  it("si la lluvia no alcanza, guarda todo lo que cae", () => {
    // Demanda 300 L/día = 109.5 m³. Mayor almacenamiento en septiembre: 3 + 6.7 + 6.7 + 3 = 19.4 → 19.5 m³.
    const r = disenarCaptacion({ ...base, demandaDiaria: 300 });
    expect(r.cisternaRecomendada).toBe(19.5);
    expect(r.aprovechadoAnual).toBeCloseTo(64, 6);
    expect(r.cobertura).toBeCloseTo(64 / 109.5, 6);
  });

  it("con lluvia anual solo da el potencial", () => {
    const r = disenarCaptacion({ area: 100, coeficiente: 0.8, demandaDiaria: 100, lluviaAnual: 800 });
    expect(r.modo).toBe("anual");
    expect(r.captacionAnual).toBeCloseTo(64, 6);
    expect(r.cisternaRecomendada).toBeUndefined();
    expect(r.cobertura).toBe(1);
    expect(() => disenarCaptacion({ area: 100, coeficiente: 0.8, demandaDiaria: 100 })).toThrow(/12 meses/);
    expect(() => disenarCaptacion({ ...base, lluviaMensual: [...lluvia.slice(1), NaN] })).toThrow(/12 meses/);
  });

  it("el estudio pluvial la incluye y avisa si falta la lluvia mensual", () => {
    const r = disenarPluvial({ ...pluvial, captacion: { area: 100, coeficiente: 0.8, demandaDiaria: 100, lluviaAnual: 800 } });
    expect(r.captacion!.modo).toBe("anual");
    expect(r.advertencias.join()).toMatch(/cada mes/);
    expect(r.cumple).toBe(true);
  });
});

const fosa: EntradaFosa = {
  habitantes: 6,
  aportacion: 120,
  limpieza: 1,
  temperatura: 18,
  profundidad: 1.5,
  tasaAplicacion: 40,
};

describe("disenarFosa", () => {
  // Revisado a mano: 720 L/día → T = 1 día; K = 65; V = 1000 + 6·(120 + 65) = 2 110 L.
  it("dimensiona la fosa y el campo de infiltración", () => {
    const r = disenarFosa(fosa);
    expect(r.contribucion).toBe(720);
    expect(r.retencion).toBe(1);
    expect(r.acumulacion).toBe(65);
    expect(r.volumen).toBe(2110);
    // 2.11 / 1.5 = 1.41 m² → 0.85 × 1.70 m.
    expect(r.medidas.ancho).toBeCloseTo(0.85, 6);
    expect(r.medidas.largo).toBeCloseTo(1.7, 6);
    expect(r.medidas.volumenConstruido).toBeGreaterThanOrEqual(r.volumen);
    expect(r.biodigestor).toBe(3000);
    // 720 / 40 = 18 m² → 30 m de zanja de 0.6 m: 1 zanja.
    expect(r.campo.area).toBeCloseTo(18, 6);
    expect(r.campo.longitud).toBeCloseTo(30, 6);
    expect(r.campo.zanjas).toBe(1);
    expect(r.cumple).toBe(true);
  });

  it("usa la tabla de retención y la de acumulación", () => {
    const r = disenarFosa({ ...fosa, habitantes: 20, temperatura: 25, limpieza: 2 });
    expect(r.retencion).toBe(0.92);
    expect(r.acumulacion).toBe(97);
    expect(r.volumen).toBeCloseTo(1000 + 20 * (120 * 0.92 + 97), 6);
  });

  it("revisa la profundidad útil", () => {
    expect(disenarFosa({ ...fosa, profundidad: 1 }).problemas.join()).toMatch(/entre 1.2 y 2.2/);
    expect(() => disenarFosa({ ...fosa, limpieza: 7 })).toThrow(/1 a 5/);
  });

  it("pozo de absorción en lugar de zanjas", () => {
    // 18 m² de pared con D = 1.5 m: h = 18 / (π · 1.5) = 3.82 m → 2 pozos de 1.91 → 2.0 m.
    const r = disenarFosa({ ...fosa, disposicion: "pozo", pozo: { diametro: 1.5, profundidadMaxima: 3 } });
    expect(r.disposicion).toBe("pozo");
    expect(r.pozo!.profundidadTotal).toBeCloseTo(3.8197, 3);
    expect(r.pozo!.cantidad).toBe(2);
    expect(r.pozo!.profundidad).toBe(2);
    expect(r.pozo!.areaConstruida).toBeGreaterThanOrEqual(r.campo.area);
    expect(disenarFosa(fosa).pozo).toBeUndefined();
    expect(() => disenarFosa({ ...fosa, disposicion: "pozo", pozo: { diametro: 0.5, profundidadMaxima: 3 } })).toThrow(
      /entre 0.9 y 5/,
    );
  });

  it("trampa de grasas por personas y por gasto", () => {
    // 2 · 6 + 20 = 32 L; lado mínimo 0.30 m con 0.40 m de tirante.
    const p = disenarFosa({ ...fosa, trampa: { metodo: "personas" } }).trampa!;
    expect(p.volumen).toBe(32);
    expect([p.ancho, p.largo]).toEqual([0.3, 0.3]);
    // 0.25 L/s · 180 s = 45 L → 0.1125 m² → 0.30 × 0.40 m.
    const g = disenarFosa({ ...fosa, trampa: { metodo: "gasto", gasto: 0.25, retencion: 3 } }).trampa!;
    expect(g.volumen).toBeCloseTo(45, 6);
    expect(g.ancho).toBe(0.3);
    expect(g.largo).toBeCloseTo(0.4, 6);
    expect(g.volumenConstruido).toBeGreaterThanOrEqual(g.volumen);
  });

  it("programa de desazolve", () => {
    // Lodo: N K Lf = 6 · 65 · 1 = 390 L de 2 110 L.
    const r = disenarFosa({ ...fosa, inicio: "2026-10", costoDesazolve: 1800 }).mantenimiento!;
    expect(r.lodos).toBe(390);
    expect(r.fraccion).toBeCloseTo(390 / 2110, 6);
    expect(r.fechas).toEqual(["2027-10", "2028-10", "2029-10"]);
    expect(r.costoAnual).toBe(1800);
    expect(disenarFosa({ ...fosa, limpieza: 2, costoDesazolve: 1800 }).mantenimiento!.costoAnual).toBe(900);
    expect(() => disenarFosa({ ...fosa, inicio: "10/2026" })).toThrow(/AAAA-MM/);
  });
});

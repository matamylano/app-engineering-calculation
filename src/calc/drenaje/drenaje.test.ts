import { describe, expect, it } from "vitest";
import { disenarFosa, type EntradaFosa } from "./fosa";
import { disenarPluvial, tuboLleno, type EntradaPluvial } from "./pluvial";

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
});

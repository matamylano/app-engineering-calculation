import { describe, expect, it } from "vitest";
import { disenarPozo, rectaSemilog, type EntradaPozo } from "./pozo";

// Lecturas sobre la recta s = 2 + 0.8 log t a partir de 10 min.
const tiempos = [10, 20, 50, 100, 200, 500, 1000];
const lecturas = [
  { t: 1, s: 1.2 },
  { t: 2, s: 1.6 },
  { t: 5, s: 2.3 },
  ...tiempos.map((t) => ({ t, s: 2 + 0.8 * Math.log10(t) })),
];

const base: EntradaPozo = {
  gastoPrueba: 10,
  lecturas,
  desde: 10,
  nivelEstatico: 30,
  profundidad: 120,
  gastoDiseno: 8,
  horasBombeo: 24,
  sumergencia: 3,
  longitudDescarga: 20,
  cargaDescarga: 5,
  aberturaRejilla: 0.15,
};

describe("rectaSemilog", () => {
  it("ajusta la recta de Cooper-Jacob", () => {
    const r = rectaSemilog(lecturas.slice(3));
    expect(r.pendiente).toBeCloseTo(0.8, 9);
    expect(r.ordenada).toBeCloseTo(2, 9);
  });
});

describe("disenarPozo", () => {
  it("interpreta la prueba y diseña el equipo", () => {
    const r = disenarPozo(base);
    // T = 2.3 · 864 / (4π · 0.8) = 197.7 m²/día.
    expect(r.recta.puntos).toBe(7);
    expect(r.transmisividad).toBeCloseTo(197.7, 1);
    expect(r.almacenamiento).toBeUndefined();
    // Capacidad específica = 10 / 4.4 = 2.27 L/s/m.
    expect(r.capacidadEspecifica).toBeCloseTo(2.2727, 3);
    // s(1440 min) = 4.4 + 0.8 log(1.44) = 4.527 m; con 8 L/s: 3.621 m.
    expect(r.abatimientoDiseno).toBeCloseTo(3.6214, 3);
    expect(r.nivelDinamico).toBeCloseTo(33.6214, 3);
    expect(r.colocacion).toBe(37);
    // 8 L/s → ademe de 8"; rejilla 0.008 / (π · 0.2032 · 0.15 · 0.03) = 2.79 m.
    expect(r.ademe).toBe(8);
    expect(r.rejilla.longitudMinima).toBeCloseTo(2.785, 2);
    // Columna de 3" (1.68 m/s); pérdida en 57 · 1.2 m ≈ 3.37 m.
    expect(r.columna.nominal).toBe('3"');
    expect(r.columna.velocidad).toBeCloseTo(1.679, 2);
    expect(r.columna.perdida).toBeCloseTo(3.37, 1);
    // H = 33.62 + 3.37 + 5 = 42.0 m; P = 8 · 42 / (76 · 0.65) = 6.8 HP → 7.5 HP.
    expect(r.carga).toBeCloseTo(42.0, 1);
    expect(r.potencia).toBeCloseTo(6.8, 1);
    expect(r.potenciaComercial).toBe(7.5);
    expect(r.cumple).toBe(true);
    expect(r.advertencias).toEqual([]);
  });

  it("calcula S con pozo de observación", () => {
    // t0 = 10^-2.5 min; S = 2.25 · 197.7 · t0 / 10² = 9.77e-6.
    expect(disenarPozo({ ...base, radioObservacion: 10 }).almacenamiento).toBeCloseTo(9.77e-6, 7);
  });

  it("avisa al extrapolar el gasto y al quedar sin profundidad", () => {
    const r = disenarPozo({ ...base, gastoDiseno: 15, profundidad: 36 });
    expect(r.advertencias.join()).toMatch(/20 %/);
    expect(r.problemas.join()).toMatch(/fondo/);
    expect(r.cumple).toBe(false);
  });

  it("rechaza lecturas que no sirven", () => {
    expect(() => disenarPozo({ ...base, desde: 600 })).toThrow(/3 lecturas/);
    expect(() => disenarPozo({ ...base, lecturas: tiempos.map((t) => ({ t, s: 2 })) })).toThrow(/abatimiento creciente/);
  });
});

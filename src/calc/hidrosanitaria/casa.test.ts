import { describe, expect, it } from "vitest";
import { disenarCasa, gastoHunter, perdidaHazen, type EntradaCasa } from "./casa";

const base: EntradaCasa = {
  habitantes: 5,
  dotacion: 150,
  diasCisterna: 2,
  diasTinaco: 1,
  muebles: { excusado: 2, lavabo: 2, regadera: 2, fregadero: 1, lavadero: 1, lavadora: 1 },
  alturaTinaco: 4,
  longitudTinaco: 15,
  alturaBombeo: 7,
  longitudBombeo: 10,
  tiempoLlenado: 30,
};

describe("curva de Hunter y Hazen-Williams", () => {
  it("interpola el gasto probable", () => {
    expect(gastoHunter(10)).toBeCloseTo(14.6 * 0.0630902, 6);
    expect(gastoHunter(12.8)).toBeCloseTo(16.4 * 0.0630902, 6);
    expect(() => gastoHunter(120)).toThrow(/100 unidades/);
  });

  it("calcula la pérdida por fricción", () => {
    // 1.035 L/s en 26.8 mm y 19.5 m: 10.67·19.5·Q^1.852 / (140^1.852 · D^4.87) ≈ 2.95 m.
    expect(perdidaHazen(1.0347, 26.8, 19.5)).toBeCloseTo(2.95, 1);
  });
});

describe("disenarCasa", () => {
  // Revisado a mano para una casa de 5 personas con dos baños.
  it("dimensiona la instalación", () => {
    const r = disenarCasa(base);
    // 5 · 150 = 750 L/día: cisterna 1 500 L → 2 800; tinaco 750 L.
    expect(r.demandaDiaria).toBe(750);
    expect(r.cisterna).toEqual({ requerido: 1500, comercial: 2800, piezas: 1 });
    expect(r.tinaco).toEqual({ requerido: 750, comercial: 750, piezas: 1 });

    // UM = 2·2.2 + 2·0.7 + 2·1.4 + 3·1.4 = 12.8 → 16.4 gpm = 1.035 L/s.
    expect(r.unidadesMueble).toBeCloseTo(12.8, 6);
    expect(r.gastoProbable).toBeCloseTo(1.0347, 3);

    // 1": v = 1.83 m/s, pero pierde 2.95 m y quedan 1.05 m < 2 m. 1¼": pierde 1.1 m, quedan 2.9 m.
    expect(r.alimentacion.nominal).toBe('1¼"');
    expect(r.alimentacion.perdida).toBeCloseTo(1.105, 1);
    expect(r.alimentacion.presionDisponible).toBeCloseTo(2.895, 1);

    // Bomba: 750 L en 30 min = 0.417 L/s en ¾" (1.25 m/s), pierde 1.32 m en 13 m;
    // H = 7 + 1.32 + 2 = 10.3 m; P = 0.417·10.3/(76·0.6) = 0.094 HP → ¼ HP.
    expect(r.bomba.gasto).toBeCloseTo(0.4167, 3);
    expect(r.bomba.nominal).toBe('¾"');
    expect(r.bomba.velocidad).toBeCloseTo(1.25, 2);
    expect(r.bomba.carga).toBeCloseTo(10.32, 1);
    expect(r.bomba.potencia).toBeCloseTo(0.0943, 2);
    expect(r.bomba.potenciaComercial).toBe(0.25);

    // Descargas: 2·3 + 2·1 + 2·2 + 3·2 = 18 UD.
    expect(r.drenaje.unidadesDescarga).toBe(18);
    expect(r.drenaje.ramales.find((x) => x.mueble === "excusado")?.diametro).toBe(100);
    expect(r.drenaje.albanal).toBe(150);
    expect(r.cumple).toBe(true);
  });

  it("pide subir el tinaco si no hay presión", () => {
    const r = disenarCasa({ ...base, alturaTinaco: 1.5 });
    expect(r.cumple).toBe(false);
    expect(r.problemas.join()).toMatch(/presión/);
  });

  it("junta varias cisternas cuando no alcanza una", () => {
    expect(disenarCasa({ ...base, habitantes: 40, dotacion: 300 }).cisterna).toEqual({
      requerido: 24000,
      comercial: 10000,
      piezas: 3,
    });
  });

  it("rechaza datos imposibles", () => {
    expect(() => disenarCasa({ ...base, muebles: { ...base.muebles, excusado: 1.5 } })).toThrow(/muebles/);
    expect(() =>
      disenarCasa({ ...base, muebles: { excusado: 0, lavabo: 0, regadera: 0, fregadero: 0, lavadero: 0, lavadora: 0 } }),
    ).toThrow(/al menos un mueble/);
  });
});

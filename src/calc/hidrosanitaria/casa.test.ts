import { describe, expect, it } from "vitest";
import { disenarCalentador, disenarCasa, gastoHunter, perdidaHazen, type EntradaCasa } from "./casa";

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
    expect(r.calentador).toBeNull();
    expect(r.cumple).toBe(true);
  });

  it("acepta reserva larga para zonas con tandeo", () => {
    // 750 L/día · 6 días = 4 500 L → 5 000 L; medio día en el tinaco: 375 L → 450 L.
    const r = disenarCasa({ ...base, diasCisterna: 6, diasTinaco: 0.5 });
    expect(r.cisterna).toEqual({ requerido: 4500, comercial: 5000, piezas: 1 });
    expect(r.tinaco).toEqual({ requerido: 375, comercial: 450, piezas: 1 });
    expect(() => disenarCasa({ ...base, diasCisterna: 16 })).toThrow(/15/);
  });

  it("suma tina, lavavajillas y llave de jardín", () => {
    const r = disenarCasa({ ...base, muebles: { ...base.muebles, tina: 1, lavavajillas: 1, llaveJardin: 1 } });
    // UM = 12.8 + 1.4 + 1.4 + 2.5 = 18.1 → 18.8 + 0.1·0.4 = 18.84 gpm.
    expect(r.unidadesMueble).toBeCloseTo(18.1, 6);
    expect(r.gastoProbable).toBeCloseTo(18.84 * 0.0630902, 4);
    // UD = 18 + 2 + 2 + 0 (la llave de jardín no descarga).
    expect(r.drenaje.unidadesDescarga).toBe(22);
    expect(r.drenaje.ramales.find((x) => x.mueble === "llaveJardin")?.diametro).toBe(0);
    expect(r.drenaje.ramales.find((x) => x.mueble === "tina")?.diametro).toBe(38);
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

describe("calentador de agua", () => {
  it("de paso: regaderas a la vez llevadas a ΔT = 25 °C", () => {
    // 2 regaderas · 10 L/min · (40 − 15)/25 = 20 L/min → 26 L/min.
    const c = disenarCalentador({ ...base, calentador: "paso" })!;
    expect(c.regaderas).toBe(2);
    expect(c.requerido).toBeCloseTo(20, 6);
    expect(c.comercial).toBe(26);
    expect(c.piezas).toBe(1);
    // Con agua fría a 20 °C: 20 · 20/25 = 16 L/min → 16.
    expect(disenarCalentador({ ...base, calentador: "paso", temperaturaFria: 20 })!.comercial).toBe(16);
    // 3 regaderas: 30 L/min → 2 de 26.
    expect(disenarCalentador({ ...base, calentador: "paso", regaderasSimultaneas: 3 })).toMatchObject({ comercial: 26, piezas: 2 });
  });

  it("de depósito: hora pico convertida a agua de 60 °C", () => {
    // Pico = máx(2·10·10 = 200, 5·50/3 = 83.3) = 200 L; × (40−15)/(60−15) / 0.7 = 158.7 L → 189 L.
    const c = disenarCalentador({ ...base, calentador: "deposito" })!;
    expect(c.requerido).toBeCloseTo(158.73, 1);
    expect(c.comercial).toBe(189);
    // 12 personas a 50 L: 600/3 = 200 L, mismo pico; 20 personas: 333.3 → 264.6 L → 284 L.
    expect(disenarCalentador({ ...base, habitantes: 20, calentador: "deposito" })!.comercial).toBe(284);
  });

  it("solar: consumo diario, tubos y área de colector", () => {
    // 5 · 50 = 250 L → 300 L; 300/12.5 = 24 tubos; 300/60 = 5 m².
    const c = disenarCalentador({ ...base, calentador: "solar" })!;
    expect(c.requerido).toBe(250);
    expect(c.comercial).toBe(300);
    expect(c.tubos).toBe(24);
    expect(c.areaColector).toBeCloseTo(5, 6);
  });

  it("rechaza datos imposibles", () => {
    expect(() => disenarCalentador({ ...base, calentador: "paso", temperaturaFria: 38 })).toThrow(/agua fría/);
    expect(() => disenarCalentador({ ...base, calentador: "paso", regaderasSimultaneas: 1.5 })).toThrow(/regaderas/);
  });
});

describe("lista de equipos y piezas", () => {
  it("arma la lista para cotizar", () => {
    const r = disenarCasa({ ...base, calentador: "paso", longitudDrenaje: 25 });
    const partida = (concepto: string) => r.materiales.find((p) => p.concepto === concepto);
    expect(partida("Cisterna")).toMatchObject({ especificacion: "2,800 L", cantidad: 1 });
    expect(partida("Bomba de la cisterna al tinaco")?.especificacion).toMatch(/^0.25 HP/);
    expect(partida("Calentador de paso (instantáneo)")?.especificacion).toBe("26 L/min");
    // 9 muebles; con agua caliente: 2 lavabos + 2 regaderas + fregadero + lavadora = 6.
    expect(partida("Salidas de agua fría")?.cantidad).toBe(9);
    expect(partida("Salidas de agua caliente")?.cantidad).toBe(6);
    expect(partida("Salidas sanitarias de 100 mm")?.cantidad).toBe(2);
    expect(partida("Salidas sanitarias de 50 mm")?.cantidad).toBe(5);
    expect(partida("Salidas sanitarias de 38 mm")?.cantidad).toBe(2);
    expect(partida("Alimentación general desde el tinaco")).toMatchObject({ especificacion: 'Cobre tipo M 1¼"', cantidad: null });
    // 25 m: uno a cada 10 m más el del extremo = 4.
    expect(partida("Registros")?.cantidad).toBe(4);
    expect(disenarCasa(base).materiales.find((p) => p.concepto === "Registros")?.cantidad).toBeNull();
  });
});

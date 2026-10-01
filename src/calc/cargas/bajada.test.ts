import { describe, expect, it } from "vitest";
import { bajadaDeCargas, cargaNivel, redondearLado, type EntradaBajada, type Nivel } from "./bajada";

const azotea: Nivel = {
  nombre: "Azotea",
  uso: "azotea-plana",
  espesorLosa: 0.1,
  pesoConcreto: 2.4,
  acabados: 150,
  muros: 0,
  coladaEnSitio: true,
  conMortero: true,
};
const entrepiso: Nivel = { ...azotea, nombre: "Entrepiso", uso: "habitacion", acabados: 120, muros: 100 };

describe("cargaNivel", () => {
  it("azotea: losa de 10 cm + 40 kg/m² del reglamento + acabados", () => {
    const n = cargaNivel(azotea);
    expect(n.losa).toBeCloseTo(240, 9);
    expect(n.incremento).toBe(40);
    expect(n.muerta).toBeCloseTo(430, 9);
    expect(n.viva.wm).toBe(100);
    expect(n.servicio).toBeCloseTo(530, 9);
    expect(n.ultima).toBeCloseTo(1.3 * 430 + 1.5 * 100, 9); // 709
  });

  it("entrepiso de habitación: Wm = 190 kg/m²", () => {
    const n = cargaNivel(entrepiso);
    expect(n.muerta).toBeCloseTo(240 + 40 + 120 + 100, 9); // 500
    expect(n.ultima).toBeCloseTo(1.3 * 500 + 1.5 * 190, 9); // 935
  });

  it("losa precolada sin mortero no lleva incremento", () => {
    expect(cargaNivel({ ...azotea, coladaEnSitio: false, conMortero: false }).incremento).toBe(0);
  });

  it("rechaza datos fuera de rango", () => {
    expect(() => cargaNivel({ ...azotea, espesorLosa: 0 })).toThrow(/espesor/);
    expect(() => cargaNivel({ ...azotea, acabados: -1 })).toThrow(/acabados/i);
    expect(() => cargaNivel({ ...azotea, uso: "nave" as Nivel["uso"] })).toThrow(/Uso/);
  });
});

describe("bajadaDeCargas", () => {
  const entrada: EntradaBajada = {
    niveles: [azotea, entrepiso],
    elementos: [{ nombre: "C-1", areaTributaria: 12, pesoPropio: 0.5 }],
    capacidadSuelo: 10,
    incrementoCimentacion: 0.1,
  };

  it("acumula de arriba hacia abajo con peso propio por nivel", () => {
    const r = bajadaDeCargas(entrada);
    const [c1] = r.elementos;
    // Azotea: CM = 0.430·12 + 0.5 = 5.66 t; CV = 0.100·12 = 1.2 t
    expect(c1.niveles[0].muerta).toBeCloseTo(5.66, 9);
    expect(c1.niveles[0].viva).toBeCloseTo(1.2, 9);
    expect(c1.niveles[0].servicioAcumulada).toBeCloseTo(6.86, 9);
    // Entrepiso: CM = 0.500·12 + 0.5 = 6.5 t; CV = 0.190·12 = 2.28 t
    expect(c1.servicio).toBeCloseTo(6.86 + 6.5 + 2.28, 9); // 15.64
    expect(c1.ultima).toBeCloseTo(1.3 * (5.66 + 6.5) + 1.5 * (1.2 + 2.28), 9); // 21.028
  });

  it("dimensiona el área de cimentación con qa", () => {
    const c = bajadaDeCargas(entrada).elementos[0].cimentacion!;
    expect(c.carga).toBeCloseTo(15.64 * 1.1, 9);
    expect(c.area).toBeCloseTo(1.7204, 4);
    expect(c.lado).toBe(1.35); // √1.7204 = 1.3117 → 1.35
  });

  it("sin qa no calcula cimentación", () => {
    expect(bajadaDeCargas({ ...entrada, capacidadSuelo: undefined }).elementos[0].cimentacion).toBeUndefined();
  });

  it("pide niveles y elementos", () => {
    expect(() => bajadaDeCargas({ ...entrada, niveles: [] })).toThrow(/nivel/);
    expect(() => bajadaDeCargas({ ...entrada, elementos: [] })).toThrow(/elemento/);
    expect(() => bajadaDeCargas({ ...entrada, elementos: [{ nombre: "C", areaTributaria: 0, pesoPropio: 0 }] })).toThrow(/tributaria/);
  });

  it("redondea el lado hacia arriba a 5 cm sin pasarse en exactos", () => {
    expect(redondearLado(1.21)).toBe(1.1);
    expect(redondearLado(1.2101)).toBe(1.15);
  });
});

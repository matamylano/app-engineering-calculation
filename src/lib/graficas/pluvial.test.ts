import { describe, expect, it } from "vitest";
import { disenarPluvial, type EntradaPluvial } from "@/calc/drenaje/pluvial";
import { graficasPluvialExtra } from "./pluvial";

const e: EntradaPluvial = {
  areas: { azotea: 100, pavimento: 0, jardin: 0 },
  intensidad: 100,
  duracion: 60,
  pendiente: 1,
  diametroPozo: 1.5,
  profundidadPozo: 3,
};

describe("gráficas de la captación", () => {
  it("sin captación mensual no hay gráficas", () => {
    expect(graficasPluvialExtra(e, disenarPluvial(e))).toEqual([]);
    const anual = { ...e, captacion: { area: 100, coeficiente: 0.8, demandaDiaria: 100, lluviaAnual: 800 } };
    expect(graficasPluvialExtra(anual, disenarPluvial(anual))).toEqual([]);
  });

  it("barras de los 12 meses y almacenamiento con la cisterna", () => {
    const lluvia = [0, 0, 0, 0, 50, 150, 200, 200, 150, 50, 0, 0];
    const conCaptacion = { ...e, captacion: { area: 100, coeficiente: 0.8, demandaDiaria: 100, lluviaMensual: lluvia } };
    const [barras, cisterna] = graficasPluvialExtra(conCaptacion, disenarPluvial(conCaptacion));
    expect(barras.tipo === "barras" && barras.series[0].valores[6]).toBeCloseTo(16, 6);
    expect(barras.tipo === "barras" && barras.categorias).toHaveLength(12);
    expect(cisterna.tipo === "barras" && cisterna.referencia?.valor).toBe(18.5);
  });
});

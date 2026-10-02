import { describe, expect, it } from "vitest";
import { completarFormulario, entradaDesdeFormulario, FORMULARIO_INICIAL, leerFormulario } from "./suelos";

describe("leerFormulario", () => {
  it("acepta el formulario inicial y lo copia", () => {
    const f = leerFormulario(JSON.parse(JSON.stringify(FORMULARIO_INICIAL)));
    expect(f).toEqual(FORMULARIO_INICIAL);
  });

  it("rechaza formas inesperadas", () => {
    expect(leerFormulario(null)).toBeNull();
    expect(leerFormulario({ ...FORMULARIO_INICIAL, shape: "hexagonal" })).toBeNull();
    expect(leerFormulario({ ...FORMULARIO_INICIAL, unitsId: "imperial" })).toBeNull();
    expect(leerFormulario({ ...FORMULARIO_INICIAL, plastic: "si" })).toBeNull();
    expect(leerFormulario({ ...FORMULARIO_INICIAL, values: { ...FORMULARIO_INICIAL.values, c: 2 } })).toBeNull();
    expect(leerFormulario({ ...FORMULARIO_INICIAL, project: { ...FORMULARIO_INICIAL.project, obra: "x".repeat(201) } })).toBeNull();
  });

  it("ignora llaves de más", () => {
    const f = leerFormulario({ ...FORMULARIO_INICIAL, extra: 1, values: { ...FORMULARIO_INICIAL.values, otro: "1" } });
    expect(f).toEqual(FORMULARIO_INICIAL);
  });
});

describe("asentamiento admisible", () => {
  it("vacío o ausente usa 2.5 cm", () => {
    const viejo = JSON.parse(JSON.stringify(FORMULARIO_INICIAL));
    delete viejo.values.sAdm;
    const f = leerFormulario(viejo);
    expect(f?.values.sAdm).toBe("");
    expect(entradaDesdeFormulario(f!).settlement.allowable).toBeCloseTo(0.025, 12);
  });

  it("convierte cm a m", () => {
    const f = { ...FORMULARIO_INICIAL, values: { ...FORMULARIO_INICIAL.values, sAdm: "5" } };
    expect(entradaDesdeFormulario(f).settlement.allowable).toBeCloseTo(0.05, 12);
  });

  it("completa formularios viejos", () => {
    const { sAdm: _, ...values } = FORMULARIO_INICIAL.values;
    void _;
    const f = completarFormulario({ ...FORMULARIO_INICIAL, values: values as typeof FORMULARIO_INICIAL.values });
    expect(f.values.sAdm).toBe("2.5");
  });
});

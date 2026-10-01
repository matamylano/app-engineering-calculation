import { describe, expect, it } from "vitest";
import { FORMULARIO_INICIAL, leerFormulario } from "./suelos";

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

import { describe, expect, it } from "vitest";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { calcularEstudio, estudioDeFolio } from "./registro";
import { entradaLosa, FORMULARIO_LOSA_INICIAL, leerFormularioLosa } from "./losa";

const copia = () => ({ ...FORMULARIO_LOSA_INICIAL, project: { ...FORMULARIO_LOSA_INICIAL.project } });

describe("formulario de losa", () => {
  it("acepta el inicial y el servidor lo calcula", () => {
    expect(leerFormularioLosa(copia())).toEqual(FORMULARIO_LOSA_INICIAL);
    expect(calcularEstudio("losa", copia()).ok).toBe(true);
    expect(entradaLosa(copia())).toMatchObject({ claro: 3, h: 12, incrementos: true });
  });

  it("rechaza formas inesperadas", () => {
    expect(leerFormularioLosa({ ...copia(), incrementos: "si" })).toBeNull();
    expect(leerFormularioLosa({ ...copia(), apoyo: "cuatro-bordes" })).toBeNull();
    expect(leerFormularioLosa({ ...copia(), h: 12 })).toBeNull();
  });

  it("explica por qué no genera memoria", () => {
    expect(calcularEstudio("losa", { ...copia(), claro: "6", muerta: "600", viva: "500", h: "10" })).toEqual({
      ok: false,
      error: expect.stringMatching(/espesor/),
    });
  });

  it("reconoce el folio", () => {
    expect(estudioDeFolio("LOS-20261001-ABCDEF")).toBe("losa");
    expect(FOLIO_VALIDO.test("LOS-20261001-ABCDEF")).toBe(true);
  });
});

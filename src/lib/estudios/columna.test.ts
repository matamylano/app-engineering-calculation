import { describe, expect, it } from "vitest";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { calcularEstudio, estudioDeFolio } from "./registro";
import { entradaColumna, FORMULARIO_COLUMNA_INICIAL, leerFormularioColumna } from "./columna";

const copia = () => ({ ...FORMULARIO_COLUMNA_INICIAL, project: { ...FORMULARIO_COLUMNA_INICIAL.project } });

describe("formulario de columna", () => {
  it("acepta el inicial y el servidor lo calcula", () => {
    expect(leerFormularioColumna(copia())).toEqual(FORMULARIO_COLUMNA_INICIAL);
    expect(calcularEstudio("columna", copia()).ok).toBe(true);
  });

  it("toma el momento vacío como cero", () => {
    expect(entradaColumna({ ...copia(), momento: "" }).momento).toBe(0);
    expect(entradaColumna({ ...copia(), momento: " " }).momento).toBe(0);
  });

  it("rechaza formas inesperadas", () => {
    expect(leerFormularioColumna({ ...copia(), carga: 28 })).toBeNull();
    expect(leerFormularioColumna({ project: null })).toBeNull();
  });

  it("explica por qué no genera memoria", () => {
    expect(calcularEstudio("columna", { ...copia(), carga: "200" })).toEqual({
      ok: false,
      error: expect.stringMatching(/carga axial/),
    });
  });

  it("reconoce el folio", () => {
    expect(estudioDeFolio("COL-20261001-ABCDEF")).toBe("columna");
    expect(FOLIO_VALIDO.test("COL-20261001-ABCDEF")).toBe(true);
  });
});

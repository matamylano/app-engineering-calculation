import { describe, expect, it } from "vitest";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { entradaFosa, FORMULARIO_FOSA_INICIAL, leerFormularioFosa } from "./fosa";
import { entradaPluvial, FORMULARIO_PLUVIAL_INICIAL, leerFormularioPluvial } from "./pluvial";
import { calcularEstudio, estudioDeFolio } from "./registro";

const pluvial = () => JSON.parse(JSON.stringify(FORMULARIO_PLUVIAL_INICIAL));
const fosa = () => JSON.parse(JSON.stringify(FORMULARIO_FOSA_INICIAL));

describe("formulario de drenaje pluvial", () => {
  it("acepta el inicial y el servidor lo calcula", () => {
    expect(leerFormularioPluvial(pluvial())).toEqual(FORMULARIO_PLUVIAL_INICIAL);
    expect(calcularEstudio("pluvial", pluvial()).ok).toBe(true);
  });

  it("deja la infiltración opcional y las áreas vacías en cero", () => {
    const f = pluvial();
    f.infiltracion = "";
    f.areas.jardin = "";
    const e = entradaPluvial(f);
    expect(e.infiltracion).toBeUndefined();
    expect(e.areas.jardin).toBe(0);
  });

  it("rechaza formas inesperadas y explica el error", () => {
    expect(leerFormularioPluvial({ ...pluvial(), areas: null })).toBeNull();
    expect(leerFormularioPluvial({ ...pluvial(), intensidad: 100 })).toBeNull();
    expect(calcularEstudio("pluvial", { ...pluvial(), infiltracion: "2" })).toEqual({
      ok: false,
      error: expect.stringMatching(/vaciarse/),
    });
  });
});

describe("formulario de fosa séptica", () => {
  it("acepta el inicial y el servidor lo calcula", () => {
    expect(leerFormularioFosa(fosa())).toEqual(FORMULARIO_FOSA_INICIAL);
    expect(calcularEstudio("fosa", fosa()).ok).toBe(true);
    expect(entradaFosa(fosa())).toMatchObject({ habitantes: 6, limpieza: 1 });
  });

  it("rechaza formas inesperadas y explica el error", () => {
    expect(leerFormularioFosa({ ...fosa(), habitantes: 6 })).toBeNull();
    expect(calcularEstudio("fosa", { ...fosa(), profundidad: "3" })).toEqual({
      ok: false,
      error: expect.stringMatching(/profundidad útil/),
    });
  });
});

describe("folios", () => {
  it("reconoce PLU y FOS", () => {
    expect(estudioDeFolio("PLU-20261001-ABCDEF")).toBe("pluvial");
    expect(estudioDeFolio("FOS-20261001-ABCDEF")).toBe("fosa");
    expect(FOLIO_VALIDO.test("FOS-20261001-ABCDEF")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { calcularEstudio, estudioDeFolio } from "./registro";
import {
  entradaHidrosanitaria,
  FORMULARIO_HIDROSANITARIA_INICIAL,
  leerFormularioHidrosanitaria,
} from "./hidrosanitaria";

const copia = () => JSON.parse(JSON.stringify(FORMULARIO_HIDROSANITARIA_INICIAL));

describe("formulario de instalación hidráulica y sanitaria", () => {
  it("acepta el inicial y el servidor lo calcula", () => {
    expect(leerFormularioHidrosanitaria(copia())).toEqual(FORMULARIO_HIDROSANITARIA_INICIAL);
    expect(calcularEstudio("hidrosanitaria", copia()).ok).toBe(true);
  });

  it("toma los muebles vacíos como cero", () => {
    const f = copia();
    f.muebles.lavadora = "";
    expect(entradaHidrosanitaria(f).muebles.lavadora).toBe(0);
  });

  it("rechaza formas inesperadas", () => {
    expect(leerFormularioHidrosanitaria({ ...copia(), muebles: null })).toBeNull();
    expect(leerFormularioHidrosanitaria({ ...copia(), muebles: { ...copia().muebles, excusado: 2 } })).toBeNull();
    expect(leerFormularioHidrosanitaria({ ...copia(), habitantes: 5 })).toBeNull();
  });

  it("explica por qué no genera memoria", () => {
    expect(calcularEstudio("hidrosanitaria", { ...copia(), alturaTinaco: "1" })).toEqual({
      ok: false,
      error: expect.stringMatching(/presión/),
    });
  });

  it("reconoce el folio", () => {
    expect(estudioDeFolio("HID-20261001-ABCDEF")).toBe("hidrosanitaria");
    expect(FOLIO_VALIDO.test("HID-20261001-ABCDEF")).toBe(true);
  });
});

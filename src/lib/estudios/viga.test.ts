import { describe, expect, it } from "vitest";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { calcularEstudio, estudioDeFolio } from "./registro";
import { entradaViga, FORMULARIO_VIGA_INICIAL, leerFormularioViga } from "./viga";

const copia = () => ({ ...FORMULARIO_VIGA_INICIAL, project: { ...FORMULARIO_VIGA_INICIAL.project } });

describe("formulario de viga", () => {
  it("acepta el inicial y el servidor lo calcula", () => {
    expect(leerFormularioViga(copia())).toEqual(FORMULARIO_VIGA_INICIAL);
    expect(calcularEstudio("viga", copia()).ok).toBe(true);
    expect(entradaViga(copia())).toMatchObject({ claro: 5, apoyo: "simple", b: 25, varilla: 5, estribo: 3 });
  });

  it("rechaza formas inesperadas", () => {
    expect(leerFormularioViga({ ...copia(), apoyo: "empotrada" })).toBeNull();
    expect(leerFormularioViga({ ...copia(), apoyo: "toString" })).toBeNull();
    expect(leerFormularioViga({ ...copia(), b: 25 })).toBeNull();
  });

  it("no genera memoria de una viga que no pasa y dice por qué", () => {
    expect(calcularEstudio("viga", { ...copia(), b: "20" })).toEqual({
      ok: false,
      error: expect.stringMatching(/no caben en una capa/),
    });
  });

  it("reconoce el folio", () => {
    expect(estudioDeFolio("VIG-20261001-ABCDEF")).toBe("viga");
    expect(FOLIO_VALIDO.test("VIG-20261001-ABCDEF")).toBe(true);
  });
});

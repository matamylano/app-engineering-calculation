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

  it("lee las memorias anteriores sin los campos nuevos", () => {
    const viejo = copia();
    for (const k of ["calentador", "regaderasSimultaneas", "consumoCaliente", "temperaturaFria", "longitudDrenaje"])
      delete viejo[k];
    for (const m of ["tina", "lavavajillas", "llaveJardin"]) delete viejo.muebles[m];
    const f = leerFormularioHidrosanitaria(viejo)!;
    expect(f.calentador).toBe("ninguno");
    expect(f.muebles.tina).toBe("");
    expect(entradaHidrosanitaria(f).muebles.tina).toBe(0);
    expect(calcularEstudio("hidrosanitaria", viejo).ok).toBe(true);
  });

  it("usa la reserva por omisión si el campo queda vacío", () => {
    const e = entradaHidrosanitaria({ ...copia(), diasCisterna: "", diasTinaco: " " });
    expect(e.diasCisterna).toBe(2);
    expect(e.diasTinaco).toBe(1);
    expect(entradaHidrosanitaria(copia()).calentador).toBe("paso");
    expect(entradaHidrosanitaria(copia()).regaderasSimultaneas).toBeUndefined();
  });

  it("rechaza formas inesperadas", () => {
    expect(leerFormularioHidrosanitaria({ ...copia(), calentador: "nuclear" })).toBeNull();
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

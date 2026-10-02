import { describe, expect, it } from "vitest";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { calcularEstudio, estudioDeFolio } from "./registro";
import { entradaPozo, FORMULARIO_POZO_INICIAL, leerFormularioPozo } from "./pozo";

const copia = () => JSON.parse(JSON.stringify(FORMULARIO_POZO_INICIAL));

describe("formulario de pozo", () => {
  it("acepta el inicial y el servidor lo calcula", () => {
    expect(leerFormularioPozo(copia())).toEqual(FORMULARIO_POZO_INICIAL);
    expect(calcularEstudio("pozo", copia()).ok).toBe(true);
  });

  it("ignora renglones vacíos y deja el pozo de observación opcional", () => {
    const f = copia();
    f.lecturas.push({ t: "", s: "" });
    const e = entradaPozo(f);
    expect(e.lecturas).toHaveLength(10);
    expect(e.radioObservacion).toBeUndefined();
    expect(e.aberturaRejilla).toBeCloseTo(0.15);
  });

  it("lee las memorias anteriores sin los campos nuevos", () => {
    const viejo = copia();
    for (const k of ["horasDia", "diasAno", "eficienciaMotor", "tarifa", "volumenConcesionado"]) delete viejo[k];
    const f = leerFormularioPozo(viejo)!;
    expect(f.tarifa).toBe("");
    const e = entradaPozo(f);
    expect(e.tarifa).toBeUndefined();
    expect(e.eficienciaMotor).toBeUndefined();
    expect(calcularEstudio("pozo", viejo).ok).toBe(true);
  });

  it("lee energía y concesión", () => {
    const e = entradaPozo({ ...copia(), eficienciaMotor: "85", horasDia: "10", volumenConcesionado: "50000" });
    expect(e.eficienciaMotor).toBeCloseTo(0.85);
    expect(e.horasDia).toBe(10);
    expect(e.tarifa).toBe(2.5);
    // 8 L/s · 3.6 · 10 h · 365 = 105 120 m³ > 50 000.
    expect(calcularEstudio("pozo", { ...copia(), horasDia: "10", volumenConcesionado: "50000" })).toEqual({
      ok: false,
      error: expect.stringMatching(/concesión/),
    });
  });

  it("rechaza formas inesperadas", () => {
    expect(leerFormularioPozo({ ...copia(), lecturas: [{ t: 1, s: "1" }] })).toBeNull();
    expect(leerFormularioPozo({ ...copia(), lecturas: Array(61).fill({ t: "1", s: "1" }) })).toBeNull();
    expect(leerFormularioPozo({ ...copia(), gastoPrueba: 10 })).toBeNull();
  });

  it("explica por qué no genera memoria", () => {
    expect(calcularEstudio("pozo", { ...copia(), profundidad: "35" })).toEqual({
      ok: false,
      error: expect.stringMatching(/fondo/),
    });
  });

  it("reconoce el folio", () => {
    expect(estudioDeFolio("POZ-20261001-ABCDEF")).toBe("pozo");
    expect(FOLIO_VALIDO.test("POZ-20261001-ABCDEF")).toBe(true);
  });
});

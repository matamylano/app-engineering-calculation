import { describe, expect, it } from "vitest";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { calcularEstudio, estudioDeFolio } from "./registro";
import {
  entradaZapata,
  FORMULARIO_ZAPATA_INICIAL,
  leerFormularioZapata,
} from "./zapata";

const copia = () => ({
  ...FORMULARIO_ZAPATA_INICIAL,
  project: { ...FORMULARIO_ZAPATA_INICIAL.project },
});

describe("formulario de zapata aislada", () => {
  it("acepta el inicial y el servidor lo calcula", () => {
    expect(leerFormularioZapata(copia())).toEqual(FORMULARIO_ZAPATA_INICIAL);
    const r = calcularEstudio("zapata", copia());
    expect(r.ok && "resultado" in r.valor && r.valor.resultado).toMatchObject({
      lado: 1.5,
      cumple: true,
    });
  });

  it("deja el lado vacío como el mínimo y convierte el incremento", () => {
    const e = entradaZapata(copia());
    expect(e.lado).toBeUndefined();
    expect(e.incremento).toBeCloseTo(0.1);
    expect(entradaZapata({ ...copia(), lado: "1.8" }).lado).toBe(1.8);
  });

  it("rechaza formas inesperadas", () => {
    expect(leerFormularioZapata({ ...copia(), carga: 20 })).toBeNull();
    expect(
      leerFormularioZapata({ ...copia(), elemento: "x".repeat(101) }),
    ).toBeNull();
    expect(leerFormularioZapata(null)).toBeNull();
  });

  it("no genera memoria de una zapata que no pasa", () => {
    const r = calcularEstudio("zapata", {
      ...copia(),
      carga: "80",
      cargaUltima: "112",
      h: "20",
    });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/cortante/) });
    expect(calcularEstudio("zapata", { ...copia(), varilla: "7" })).toEqual({
      ok: false,
      error: expect.stringMatching(/Varilla/),
    });
  });

  it("reconoce el folio", () => {
    expect(estudioDeFolio("ZAP-20261001-ABCDEF")).toBe("zapata");
    expect(FOLIO_VALIDO.test("ZAP-20261001-ABCDEF")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { calcularEstudio, estudioDeFolio } from "./registro";
import { prellenar } from "./prellenar";
import {
  CAMPOS_PRELLENAR_ZAPATA,
  completarFormularioZapata,
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

  it("lee memorias viejas sin los campos nuevos y da el mismo resultado", () => {
    const viejo: Record<string, unknown> = copia();
    for (const k of ["largo", "momento", "cimbra", "piezas", "precioConcreto", "precioAcero", "precioCimbra"]) delete viejo[k];
    const f = leerFormularioZapata(viejo)!;
    expect(f).toMatchObject({ largo: "", momento: "", cimbra: "", piezas: "" });
    const e = entradaZapata(f);
    expect(e.largo).toBeUndefined();
    expect(e.momento).toBeUndefined();
    const r = calcularEstudio("zapata", viejo);
    expect(r.ok && "resultado" in r.valor && r.valor.resultado).toMatchObject({ lado: 1.5, largo: 1.5, presiones: null });
    // En pantalla, el formulario viejo se completa con las opciones apagadas.
    expect(completarFormularioZapata(viejo as never)).toMatchObject({ largo: "", cimbra: "", piezas: "1" });
  });

  it("toma el largo y el momento", () => {
    const e = entradaZapata({ ...copia(), largo: "2", momento: "3" });
    expect(e).toMatchObject({ largo: 2, momento: 3 });
  });

  it("se prellena desde la URL", () => {
    const f = prellenar(copia(), { cargaUltima: "35.5", c1: "40", lado: "3" }, CAMPOS_PRELLENAR_ZAPATA);
    expect(f).toMatchObject({ cargaUltima: "35.5", c1: "40", lado: "" });
  });
});

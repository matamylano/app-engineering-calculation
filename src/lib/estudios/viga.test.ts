import { describe, expect, it } from "vitest";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { calcularEstudio, estudioDeFolio } from "./registro";
import { prellenar } from "./prellenar";
import { CAMPOS_PRELLENAR_VIGA, cargasTributarias, entradaViga, FORMULARIO_VIGA_INICIAL, leerFormularioViga } from "./viga";

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

  it("cargas por área tributaria", () => {
    // 3 m × 500 kg/m² = 1.5 t/m + 0.6 t/m de muro; 3 m × 190 kg/m² = 0.57 t/m.
    const f = { ...copia(), tributaria: true, muros: "0.6" };
    expect(cargasTributarias(f)).toEqual({ muerta: 2.1, viva: 0.57 });
    expect(entradaViga(f)).toMatchObject({ muerta: 2.1, viva: 0.57 });
    expect(cargasTributarias(copia())).toBeNull();
    expect(entradaViga({ ...f, anchoTributario: "" }).muerta).toBeNaN();
    expect(calcularEstudio("viga", { ...f, anchoTributario: "" }).ok).toBe(false);
  });

  it("lee memorias anteriores sin los campos nuevos", () => {
    const vieja: Record<string, unknown> = copia();
    for (const k of ["tributaria", "anchoTributario", "muertaArea", "vivaArea", "usoArea", "muros", "vivaSostenida", "elementosFragiles", "piezas", "precioConcreto", "precioAcero", "precioCimbra"])
      delete vieja[k];
    const f = leerFormularioViga(vieja);
    expect(f).toMatchObject({ tributaria: false, elementosFragiles: false, vivaSostenida: "", piezas: "" });
    expect(entradaViga(f!).vivaSostenida).toBeUndefined();
    expect(calcularEstudio("viga", vieja).ok).toBe(true);
    expect(leerFormularioViga({ ...copia(), usoArea: "bodega" })).toBeNull();
    expect(leerFormularioViga({ ...copia(), tributaria: "si" })).toBeNull();
  });

  it("se prellena por la URL", () => {
    const f = prellenar(FORMULARIO_VIGA_INICIAL, { claro: "6.5", h: "50", elemento: "x" }, CAMPOS_PRELLENAR_VIGA);
    expect(f).toMatchObject({ claro: "6.5", h: "50", elemento: FORMULARIO_VIGA_INICIAL.elemento });
  });
});

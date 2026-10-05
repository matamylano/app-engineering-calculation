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

describe("opciones nuevas del drenaje pluvial", () => {
  it("lee formularios guardados antes de las opciones nuevas", () => {
    const viejo = pluvial();
    for (const k of ["diametroBajada", "captacion", "lluviaMensual", "lluviaAnual", "areaCaptacion", "coeficienteTecho", "personas", "dotacion", "demandaDiaria", "cisterna"])
      delete viejo[k];
    const f = leerFormularioPluvial(viejo)!;
    expect(f.diametroBajada).toBe("100");
    expect(f.captacion).toBe("");
    expect(f.lluviaMensual).toHaveLength(12);
    expect(calcularEstudio("pluvial", viejo).ok).toBe(true);
  });

  it("captación con lluvia mensual y área de azotea por omisión", () => {
    const f = pluvial();
    f.captacion = "si";
    f.lluviaMensual = ["0", "0", "0", "0", "50", "150", "200", "200", "150", "50", "0", "0"];
    const e = entradaPluvial(f);
    expect(e.captacion).toMatchObject({ area: 120, coeficiente: 0.85, demandaDiaria: 200, personas: 4 });
    expect(e.captacion!.lluviaMensual).toHaveLength(12);
    expect(calcularEstudio("pluvial", f).ok).toBe(true);
    // La demanda directa manda sobre personas × dotación.
    f.demandaDiaria = "300";
    expect(entradaPluvial(f).captacion).toMatchObject({ demandaDiaria: 300, personas: undefined });
  });

  it("captación sin lluvia explica el error y rechaza meses mal formados", () => {
    const f = pluvial();
    f.captacion = "si";
    expect(calcularEstudio("pluvial", f)).toEqual({ ok: false, error: expect.stringMatching(/12 meses o la lluvia anual/) });
    expect(leerFormularioPluvial({ ...f, lluviaMensual: ["1"] })).toBeNull();
    expect(leerFormularioPluvial({ ...f, lluviaMensual: Array(12).fill(5) })).toBeNull();
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

describe("opciones nuevas de la fosa", () => {
  it("lee formularios guardados antes de las opciones nuevas", () => {
    const viejo = fosa();
    for (const k of ["disposicion", "diametroPozo", "profundidadMaximaPozo", "trampa", "metodoTrampa", "gastoFregadero", "retencionTrampa", "inicio", "costoDesazolve"])
      delete viejo[k];
    const f = leerFormularioFosa(viejo)!;
    expect(f.disposicion).toBe("zanjas");
    expect(entradaFosa(f)).toMatchObject({ disposicion: "zanjas", trampa: undefined, inicio: undefined });
    expect(calcularEstudio("fosa", viejo).ok).toBe(true);
  });

  it("pozo de absorción, trampa y desazolve", () => {
    const f = fosa();
    f.disposicion = "pozo";
    f.trampa = "si";
    f.metodoTrampa = "gasto";
    f.inicio = "2026-10";
    f.costoDesazolve = "1800";
    expect(entradaFosa(f)).toMatchObject({
      pozo: { diametro: 1.5, profundidadMaxima: 3 },
      trampa: { metodo: "gasto", gasto: 0.25, retencion: 3 },
      inicio: "2026-10",
      costoDesazolve: 1800,
    });
    expect(calcularEstudio("fosa", f).ok).toBe(true);
    expect(calcularEstudio("fosa", { ...f, inicio: "octubre" })).toEqual({ ok: false, error: expect.stringMatching(/AAAA-MM/) });
  });
});

describe("folios", () => {
  it("reconoce PLU y FOS", () => {
    expect(estudioDeFolio("PLU-20261001-ABCDEF")).toBe("pluvial");
    expect(estudioDeFolio("FOS-20261001-ABCDEF")).toBe("fosa");
    expect(FOLIO_VALIDO.test("FOS-20261001-ABCDEF")).toBe(true);
  });
});

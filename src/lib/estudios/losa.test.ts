import { describe, expect, it } from "vitest";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { calcularEstudio, estudioDeFolio } from "./registro";
import { CAMPOS_PRELLENAR_LOSA, entradaLosa, FORMULARIO_LOSA_INICIAL, leerFormularioLosa, vivaDeUso } from "./losa";
import { prellenar } from "./prellenar";

const copia = () => ({ ...FORMULARIO_LOSA_INICIAL, project: { ...FORMULARIO_LOSA_INICIAL.project } });

describe("formulario de losa", () => {
  it("acepta el inicial y el servidor lo calcula", () => {
    expect(leerFormularioLosa(copia())).toEqual(FORMULARIO_LOSA_INICIAL);
    expect(calcularEstudio("losa", copia()).ok).toBe(true);
    expect(entradaLosa(copia())).toMatchObject({ claro: 3, h: 12, incrementos: true });
  });

  it("rechaza formas inesperadas", () => {
    expect(leerFormularioLosa({ ...copia(), incrementos: "si" })).toBeNull();
    expect(leerFormularioLosa({ ...copia(), apoyo: "cuatro-bordes" })).toBeNull();
    expect(leerFormularioLosa({ ...copia(), h: 12 })).toBeNull();
  });

  it("explica por qué no genera memoria", () => {
    expect(calcularEstudio("losa", { ...copia(), claro: "6", muerta: "600", viva: "500", h: "10" })).toEqual({
      ok: false,
      error: expect.stringMatching(/espesor/),
    });
  });

  it("reconoce el folio", () => {
    expect(estudioDeFolio("LOS-20261001-ABCDEF")).toBe("losa");
    expect(FOLIO_VALIDO.test("LOS-20261001-ABCDEF")).toBe(true);
  });

  it("carga viva por destino (NTC Criterios y Acciones)", () => {
    expect(vivaDeUso("habitacion")).toEqual({ viva: "190", vivaSostenida: "42" });
    expect(vivaDeUso("oficinas")).toEqual({ viva: "250", vivaSostenida: "40" });
    expect(vivaDeUso("azotea-plana")).toEqual({ viva: "100", vivaSostenida: "15" });
    expect(entradaLosa(copia()).vivaSostenida).toBeCloseTo(0.42, 9);
    expect(leerFormularioLosa({ ...copia(), uso: "bodega" })).toBeNull();
  });

  it("lee memorias anteriores sin los campos nuevos", () => {
    const vieja: Record<string, unknown> = copia();
    for (const k of ["uso", "vivaSostenida", "elementosFragiles", "largo", "piezas", "precioConcreto", "precioAcero", "precioCimbra"]) delete vieja[k];
    expect(leerFormularioLosa(vieja)).toMatchObject({ uso: "", elementosFragiles: false, largo: "", vivaSostenida: "" });
    expect(calcularEstudio("losa", vieja).ok).toBe(true);
  });

  it("se prellena por la URL", () => {
    expect(prellenar(FORMULARIO_LOSA_INICIAL, { claro: "3.5", viva: "250" }, CAMPOS_PRELLENAR_LOSA)).toMatchObject({ claro: "3.5", viva: "250" });
  });
});

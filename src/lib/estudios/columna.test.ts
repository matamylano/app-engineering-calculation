import { describe, expect, it } from "vitest";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { calcularEstudio, estudioDeFolio } from "./registro";
import {
  CAMPOS_PRELLENAR_COLUMNA,
  completarFormularioColumna,
  entradaColumna,
  FORMULARIO_COLUMNA_INICIAL,
  leerFormularioColumna,
} from "./columna";
import { prellenar } from "./prellenar";

const copia = () => ({ ...FORMULARIO_COLUMNA_INICIAL, project: { ...FORMULARIO_COLUMNA_INICIAL.project } });

describe("formulario de columna", () => {
  it("acepta el inicial y el servidor lo calcula", () => {
    expect(leerFormularioColumna(copia())).toEqual(FORMULARIO_COLUMNA_INICIAL);
    expect(calcularEstudio("columna", copia()).ok).toBe(true);
  });

  it("toma el momento vacío como cero", () => {
    expect(entradaColumna({ ...copia(), momento: "" }).momento).toBe(0);
    expect(entradaColumna({ ...copia(), momento: " " }).momento).toBe(0);
  });

  it("rechaza formas inesperadas", () => {
    expect(leerFormularioColumna({ ...copia(), carga: 28 })).toBeNull();
    expect(leerFormularioColumna({ project: null })).toBeNull();
  });

  it("explica por qué no genera memoria", () => {
    expect(calcularEstudio("columna", { ...copia(), carga: "200" })).toEqual({
      ok: false,
      error: expect.stringMatching(/carga axial/),
    });
  });

  it("reconoce el folio", () => {
    expect(estudioDeFolio("COL-20261001-ABCDEF")).toBe("columna");
    expect(FOLIO_VALIDO.test("COL-20261001-ABCDEF")).toBe(true);
  });

  it("lee memorias viejas sin los campos nuevos", () => {
    const viejo: Record<string, unknown> = copia();
    for (const k of ["momentoB", "piezas", "precioConcreto", "precioAcero", "precioCimbra"]) delete viejo[k];
    const f = leerFormularioColumna(viejo)!;
    expect(f).toMatchObject({ momentoB: "", piezas: "" });
    expect(entradaColumna(f).momentoB).toBeUndefined();
    const r = calcularEstudio("columna", viejo);
    expect(r.ok && "resultado" in r.valor && r.valor.resultado).toMatchObject({ biaxial: null });
    expect(completarFormularioColumna(viejo as never)).toMatchObject({ momentoB: "", piezas: "1" });
  });

  it("toma el segundo momento y calcula flexión biaxial", () => {
    expect(entradaColumna({ ...copia(), momentoB: "1.5" }).momentoB).toBe(1.5);
    const r = calcularEstudio("columna", { ...copia(), momentoB: "1" });
    expect(r.ok && "resultado" in r.valor && r.valor.resultado).toMatchObject({ armado: { caras: 4 } });
  });

  it("se prellena desde la URL", () => {
    const f = prellenar(copia(), { carga: "41.2", b: "35", fc: "300" }, CAMPOS_PRELLENAR_COLUMNA);
    expect(f).toMatchObject({ carga: "41.2", b: "35", fc: "250" });
  });
});

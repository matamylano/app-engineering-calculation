import { describe, expect, it } from "vitest";
import { calcularEstudio, estudioDeFolio } from "./registro";
import { FORMULARIO_CARGAS_INICIAL, leerFormularioCargas } from "./cargas";

const copia = () => JSON.parse(JSON.stringify(FORMULARIO_CARGAS_INICIAL));

describe("formulario de bajada de cargas", () => {
  it("acepta el inicial y el servidor lo calcula", () => {
    expect(leerFormularioCargas(copia())).toEqual(FORMULARIO_CARGAS_INICIAL);
    const r = calcularEstudio("cargas", copia());
    expect(r.ok).toBe(true);
  });

  it("rechaza formas inesperadas y demasiados niveles", () => {
    expect(leerFormularioCargas({ ...copia(), niveles: [{ ...copia().niveles[0], uso: "nave" }] })).toBeNull();
    expect(leerFormularioCargas({ ...copia(), niveles: Array(7).fill(copia().niveles[0]) })).toBeNull();
    expect(leerFormularioCargas({ ...copia(), elementos: [{ nombre: "C", area: 4 }] })).toBeNull();
  });

  it("explica el error cuando los datos no cierran", () => {
    const f = copia();
    f.elementos[0].area = "";
    const r = calcularEstudio("cargas", f);
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/área tributaria/) });
  });

  it("reconoce el estudio por el folio", () => {
    expect(estudioDeFolio("CAR-20261001-ABCDEF")).toBe("cargas");
    expect(estudioDeFolio("SUE-20261001-ABCDEF")).toBe("suelos");
    expect(estudioDeFolio("XXX-20261001-ABCDEF")).toBeNull();
  });
});

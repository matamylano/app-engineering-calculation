import { describe, expect, it } from "vitest";
import type { DatosCargas } from "@/lib/servidor/tipos";
import { calcularEstudio, estudioDeFolio } from "./registro";
import { entradaCargas, FORMULARIO_CARGAS_INICIAL, leerFormularioCargas } from "./cargas";

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

describe("sistemas de piso y muros en el formulario", () => {
  it("lee formularios viejos sin los campos nuevos y calcula igual", () => {
    const viejo = copia();
    for (const n of viejo.niveles) {
      for (const k of ["sistema", "pesoSistema", "tipoMuro", "alturaMuro", "longitudMuro", "areaNivel"]) delete n[k];
    }
    const f = leerFormularioCargas(viejo);
    expect(f?.niveles[0].sistema).toBe("manual");
    expect(f?.niveles[0].tipoMuro).toBe("manual");
    const r1 = calcularEstudio("cargas", viejo);
    const r2 = calcularEstudio("cargas", copia());
    if (!r1.ok || !r2.ok) throw new Error("no calculó");
    const servicio = (r: typeof r1) => (r.ok ? (r.valor as DatosCargas).resultado.elementos[2].servicio : Number.NaN);
    expect(servicio(r1)).toBeCloseTo(servicio(r2), 9);
  });

  it("muros vacío cuenta como cero", () => {
    const f = copia();
    f.niveles[1].muros = "";
    expect(entradaCargas(f).niveles[1].muros).toBe(0);
  });

  it("losacero y muros de tabique llegan al motor", () => {
    const f = copia();
    Object.assign(f.niveles[1], { sistema: "losacero", pesoSistema: "230", tipoMuro: "tabique-rojo", alturaMuro: "2.5", longitudMuro: "20", areaNivel: "60" });
    const e = entradaCargas(f).niveles[1];
    expect(e.pesoSistema).toBe(230);
    expect(e.muro).toEqual({ tipo: "tabique-rojo", peso: 300, altura: 2.5, longitud: 20, area: 60 });
    expect(leerFormularioCargas({ ...f, niveles: [{ ...f.niveles[0], sistema: "carton" }] })).toBeNull();
  });
});

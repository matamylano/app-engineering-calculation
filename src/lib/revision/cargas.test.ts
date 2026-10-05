import { describe, expect, it } from "vitest";
import { bajadaDeCargas } from "@/calc/cargas/bajada";
import {
  entradaCargas,
  FORMULARIO_CARGAS_INICIAL,
  leerFormularioCargas,
} from "@/lib/estudios/cargas";
import { EJEMPLOS_CARGAS } from "./cargas";

describe("ejemplos de la bajada de cargas", () => {
  it.each(EJEMPLOS_CARGAS)("el ejemplo «$nombre» calcula", (ej) => {
    expect(ej.cumple).toBe(true);
    const f = { ...FORMULARIO_CARGAS_INICIAL, ...ej.valores };
    // El servidor lo acepta tal cual (así se puede generar la memoria).
    expect(leerFormularioCargas(f)).toEqual(f);
    const r = bajadaDeCargas(entradaCargas(f));
    expect(r.niveles).toHaveLength(f.niveles.length);
    for (const el of r.elementos) {
      expect(el.servicio).toBeGreaterThan(0);
      expect(el.ultima).toBeGreaterThan(el.servicio);
      expect(el.cimentacion?.lado).toBeGreaterThan(0);
    }
  });
});

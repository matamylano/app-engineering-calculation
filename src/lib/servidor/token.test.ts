import { describe, expect, it } from "vitest";
import { crearToken, DURACION_SESION_S, leerToken } from "./token";

const u = { id: "u1", email: "a@b.mx" };
const S = "x".repeat(32);

describe("token de sesión", () => {
  it("lee lo que firma", () => {
    expect(leerToken(crearToken(u, S), S)).toEqual(u);
  });

  it("rechaza otro secreto, alteraciones y basura", () => {
    const t = crearToken(u, S);
    expect(leerToken(t, "y".repeat(32))).toBeNull();
    const [datos, firma] = t.split(".");
    const otro = Buffer.from(JSON.stringify({ id: "u2", email: "a@b.mx", exp: 9e9 })).toString("base64url");
    expect(leerToken(`${otro}.${firma}`, S)).toBeNull();
    expect(leerToken(`${datos}.${firma}.x`, S)).toBeNull();
    expect(leerToken("nada", S)).toBeNull();
    expect(leerToken(undefined, S)).toBeNull();
  });

  it("vence", () => {
    const ahora = Date.UTC(2026, 0, 1);
    const t = crearToken(u, S, ahora);
    expect(leerToken(t, S, ahora + (DURACION_SESION_S - 1) * 1000)).toEqual(u);
    expect(leerToken(t, S, ahora + DURACION_SESION_S * 1000)).toBeNull();
  });
});

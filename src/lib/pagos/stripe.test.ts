import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { formStripe, verificarFirmaStripe } from "./stripe";

const firmar = (cuerpo: string, t: number, secreto: string) =>
  `t=${t},v1=${createHmac("sha256", secreto).update(`${t}.${cuerpo}`).digest("hex")}`;

describe("stripe", () => {
  it("codifica objetos anidados como los espera Stripe", () => {
    expect(formStripe({ a: 1, b: { c: "x y", d: undefined }, e: { 0: { f: true } } })).toEqual(["a=1", "b%5Bc%5D=x%20y", "e%5B0%5D%5Bf%5D=true"]);
  });

  it("verifica la firma del webhook", () => {
    const ahora = 1_800_000_000_000;
    const t = ahora / 1000;
    const cuerpo = '{"id":"evt_1"}';
    expect(verificarFirmaStripe(cuerpo, firmar(cuerpo, t, "whsec"), "whsec", ahora)).toBe(true);
    expect(verificarFirmaStripe(cuerpo, `${firmar(cuerpo, t, "otro")},v1=abc`, "whsec", ahora)).toBe(false);
    expect(verificarFirmaStripe(`${cuerpo} `, firmar(cuerpo, t, "whsec"), "whsec", ahora)).toBe(false);
    expect(verificarFirmaStripe(cuerpo, firmar(cuerpo, t - 301, "whsec"), "whsec", ahora)).toBe(false);
    expect(verificarFirmaStripe(cuerpo, null, "whsec", ahora)).toBe(false);
    expect(verificarFirmaStripe(cuerpo, "basura", "whsec", ahora)).toBe(false);
  });
});

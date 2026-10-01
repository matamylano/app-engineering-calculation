import { describe, expect, it } from "vitest";
import { FORMULARIO_INICIAL, type FormularioSuelos } from "@/lib/estudios/suelos";
import { FREE_CREDITS } from "@/lib/creditos";
import { AlmacenDemo } from "./almacen-demo";
import type { DatosSuelos } from "./tipos";
import {
  actualizarMemoria,
  aprobarMemoria,
  FOLIO_VALIDO,
  generarMemoria,
  huellaMemoria,
  jsonEstable,
  marcarFirmaPagada,
  nuevoFolio,
  rechazarMemoria,
  reenviarARevision,
} from "./memorias";

const cliente = { id: "cliente-1", email: "cliente@obra.mx" };
const otro = { id: "cliente-2", email: "otro@obra.mx" };
const ing = { id: "ing-1", email: "firmante@demo.mx" };
const datosIng = { nombre: "Ing. Juan Pérez", cedula: "1234567", registro: "DRO-123" };

async function preparar() {
  const alm = new AlmacenDemo();
  await alm.asegurarUsuario(cliente);
  await alm.asegurarUsuario(otro);
  return alm;
}

const conB = (b: string): FormularioSuelos => ({ ...FORMULARIO_INICIAL, values: { ...FORMULARIO_INICIAL.values, b } });

describe("memorias", () => {
  it("las cuentas nuevas reciben los créditos de bienvenida una sola vez", async () => {
    const alm = await preparar();
    await alm.asegurarUsuario(cliente);
    expect(await alm.saldo(cliente.id)).toBe(FREE_CREDITS);
  });

  it("generar gasta un crédito y recalcula en el servidor", async () => {
    const alm = await preparar();
    const r = await generarMemoria(alm, cliente, "suelos", FORMULARIO_INICIAL);
    if (!r.ok) throw new Error(r.error);
    expect(r.valor.folio).toMatch(FOLIO_VALIDO);
    expect(r.valor.estado).toBe("borrador");
    expect(await alm.saldo(cliente.id)).toBe(FREE_CREDITS - 1);
    const { resultado } = r.valor.datos as DatosSuelos;
    const qa = resultado.bearing.ok ? resultado.bearing.value.allowable : 0;
    // 45.15 t/m² del ejemplo verificado a mano.
    expect(qa / 9.80665).toBeCloseTo(45.15, 1);
  });

  it("no genera con datos que no cierran ni sin créditos", async () => {
    const alm = await preparar();
    expect((await generarMemoria(alm, cliente, "suelos", conB("0"))).ok).toBe(false);
    expect(await alm.saldo(cliente.id)).toBe(FREE_CREDITS);
    for (let i = 0; i < FREE_CREDITS; i++) expect((await generarMemoria(alm, cliente, "suelos", FORMULARIO_INICIAL)).ok).toBe(true);
    const r = await generarMemoria(alm, cliente, "suelos", FORMULARIO_INICIAL);
    expect(r).toEqual({ ok: false, error: expect.stringContaining("Ya no tienes créditos") });
  });

  it("corregir no gasta crédito y solo lo puede hacer el dueño", async () => {
    const alm = await preparar();
    const r = await generarMemoria(alm, cliente, "suelos", FORMULARIO_INICIAL);
    if (!r.ok) throw new Error(r.error);
    const c = await actualizarMemoria(alm, cliente, r.valor.folio, conB("2"));
    if (!c.ok) throw new Error(c.error);
    expect(c.valor.version).toBe(2);
    expect((c.valor.datos as DatosSuelos).entrada.bearing.width).toBe(2);
    expect(await alm.saldo(cliente.id)).toBe(FREE_CREDITS - 1);
    expect((await actualizarMemoria(alm, otro, r.valor.folio, conB("3"))).ok).toBe(false);
  });

  it("flujo de firma: pago → revisión → cambios → reenvío → aprobación congelada", async () => {
    const alm = await preparar();
    const g = await generarMemoria(alm, cliente, "suelos", FORMULARIO_INICIAL);
    if (!g.ok) throw new Error(g.error);
    const folio = g.valor.folio;

    // Sin pagar no se puede aprobar.
    expect((await aprobarMemoria(alm, ing, folio, datosIng)).ok).toBe(false);

    const p = await marcarFirmaPagada(alm, folio);
    expect(p.ok && p.valor.estado).toBe("en_revision");
    // Idempotente: un segundo aviso del pago no cambia nada.
    const p2 = await marcarFirmaPagada(alm, folio);
    expect(p2.ok && p2.valor.version).toBe(p.ok && p.valor.version);

    // En revisión el cliente no puede corregir.
    expect((await actualizarMemoria(alm, cliente, folio, conB("2"))).ok).toBe(false);

    expect((await rechazarMemoria(alm, folio, "  ")).ok).toBe(false);
    const rech = await rechazarMemoria(alm, folio, "Falta el sondeo a 3 m.");
    expect(rech.ok && rech.valor.estado).toBe("rechazada");

    expect((await actualizarMemoria(alm, cliente, folio, conB("1.8"))).ok).toBe(true);
    expect((await reenviarARevision(alm, otro, folio)).ok).toBe(false);
    const re = await reenviarARevision(alm, cliente, folio);
    expect(re.ok && re.valor.estado).toBe("en_revision");

    expect((await aprobarMemoria(alm, ing, folio, { ...datosIng, cedula: " " })).ok).toBe(false);
    const ok = await aprobarMemoria(alm, ing, folio, datosIng, new Date("2026-10-02T15:00:00Z"));
    if (!ok.ok) throw new Error(ok.error);
    expect(ok.valor.estado).toBe("aprobada");
    expect(ok.valor.firma).toMatchObject({ ...datosIng, firmanteId: ing.id, aprobadaEn: "2026-10-02T15:00:00.000Z" });
    expect(ok.valor.notasRevision).toBeUndefined();

    // La huella se puede recalcular con lo guardado.
    const guardada = (await alm.memoria(folio))!;
    const { huella, ...firmante } = guardada.firma!;
    expect(huellaMemoria(guardada, firmante)).toBe(huella);
    expect(huella).toMatch(/^[0-9a-f]{64}$/);

    // Congelada.
    expect((await actualizarMemoria(alm, cliente, folio, conB("2"))).ok).toBe(false);
    expect((await rechazarMemoria(alm, folio, "otra cosa")).ok).toBe(false);
    expect((await aprobarMemoria(alm, ing, folio, datosIng)).ok).toBe(false);
  });

  it("no pisa cambios simultáneos", async () => {
    const alm = await preparar();
    const g = await generarMemoria(alm, cliente, "suelos", FORMULARIO_INICIAL);
    if (!g.ok) throw new Error(g.error);
    expect(await alm.guardarMemoria({ ...g.valor, version: 2 }, 1)).toBe(true);
    expect(await alm.guardarMemoria({ ...g.valor, version: 2 }, 1)).toBe(false);
  });

  it("jsonEstable no depende del orden de las llaves", () => {
    expect(jsonEstable({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: undefined } })).toBe(jsonEstable({ a: { d: [1, { y: 2, z: 1 }] }, b: 1 }));
  });
});

describe("nuevoFolio", () => {
  it("usa la fecha de México", () => {
    // 1 de octubre 03:00 UTC = 30 de septiembre en la CDMX.
    expect(nuevoFolio(new Date("2026-10-01T03:00:00Z"))).toMatch(/^SUE-20260930-[0-9A-F]{6}$/);
  });
});

describe("memoria de bajada de cargas", () => {
  it("usa folio CAR y el precio de su firma", async () => {
    const { FORMULARIO_CARGAS_INICIAL } = await import("@/lib/estudios/cargas");
    const alm = await preparar();
    const r = await generarMemoria(alm, cliente, "cargas", FORMULARIO_CARGAS_INICIAL);
    if (!r.ok) throw new Error(r.error);
    expect(r.valor.folio).toMatch(/^CAR-\d{8}-[0-9A-F]{6}$/);
    expect(r.valor.folio).toMatch(FOLIO_VALIDO);
    // Corregir con un formulario de otro estudio no pasa.
    expect((await actualizarMemoria(alm, cliente, r.valor.folio, FORMULARIO_INICIAL)).ok).toBe(false);
  });
});

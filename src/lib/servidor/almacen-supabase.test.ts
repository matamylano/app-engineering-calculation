import { describe, expect, it, vi } from "vitest";
import { FORMULARIO_INICIAL } from "@/lib/estudios/suelos";
import { AlmacenSupabase, aFila, deFila } from "./almacen-supabase";
import { calcular } from "./memorias";
import type { RegistroMemoria } from "./tipos";

const datos = calcular(FORMULARIO_INICIAL);
if (!datos.ok) throw new Error(datos.error);
const m: RegistroMemoria = {
  folio: "SUE-20261001-ABC123",
  usuarioId: "u1",
  estudio: "suelos",
  estado: "borrador",
  version: 1,
  creadaEn: "2026-10-01T00:00:00.000Z",
  actualizadaEn: "2026-10-01T00:00:00.000Z",
  datos: datos.valor,
  firmaPagada: false,
};
const res = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("AlmacenSupabase", () => {
  it("convierte filas sin perder datos", () => {
    expect(deFila(JSON.parse(JSON.stringify(aFila(m))))).toEqual(JSON.parse(JSON.stringify(m)));
  });

  it("crea la memoria con la RPC que gasta el crédito", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(res("sin-creditos"));
    const alm = new AlmacenSupabase("https://x.supabase.co", "srv", f);
    expect(await alm.crearMemoriaConCredito(m)).toBe("sin-creditos");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/rpc/crear_memoria_con_credito");
    expect(init?.headers).toMatchObject({ apikey: "srv", authorization: "Bearer srv" });
    expect(JSON.parse(String(init?.body)).p_memoria.folio).toBe(m.folio);
  });

  it("guarda solo si la versión no cambió", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValueOnce(res([aFila(m)])).mockResolvedValueOnce(res([]));
    const alm = new AlmacenSupabase("https://x.supabase.co", "srv", f);
    expect(await alm.guardarMemoria({ ...m, version: 2 }, 1)).toBe(true);
    expect(await alm.guardarMemoria({ ...m, version: 2 }, 1)).toBe(false);
    expect(f.mock.calls[0][0]).toBe(`https://x.supabase.co/rest/v1/memorias?folio=eq.${m.folio}&version=eq.1`);
    expect(f.mock.calls[0][1]?.method).toBe("PATCH");
  });

  it("registra pagos sin duplicar", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValueOnce(res([{ id: "cs_1" }])).mockResolvedValueOnce(res([]));
    const alm = new AlmacenSupabase("https://x.supabase.co", "srv", f);
    const p = { id: "cs_1", usuarioId: "u1", tipo: "creditos" as const, montoCentavos: 1, moneda: "mxn", paquete: "c10" };
    expect(await alm.registrarPago(p)).toBe(true);
    expect(await alm.registrarPago(p)).toBe(false);
    expect(f.mock.calls[0][1]?.headers).toMatchObject({ prefer: "resolution=ignore-duplicates,return=representation" });
  });

  it("los errores de Supabase no se tragan", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(new Response("boom", { status: 500 }));
    await expect(new AlmacenSupabase("https://x", "k", f).saldo("u")).rejects.toThrow(/500/);
  });
});

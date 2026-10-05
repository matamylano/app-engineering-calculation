import { describe, expect, it, vi } from "vitest";
import { idDemo, pedirCodigo, verificarCodigo } from "./acceso";
import { CODIGO_DEMO } from "./config";

const real = { SUPABASE_URL: "https://x.supabase.co/", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "srv" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("acceso con código", () => {
  it("modo demostración: no manda correo y acepta el código fijo", async () => {
    expect(await pedirCodigo(" Ana@Correo.MX ", {})).toEqual({ ok: true, valor: { demo: true } });
    const r = await verificarCodigo("Ana@Correo.MX", CODIGO_DEMO, {});
    expect(r).toEqual({ ok: true, valor: { id: idDemo("ana@correo.mx"), email: "ana@correo.mx" } });
    expect((await verificarCodigo("ana@correo.mx", "000000", {})).ok).toBe(false);
  });

  it("el id de demostración es estable y tiene forma de UUID", () => {
    expect(idDemo("a@b.mx")).toBe(idDemo("a@b.mx"));
    expect(idDemo("a@b.mx")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("valida correo y código antes de llamar a Supabase", async () => {
    const f = vi.fn<typeof fetch>();
    expect((await pedirCodigo("no-es-correo", real, f)).ok).toBe(false);
    expect((await verificarCodigo("a@b.mx", "12ab56", real, f)).ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("con Supabase pide el OTP y lo verifica", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValueOnce(json({})).mockResolvedValueOnce(json({ user: { id: "uuid-1", email: "A@B.mx" } }));
    expect(await pedirCodigo("a@b.mx", real, f)).toEqual({ ok: true, valor: { demo: false } });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/auth/v1/otp");
    expect(JSON.parse(String(init?.body))).toEqual({ email: "a@b.mx", create_user: true });
    expect(await verificarCodigo("a@b.mx", "123 456", real, f)).toEqual({ ok: true, valor: { id: "uuid-1", email: "a@b.mx" } });
    expect(JSON.parse(String(f.mock.calls[1][1]?.body))).toEqual({ type: "email", email: "a@b.mx", token: "123456" });
  });

  it("código incorrecto en Supabase", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(json({ error: "otp_expired" }, 403));
    expect(await verificarCodigo("a@b.mx", "123456", real, f)).toEqual({ ok: false, error: "Código incorrecto o vencido." });
  });
});

import { describe, expect, it, vi } from "vitest";
import { enviarProspecto, normalizarTelefono } from "./agentsales";

const env = {
  AGENTSALES_URL: "https://ventas.example.com",
  AGENTSALES_API_KEY: "clave",
  AGENTSALES_TENANT_ID: "11111111-1111-4111-8111-111111111111",
} as unknown as NodeJS.ProcessEnv;

describe("enviarProspecto", () => {
  it("normaliza el teléfono", () => {
    expect(normalizarTelefono("+52 (442) 123-4567")).toBe("4421234567");
  });

  it("sin configuración se simula y no llama a la red", async () => {
    const fetcher = vi.fn();
    const r = await enviarProspecto({ telefono: "4421234567", interes: "firma" }, {} as NodeJS.ProcessEnv, fetcher);
    expect(r).toEqual({ ok: true, simulado: true });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("manda el lead a /api/leads con la clave y el tenant", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    const r = await enviarProspecto(
      { telefono: "442 123 4567", nombre: "Ana", interes: "creditos", estudio: "suelos" },
      env,
      fetcher,
    );
    expect(r).toEqual({ ok: true, simulado: false });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://ventas.example.com/api/leads");
    expect(init.headers.authorization).toBe("Bearer clave");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      tenant_id: env.AGENTSALES_TENANT_ID,
      telefono: "4421234567",
      nombre: "Ana",
      especialidad: "suelos",
      fuente: "suite-ingenieria",
      datos_extra: { interes: "creditos" },
      opt_in: true,
    });
  });

  it("un 409 (ya era prospecto) cuenta como éxito", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 409 }));
    const r = await enviarProspecto({ telefono: "4421234567", interes: "firma" }, env, fetcher);
    expect(r).toEqual({ ok: true, simulado: false, duplicado: true });
  });

  it("rechaza teléfonos que no son de 10 dígitos", async () => {
    const r = await enviarProspecto({ telefono: "12345", interes: "firma" }, env, vi.fn());
    expect(r.ok).toBe(false);
  });
});

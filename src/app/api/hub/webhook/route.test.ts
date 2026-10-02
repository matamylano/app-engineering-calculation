import { afterEach, describe, expect, it } from "vitest";
import { CABECERA_FIRMA, firmar } from "@/lib/whatsapp/hub-cliente";
import { POST } from "./route";

const SECRETO = "secreto-de-prueba";
const evento = JSON.stringify({ tipo: "hub.prueba", id: "evt_1", fecha: new Date().toISOString(), datos: { mensaje: "hola" } });

const solicitud = (cuerpo: string, firma: string | null) =>
  new Request("http://localhost/api/hub/webhook", {
    method: "POST",
    body: cuerpo,
    headers: firma ? { [CABECERA_FIRMA]: firma } : {},
  });

describe("POST /api/hub/webhook", () => {
  afterEach(() => {
    delete process.env.HUB_WEBHOOK_SECRETO;
  });

  it("503 si el Hub no está configurado", async () => {
    expect((await POST(solicitud(evento, null))).status).toBe(503);
  });

  it("401 con firma inválida", async () => {
    process.env.HUB_WEBHOOK_SECRETO = SECRETO;
    expect((await POST(solicitud(evento, firmar(evento, "otro")))).status).toBe(401);
  });

  it("acepta un evento firmado", async () => {
    process.env.HUB_WEBHOOK_SECRETO = SECRETO;
    const res = await POST(solicitud(evento, firmar(evento, SECRETO)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, tipo: "hub.prueba" });
  });
});

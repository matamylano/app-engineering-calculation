import { describe, expect, it } from "vitest";
import { FORMULARIO_INICIAL } from "@/lib/estudios/suelos";
import { AlmacenDemo } from "./almacen-demo";
import { guardarPerfil, imagenDataUrl, MAX_IMAGEN } from "./firmante";
import { aprobarMemoria, generarMemoria, huellaMemoria, marcarFirmaPagada } from "./memorias";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 4, 5]);
const ing = { id: "ing-1", email: "firmante@demo.mx" };
const datos = { nombre: "Ing. Juan Pérez", cedula: "1234567", registro: "DRO-123" };

describe("imagen de firma", () => {
  it("acepta PNG y JPG por sus primeros bytes", () => {
    expect(imagenDataUrl(PNG)).toEqual({ ok: true, valor: `data:image/png;base64,${Buffer.from(PNG).toString("base64")}` });
    expect(imagenDataUrl(JPG).ok && imagenDataUrl(JPG)).toMatchObject({ valor: expect.stringMatching(/^data:image\/jpeg;base64,/) });
  });

  it("rechaza otros formatos y archivos grandes", () => {
    expect(imagenDataUrl(new TextEncoder().encode("<svg onload=alert(1)>")).ok).toBe(false);
    const grande = new Uint8Array(MAX_IMAGEN + 1);
    grande.set(PNG);
    expect(imagenDataUrl(grande).ok).toBe(false);
  });
});

describe("perfil del firmante", () => {
  it("conserva las imágenes si no se suben nuevas y las quita si se pide", async () => {
    const alm = new AlmacenDemo();
    await guardarPerfil(alm, ing, { ...datos, firma: PNG, sello: JPG });
    const r = await guardarPerfil(alm, ing, { ...datos, nombre: "Ing. Juan Pérez López" });
    expect(r.ok && r.valor.firmaImagen).toMatch(/^data:image\/png/);
    expect(r.ok && r.valor.selloImagen).toMatch(/^data:image\/jpeg/);
    const q = await guardarPerfil(alm, ing, { ...datos, quitarSello: true });
    expect(q.ok && q.valor.selloImagen).toBeUndefined();
    expect((await guardarPerfil(alm, ing, { ...datos, cedula: "" })).ok).toBe(false);
  });

  it("al aprobar, la firma y el sello quedan dentro de la memoria y de su huella", async () => {
    const alm = new AlmacenDemo();
    const cliente = { id: "c-1", email: "c@obra.mx" };
    await alm.asegurarUsuario(cliente);
    const g = await generarMemoria(alm, cliente, FORMULARIO_INICIAL);
    if (!g.ok) throw new Error(g.error);
    await marcarFirmaPagada(alm, g.valor.folio);
    await guardarPerfil(alm, ing, { ...datos, firma: PNG, sello: JPG });
    const a = await aprobarMemoria(alm, ing, g.valor.folio, datos);
    if (!a.ok) throw new Error(a.error);
    expect(a.valor.firma?.firmaImagen).toMatch(/^data:image\/png/);

    const guardada = (await alm.memoria(g.valor.folio))!;
    const { huella, ...firmante } = guardada.firma!;
    expect(huellaMemoria(guardada, firmante)).toBe(huella);
    // Cambiar la imagen cambiaría la huella.
    expect(huellaMemoria(guardada, { ...firmante, firmaImagen: "data:image/png;base64,AAAA" })).not.toBe(huella);

    // Cambiar el perfil después no toca la memoria aprobada.
    await guardarPerfil(alm, ing, { ...datos, quitarFirma: true });
    expect((await alm.memoria(g.valor.folio))!.firma?.firmaImagen).toMatch(/^data:image\/png/);
  });
});

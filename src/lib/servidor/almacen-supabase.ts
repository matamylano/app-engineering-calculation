import { FREE_CREDITS } from "@/lib/creditos";
import type { Almacen, EstadoMemoria, Pago, PerfilFirmante, RegistroMemoria, Usuario } from "./tipos";

/** Fila de la tabla `memorias` (ver supabase/migrations). */
interface FilaMemoria {
  folio: string;
  usuario_id: string;
  estudio: RegistroMemoria["estudio"];
  estado: EstadoMemoria;
  version: number;
  creada_en: string;
  actualizada_en: string;
  datos: RegistroMemoria["datos"];
  firma_pagada: boolean;
  telefono_aviso: string | null;
  notas_revision: string | null;
  firma: RegistroMemoria["firma"] | null;
}

export const aFila = (m: RegistroMemoria): FilaMemoria => ({
  folio: m.folio,
  usuario_id: m.usuarioId,
  estudio: m.estudio,
  estado: m.estado,
  version: m.version,
  creada_en: m.creadaEn,
  actualizada_en: m.actualizadaEn,
  datos: m.datos,
  firma_pagada: m.firmaPagada,
  telefono_aviso: m.telefonoAviso ?? null,
  notas_revision: m.notasRevision ?? null,
  firma: m.firma ?? null,
});

export const deFila = (f: FilaMemoria): RegistroMemoria => ({
  folio: f.folio,
  usuarioId: f.usuario_id,
  estudio: f.estudio,
  estado: f.estado,
  version: f.version,
  creadaEn: f.creada_en,
  actualizadaEn: f.actualizada_en,
  datos: f.datos,
  firmaPagada: f.firma_pagada,
  telefonoAviso: f.telefono_aviso ?? undefined,
  notasRevision: f.notas_revision ?? undefined,
  firma: f.firma ?? undefined,
});

/**
 * Almacén en Supabase por su API REST (PostgREST) con la service role key.
 * Solo se usa en el servidor.
 */
export class AlmacenSupabase implements Almacen {
  readonly tipo = "supabase" as const;

  constructor(
    private url: string,
    private llave: string,
    private fetcher: typeof fetch = fetch,
  ) {}

  private async pedir(ruta: string, init: RequestInit = {}, prefer?: string) {
    const res = await this.fetcher(`${this.url}/rest/v1/${ruta}`, {
      ...init,
      cache: "no-store",
      headers: {
        apikey: this.llave,
        authorization: `Bearer ${this.llave}`,
        "content-type": "application/json",
        ...(prefer ? { prefer } : {}),
      },
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      throw new Error(`Supabase ${init.method ?? "GET"} ${ruta.split("?")[0]}: ${res.status} ${detalle.slice(0, 300)}`);
    }
    return res;
  }

  private async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const res = await this.pedir(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
    const texto = await res.text();
    return (texto ? JSON.parse(texto) : null) as T;
  }

  async asegurarUsuario(u: Usuario) {
    await this.rpc("asegurar_usuario", { p_id: u.id, p_email: u.email, p_creditos: FREE_CREDITS });
  }

  async saldo(usuarioId: string) {
    return Number(await this.rpc<number>("saldo_creditos", { p_usuario: usuarioId }));
  }

  async sumarCreditos(usuarioId: string, cantidad: number, motivo: string, referencia: string) {
    await this.rpc("sumar_creditos", {
      p_usuario: usuarioId,
      p_cantidad: cantidad,
      p_motivo: motivo,
      p_referencia: referencia,
    });
  }

  async crearMemoriaConCredito(m: RegistroMemoria) {
    const r = await this.rpc<string>("crear_memoria_con_credito", { p_memoria: aFila(m) });
    return r === "ok" ? ("ok" as const) : ("sin-creditos" as const);
  }

  async memoria(folio: string) {
    const res = await this.pedir(`memorias?folio=eq.${encodeURIComponent(folio)}&select=*`);
    const filas = (await res.json()) as FilaMemoria[];
    return filas[0] ? deFila(filas[0]) : null;
  }

  async guardarMemoria(m: RegistroMemoria, versionAnterior: number) {
    const res = await this.pedir(
      `memorias?folio=eq.${encodeURIComponent(m.folio)}&version=eq.${versionAnterior}`,
      { method: "PATCH", body: JSON.stringify(aFila(m)) },
      "return=representation",
    );
    return ((await res.json()) as FilaMemoria[]).length === 1;
  }

  async memoriasDeUsuario(usuarioId: string) {
    const res = await this.pedir(
      `memorias?usuario_id=eq.${encodeURIComponent(usuarioId)}&select=*&order=creada_en.desc&limit=200`,
    );
    return ((await res.json()) as FilaMemoria[]).map(deFila);
  }

  async memoriasPorEstado(estado: EstadoMemoria) {
    const res = await this.pedir(`memorias?estado=eq.${estado}&select=*&order=actualizada_en.asc&limit=200`);
    return ((await res.json()) as FilaMemoria[]).map(deFila);
  }

  async registrarPago(p: Pago) {
    const res = await this.pedir(
      "pagos?on_conflict=id",
      {
        method: "POST",
        body: JSON.stringify({
          id: p.id,
          usuario_id: p.usuarioId,
          tipo: p.tipo,
          monto_centavos: p.montoCentavos,
          moneda: p.moneda,
          paquete: p.paquete ?? null,
          folio: p.folio ?? null,
        }),
      },
      "resolution=ignore-duplicates,return=representation",
    );
    return ((await res.json()) as unknown[]).length === 1;
  }

  async perfilFirmante(id: string) {
    const res = await this.pedir(`firmantes?id=eq.${encodeURIComponent(id)}&select=*`);
    const f = ((await res.json()) as FilaFirmante[])[0];
    return f
      ? {
          nombre: f.nombre,
          cedula: f.cedula,
          registro: f.registro,
          firmaImagen: f.firma_imagen ?? undefined,
          selloImagen: f.sello_imagen ?? undefined,
        }
      : null;
  }

  async guardarPerfilFirmante(id: string, p: PerfilFirmante) {
    await this.pedir(
      "firmantes?on_conflict=id",
      {
        method: "POST",
        body: JSON.stringify({
          id,
          nombre: p.nombre,
          cedula: p.cedula,
          registro: p.registro,
          firma_imagen: p.firmaImagen ?? null,
          sello_imagen: p.selloImagen ?? null,
          actualizado_en: new Date().toISOString(),
        }),
      },
      "resolution=merge-duplicates",
    );
  }
}

interface FilaFirmante {
  nombre: string;
  cedula: string;
  registro: string;
  firma_imagen: string | null;
  sello_imagen: string | null;
}

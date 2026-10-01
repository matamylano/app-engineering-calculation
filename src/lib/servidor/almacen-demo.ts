import { FREE_CREDITS } from "@/lib/creditos";
import type { Almacen, EstadoMemoria, Pago, PerfilFirmante, RegistroMemoria, Usuario } from "./tipos";

interface Movimiento {
  usuarioId: string;
  cantidad: number;
  motivo: string;
  referencia: string;
}

const copia = <T,>(x: T): T => structuredClone(x);

/**
 * Almacén en memoria para el modo demostración (sin Supabase) y las pruebas.
 * Los datos viven mientras corre el proceso.
 */
export class AlmacenDemo implements Almacen {
  readonly tipo = "demo" as const;
  private usuarios = new Map<string, Usuario>();
  private movimientos: Movimiento[] = [];
  private memorias = new Map<string, RegistroMemoria>();
  private pagos = new Map<string, Pago>();
  private firmantes = new Map<string, PerfilFirmante>();

  async asegurarUsuario(u: Usuario) {
    if (this.usuarios.has(u.id)) return;
    this.usuarios.set(u.id, { ...u });
    await this.sumarCreditos(u.id, FREE_CREDITS, "bienvenida", `bienvenida:${u.id}`);
  }

  async saldo(usuarioId: string) {
    return this.movimientos.filter((m) => m.usuarioId === usuarioId).reduce((s, m) => s + m.cantidad, 0);
  }

  async sumarCreditos(usuarioId: string, cantidad: number, motivo: string, referencia: string) {
    if (this.movimientos.some((m) => m.referencia === referencia)) return;
    this.movimientos.push({ usuarioId, cantidad, motivo, referencia });
  }

  async crearMemoriaConCredito(m: RegistroMemoria) {
    if ((await this.saldo(m.usuarioId)) < 1) return "sin-creditos" as const;
    if (this.memorias.has(m.folio)) throw new Error(`El folio ${m.folio} ya existe`);
    this.movimientos.push({ usuarioId: m.usuarioId, cantidad: -1, motivo: "memoria", referencia: `memoria:${m.folio}` });
    this.memorias.set(m.folio, copia(m));
    return "ok" as const;
  }

  async memoria(folio: string) {
    const m = this.memorias.get(folio);
    return m ? copia(m) : null;
  }

  async guardarMemoria(m: RegistroMemoria, versionAnterior: number) {
    const actual = this.memorias.get(m.folio);
    if (!actual || actual.version !== versionAnterior) return false;
    this.memorias.set(m.folio, copia(m));
    return true;
  }

  async memoriasDeUsuario(usuarioId: string) {
    return [...this.memorias.values()]
      .filter((m) => m.usuarioId === usuarioId)
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
      .map(copia);
  }

  async memoriasPorEstado(estado: EstadoMemoria) {
    return [...this.memorias.values()]
      .filter((m) => m.estado === estado)
      .sort((a, b) => a.actualizadaEn.localeCompare(b.actualizadaEn))
      .map(copia);
  }

  async registrarPago(p: Pago) {
    if (this.pagos.has(p.id)) return false;
    this.pagos.set(p.id, { ...p });
    return true;
  }

  async perfilFirmante(id: string) {
    const p = this.firmantes.get(id);
    return p ? { ...p } : null;
  }

  async guardarPerfilFirmante(id: string, p: PerfilFirmante) {
    this.firmantes.set(id, { ...p });
  }
}

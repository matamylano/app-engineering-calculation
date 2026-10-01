import type { SoilStudyInput, SoilStudyResult } from "@/calc/soils/study";
import type { UnitSystem } from "@/calc/units";
import type { FormularioSuelos, ProjectInfo } from "@/lib/estudios/suelos";

export interface Usuario {
  id: string;
  email: string;
}

/**
 * borrador → (paga la firma) → en_revision → aprobada
 *                                   ↘ rechazada → (corrige) → en_revision
 */
export type EstadoMemoria = "borrador" | "en_revision" | "aprobada" | "rechazada";

export interface DatosFirmante {
  nombre: string;
  cedula: string;
  registro: string;
}

export interface FirmaMemoria extends DatosFirmante {
  firmanteId: string;
  aprobadaEn: string;
  /** SHA-256 de la memoria congelada (folio, versión, datos y firmante). */
  huella: string;
}

export interface DatosMemoria {
  formulario: FormularioSuelos;
  proyecto: ProjectInfo;
  unidades: UnitSystem;
  entrada: SoilStudyInput;
  resultado: SoilStudyResult;
}

export interface RegistroMemoria {
  folio: string;
  usuarioId: string;
  estudio: "suelos";
  estado: EstadoMemoria;
  /** Sube en cada cambio; sirve para no pisar cambios simultáneos. */
  version: number;
  creadaEn: string;
  actualizadaEn: string;
  datos: DatosMemoria;
  firmaPagada: boolean;
  telefonoAviso?: string;
  notasRevision?: string;
  firma?: FirmaMemoria;
}

export interface Pago {
  /** Id de la sesión de Stripe (o del pago de demostración). */
  id: string;
  usuarioId: string;
  tipo: "creditos" | "firma";
  montoCentavos: number;
  moneda: string;
  paquete?: string;
  folio?: string;
}

export interface Almacen {
  readonly tipo: "supabase" | "demo";
  /** Crea el perfil y da los créditos de bienvenida una sola vez. */
  asegurarUsuario(u: Usuario): Promise<void>;
  saldo(usuarioId: string): Promise<number>;
  /** Suma créditos. Con la misma referencia no se suman dos veces. */
  sumarCreditos(usuarioId: string, cantidad: number, motivo: string, referencia: string): Promise<void>;
  /** Gasta un crédito y guarda la memoria en un solo paso. */
  crearMemoriaConCredito(m: RegistroMemoria): Promise<"ok" | "sin-creditos">;
  memoria(folio: string): Promise<RegistroMemoria | null>;
  /** Guarda si la versión guardada sigue siendo `versionAnterior`. */
  guardarMemoria(m: RegistroMemoria, versionAnterior: number): Promise<boolean>;
  memoriasDeUsuario(usuarioId: string): Promise<RegistroMemoria[]>;
  memoriasPorEstado(estado: EstadoMemoria): Promise<RegistroMemoria[]>;
  /** Registra un pago. Devuelve false si ya estaba registrado. */
  registrarPago(p: Pago): Promise<boolean>;
}

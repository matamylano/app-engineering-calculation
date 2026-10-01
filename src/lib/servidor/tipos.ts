import type { SoilStudyInput, SoilStudyResult } from "@/calc/soils/study";
import type { UnitSystem } from "@/calc/units";
import type { EntradaBajada, ResultadoBajada } from "@/calc/cargas/bajada";
import type { EntradaViga, ResultadoViga } from "@/calc/concreto/viga";
import type { EntradaZapata, ResultadoZapata } from "@/calc/concreto/zapata";
import type { FormularioCargas } from "@/lib/estudios/cargas";
import type { ProjectInfo } from "@/lib/estudios/proyecto";
import type { FormularioSuelos } from "@/lib/estudios/suelos";
import type { FormularioViga } from "@/lib/estudios/viga";
import type { FormularioZapata } from "@/lib/estudios/zapata";

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

/** Datos que el ingeniero guarda una vez para aprobar más rápido. */
export interface PerfilFirmante extends DatosFirmante {
  /** Imagen de su firma como data URL (PNG o JPEG). */
  firmaImagen?: string;
  /** Imagen de su sello como data URL (PNG o JPEG). */
  selloImagen?: string;
}

export interface FirmaMemoria extends PerfilFirmante {
  firmanteId: string;
  aprobadaEn: string;
  /** SHA-256 de la memoria congelada (folio, versión, datos y firmante). */
  huella: string;
}

export type Estudio = "suelos" | "cargas" | "zapata" | "viga";

export interface DatosSuelos {
  formulario: FormularioSuelos;
  proyecto: ProjectInfo;
  unidades: UnitSystem;
  entrada: SoilStudyInput;
  resultado: SoilStudyResult;
}

export interface DatosCargas {
  formulario: FormularioCargas;
  proyecto: ProjectInfo;
  entrada: EntradaBajada;
  resultado: ResultadoBajada;
}

export interface DatosZapata {
  formulario: FormularioZapata;
  proyecto: ProjectInfo;
  entrada: EntradaZapata;
  resultado: ResultadoZapata;
}

export interface DatosViga {
  formulario: FormularioViga;
  proyecto: ProjectInfo;
  entrada: EntradaViga;
  resultado: ResultadoViga;
}

/** Datos de la memoria; su forma depende de `RegistroMemoria.estudio`. */
export type DatosMemoria = DatosSuelos | DatosCargas | DatosZapata | DatosViga;

export interface RegistroMemoria {
  folio: string;
  usuarioId: string;
  estudio: Estudio;
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
  perfilFirmante(id: string): Promise<PerfilFirmante | null>;
  guardarPerfilFirmante(id: string, p: PerfilFirmante): Promise<void>;
}

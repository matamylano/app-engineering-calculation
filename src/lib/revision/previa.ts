import type {
  DatosMemoria,
  Estudio,
  RegistroMemoria,
} from "@/lib/servidor/tipos";

/** Registro de mentira para dibujar la memoria como vista previa, sin folio. */
export function registroPrevio(
  estudio: Estudio,
  datos: DatosMemoria,
): RegistroMemoria {
  const ahora = new Date().toISOString();
  return {
    folio: "VISTA PREVIA",
    usuarioId: "",
    estudio,
    estado: "borrador",
    version: 0,
    creadaEn: ahora,
    actualizadaEn: ahora,
    datos,
    firmaPagada: false,
  };
}

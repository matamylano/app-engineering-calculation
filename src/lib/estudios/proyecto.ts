/** Datos de la obra que llevan todas las memorias. */
export interface ProjectInfo {
  obra: string;
  ubicacion: string;
  cliente: string;
  responsable: string;
  cedula: string;
  registro: string;
}

export const PROJECT_KEYS = ["obra", "ubicacion", "cliente", "responsable", "cedula", "registro"] as const;

export const EMPTY_PROJECT: ProjectInfo = {
  obra: "", ubicacion: "", cliente: "", responsable: "", cedula: "", registro: "",
};

const MAX_TEXTO = 200;

export function leerProyecto(raw: unknown): ProjectInfo | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const p = {} as ProjectInfo;
  for (const k of PROJECT_KEYS) {
    const v = r[k] ?? "";
    if (typeof v !== "string" || v.length > MAX_TEXTO) return null;
    p[k] = v;
  }
  return p;
}

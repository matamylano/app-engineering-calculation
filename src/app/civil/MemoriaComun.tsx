import type { ReactNode } from "react";
import type { ProjectInfo } from "@/lib/estudios/proyecto";
import type { FirmaMemoria } from "@/lib/servidor/tipos";

/** Piezas comunes de las memorias de cálculo. */

export const ZONA = "America/Mexico_City";

export const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: ZONA });

export function H({ children }: { children: ReactNode }) {
  return <h3 className="mt-6 border-b border-zinc-300 pb-1 text-base font-semibold">{children}</h3>;
}

export function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <table className="mt-2 w-full text-sm">
      <tbody>
        {rows.map(([k, val]) => (
          <tr key={k} className="border-b border-zinc-200">
            <td className="py-1 pr-4">{k}</td>
            <td className="py-1 text-right font-mono">{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const blank = (s: string) => (s.trim() === "" ? "________________________" : s);

/** Hoja final: responsable, firma, sello y huella. */
export function HojaFirma({ folio, project, firma }: { folio: string; project: ProjectInfo; firma?: FirmaMemoria }) {
  const responsable = firma
    ? { nombre: firma.nombre, cedula: firma.cedula, registro: firma.registro }
    : { nombre: project.responsable, cedula: project.cedula, registro: project.registro };
  return (
        <section className="page-break mt-10">
          <H>Responsable</H>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            <div className="text-sm">
              <p>
                <b>Nombre:</b> {blank(responsable.nombre)}
              </p>
              <p className="mt-2">
                <b>Cédula profesional:</b> {blank(responsable.cedula)}
              </p>
              <p className="mt-2">
                <b>Registro:</b> {blank(responsable.registro)}
              </p>
              {firma?.firmaImagen ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL congelada en la memoria
                <img src={firma.firmaImagen} alt="Firma" className="mx-auto mt-4 h-16 object-contain" />
              ) : (
                <div className="mt-16" />
              )}
              <div className="border-t border-black pt-1 text-center">Firma</div>
            </div>
            {firma?.selloImagen ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL congelada en la memoria
              <img src={firma.selloImagen} alt="Sello" className="mx-auto h-40 object-contain" />
            ) : (
              <div className="flex h-40 items-center justify-center border border-dashed border-zinc-400 text-sm text-zinc-500">
                Sello
              </div>
            )}
          </div>
          {firma && (
            <p className="mt-6 text-xs">
              Revisada y aprobada por {firma.nombre} el{" "}
              {new Date(firma.aprobadaEn).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: ZONA })}. Huella
              SHA-256: <span className="break-all font-mono">{firma.huella}</span>
            </p>
          )}
          <p className="mt-8 text-xs">
            Folio {folio}.{" "}
            {firma?.firmaImagen
              ? "El ingeniero responsable revisó y aprobó este estudio y asume su responsabilidad técnica. La huella permite comprobar que la memoria no cambió después de la aprobación."
              : "Este documento no tiene validez sin la firma autógrafa del ingeniero responsable, quien asume la responsabilidad técnica del estudio."}
          </p>
        </section>
  );
}

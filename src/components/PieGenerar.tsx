import Link from "next/link";
import { ErrorText } from "./form";
import Icono from "./Icono";
import { Sello } from "./revision/Revision";

interface Props {
  folio?: string;
  creditos: number | null;
  pendiente: boolean;
  error: string | null;
  onGenerar: () => void;
  /** Resultado en vivo: siempre a la vista mientras se cambian datos. */
  veredicto?: { cumple: boolean; texto: string };
}

/** Botón para generar o corregir la memoria, con créditos y errores. */
export default function PieGenerar({
  folio,
  creditos,
  pendiente,
  error,
  onGenerar,
  veredicto,
}: Props) {
  const sinCreditos = !folio && creditos !== null && creditos < 1;
  return (
    <div className="tarjeta no-print sticky bottom-4 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-marca-200 p-4 shadow-elevada dark:border-marca-900">
      {veredicto && (
        <a
          href="#revision"
          className="flex w-full items-center gap-3 border-b border-linea pb-3 text-sm"
        >
          <Sello cumple={veredicto.cumple} />
          <span className="min-w-0 flex-1 text-zinc-700 max-sm:line-clamp-2 max-sm:text-xs dark:text-zinc-300">
            {veredicto.texto}
          </span>
          <span className="hidden text-xs text-marca-600 sm:inline dark:text-marca-300">
            Ver revisión ↑
          </span>
        </a>
      )}
      <button
        type="button"
        onClick={onGenerar}
        disabled={pendiente || sinCreditos}
        className="btn-primario px-5"
      >
        <Icono nombre="documento" className="size-4" />
        {pendiente
          ? "Guardando…"
          : folio
            ? "Guardar cambios en la memoria"
            : "Generar memoria (1 crédito)"}
      </button>
      <span className="text-sm text-zinc-600 max-sm:hidden dark:text-zinc-400">
        {folio
          ? `Corriges la memoria ${folio}; no gasta otro crédito.`
          : creditos === null
            ? "Para generar la memoria entra con tu correo; las cuentas nuevas traen créditos gratis."
            : `Te ${creditos === 1 ? "queda" : "quedan"} ${creditos} ${creditos === 1 ? "crédito" : "créditos"}.`}
      </span>
      {error && (
        <div className="w-full">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {sinCreditos && (
        <p className="w-full text-sm">
          Ya no tienes créditos.{" "}
          <Link href="/cuenta" className="enlace">
            Compra un paquete
          </Link>{" "}
          para seguir generando memorias.
        </p>
      )}
    </div>
  );
}

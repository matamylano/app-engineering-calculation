import Link from "next/link";
import { ErrorText } from "./form";
import Icono from "./Icono";

interface Props {
  folio?: string;
  creditos: number | null;
  pendiente: boolean;
  error: string | null;
  onGenerar: () => void;
}

/** Botón para generar o corregir la memoria, con créditos y errores. */
export default function PieGenerar({ folio, creditos, pendiente, error, onGenerar }: Props) {
  const sinCreditos = !folio && creditos !== null && creditos < 1;
  return (
    <div className="tarjeta no-print sticky bottom-4 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-marca-200 p-4 shadow-elevada dark:border-marca-900">
      <button type="button" onClick={onGenerar} disabled={pendiente || sinCreditos} className="btn-primario px-5">
        <Icono nombre="documento" className="size-4" />
        {pendiente ? "Guardando…" : folio ? "Guardar cambios en la memoria" : "Generar memoria (1 crédito)"}
      </button>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
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

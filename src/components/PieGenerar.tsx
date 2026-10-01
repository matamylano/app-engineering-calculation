import Link from "next/link";
import { ErrorText } from "./form";

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
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onGenerar}
          disabled={pendiente || sinCreditos}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pendiente ? "Guardando…" : folio ? "Guardar cambios en la memoria" : "Generar memoria (1 crédito)"}
        </button>
        <span className="text-sm text-zinc-500">
          {folio
            ? `Corriges la memoria ${folio}; no gasta otro crédito.`
            : creditos === null
              ? "Para generar la memoria entra con tu correo; las cuentas nuevas traen créditos gratis."
              : `Te ${creditos === 1 ? "queda" : "quedan"} ${creditos} ${creditos === 1 ? "crédito" : "créditos"}.`}
        </span>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      {sinCreditos && (
        <p className="text-sm">
          Ya no tienes créditos.{" "}
          <Link href="/cuenta" className="font-medium underline">
            Compra un paquete
          </Link>{" "}
          para seguir generando memorias.
        </p>
      )}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { accionComprar, accionReenviar } from "@/app/acciones";
import BotonImprimir from "@/components/BotonImprimir";
import ContactoVentas from "@/components/ContactoVentas";
import MemoriaDeRegistro from "@/components/MemoriaDeRegistro";
import { Boton, botonSecundario, EstadoPill, Mensajes } from "@/components/ui";
import { FIRMA_CENTAVOS, pesos } from "@/lib/pagos/catalogo";
import { ESTUDIOS } from "@/lib/estudios/registro";
import { almacen } from "@/lib/servidor/config";
import { FOLIO_VALIDO } from "@/lib/servidor/memorias";
import { sesionActual } from "@/lib/servidor/sesion";
import AvisoWhatsApp from "./AvisoWhatsApp";

export async function generateMetadata({ params }: PageProps<"/memorias/[folio]">): Promise<Metadata> {
  return { title: `Memoria ${(await params).folio}` };
}

export default async function Page({ params, searchParams }: PageProps<"/memorias/[folio]">) {
  const { folio } = await params;
  const { pago, error } = await searchParams;
  const sesion = await sesionActual();
  if (!sesion) redirect(`/entrar?siguiente=${encodeURIComponent(`/memorias/${folio}`)}`);
  const m = FOLIO_VALIDO.test(folio) ? await almacen().memoria(folio) : null;
  // Solo la ve su dueño o el ingeniero firmante.
  if (!m || (m.usuarioId !== sesion.id && !sesion.firmante)) notFound();
  const propia = m.usuarioId === sesion.id;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="no-print grid gap-4">
        <Link href={propia ? "/cuenta" : "/firma"} className="text-sm text-zinc-500 hover:underline">
          ← {propia ? "Mi cuenta" : "Panel de firma"}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{m.folio}</h1>
          <EstadoPill estado={m.estado} />
        </div>
        <Mensajes
          error={typeof error === "string" ? error : undefined}
          aviso={pago === "ok" ? "Pago recibido. Tu memoria ya está con el ingeniero para revisión." : pago === "cancelado" ? "Cancelaste el pago; no se cobró nada." : undefined}
        />

        {propia && m.estado === "borrador" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <BotonImprimir />
              <Link href={`${ESTUDIOS[m.estudio].ruta}?folio=${m.folio}`} className={botonSecundario}>
                Corregir datos
              </Link>
              <span className="text-sm text-zinc-500">«Descargar PDF» abre la impresión; elige «Guardar como PDF».</span>
            </div>
            <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">¿No tienes quién firme el estudio?</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Un ingeniero civil con registro revisa tu memoria y, si todo está bien, la firma con su nombre y
                cédula. Si encuentra algo, te dice qué corregir sin costo extra.
              </p>
              <form action={accionComprar} className="mt-3 flex flex-wrap items-center gap-3">
                <input type="hidden" name="tipo" value="firma" />
                <input type="hidden" name="folio" value={m.folio} />
                <Boton>Pedir revisión y firma · {pesos(FIRMA_CENTAVOS[m.estudio])}</Boton>
              </form>
            </section>
            <ContactoVentas
              interes="firma"
              estudio={m.estudio}
              titulo="¿Prefieres hablar con alguien antes?"
              descripcion="Déjanos tu WhatsApp y te contactamos para resolver tus dudas."
            />
          </>
        )}

        {propia && m.estado === "en_revision" && (
          <section className="rounded-lg border border-amber-300 p-5 dark:border-amber-700">
            <h2 className="text-lg font-semibold">El ingeniero está revisando tu memoria</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Cuando la apruebe podrás descargarla aquí mismo con sus datos. Si quieres, te avisamos por WhatsApp.
            </p>
            <AvisoWhatsApp folio={m.folio} telefono={m.telefonoAviso} />
          </section>
        )}

        {propia && m.estado === "rechazada" && (
          <section className="rounded-lg border border-red-300 p-5 dark:border-red-800">
            <h2 className="text-lg font-semibold">El ingeniero pidió cambios</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{m.notasRevision}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link href={`${ESTUDIOS[m.estudio].ruta}?folio=${m.folio}`} className={botonSecundario}>
                Corregir datos
              </Link>
              <form action={accionReenviar}>
                <input type="hidden" name="folio" value={m.folio} />
                <Boton>Mandar otra vez a revisión</Boton>
              </form>
            </div>
            <p className="mt-2 text-sm text-zinc-500">La revisión ya está pagada; reenviarla no tiene costo.</p>
          </section>
        )}

        {m.estado === "aprobada" && m.firma && (
          <div className="flex flex-wrap items-center gap-3">
            <BotonImprimir />
            <span className="text-sm text-zinc-500">
              Aprobada por {m.firma.nombre}, cédula {m.firma.cedula}. La hoja final lleva{" "}
              {m.firma.firmaImagen ? "su firma, su sello" : "sus datos"} y la huella de aprobación.
            </span>
          </div>
        )}
      </div>

      <div className="mt-6">
        <MemoriaDeRegistro m={m} />
      </div>
    </main>
  );
}

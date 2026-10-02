import { graficasPluvial } from "@/lib/graficas/agua";
import { LLENADO_MAXIMO, MANNING_PVC, SUPERFICIES, type Superficie } from "@/calc/drenaje/tablas";
import { fmt } from "@/components/form";
import type { DatosPluvial, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";

export default function MemoriaPluvial({ m }: { m: RegistroMemoria }) {
  const { proyecto: project, entrada: e, resultado: r } = m.datos as DatosPluvial;
  const { firma, folio } = m;
  const superficies = (Object.keys(SUPERFICIES) as Superficie[]).filter((k) => e.areas[k] > 0);

  return (
    <article className="memoria rounded-2xl border border-zinc-200 bg-white p-6 text-black shadow-elevada sm:p-10">
      <header className="border-b-2 border-black pb-3">
        <p className="text-xs uppercase tracking-wide">Memoria de cálculo</p>
        <h2 className="text-2xl font-semibold">Drenaje pluvial</h2>
        <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          <p>
            <b>Obra:</b> {blank(project.obra)}
          </p>
          <p>
            <b>Folio:</b> {folio}
          </p>
          <p>
            <b>Ubicación:</b> {blank(project.ubicacion)}
          </p>
          <p>
            <b>Fecha:</b> {fechaLarga(firma?.aprobadaEn ?? m.actualizadaEn)}
          </p>
          <p>
            <b>Cliente:</b> {blank(project.cliente)}
          </p>
        </div>
      </header>

      <H>1. Alcance y método</H>
      <p className="mt-2 text-sm">
        Se calcula el gasto pluvial del predio con el método racional, Q = C i A, se elige el diámetro de la tubería de
        PVC con la fórmula de Manning (n = {MANNING_PVC}) trabajando a no más del {fmt(LLENADO_MAXIMO * 100, 0)} % de su
        capacidad a tubo lleno
        {r.pozos ? ", y se determina el número de pozos de absorción para el volumen de la tormenta de diseño" : ""}.
      </p>

      <H>2. Gasto de diseño</H>
      <Rows
        rows={[
          ...superficies.map(
            (k) =>
              [`${SUPERFICIES[k].nombre}, C = ${SUPERFICIES[k].c}`, `${fmt(e.areas[k], 1)} m² → ${fmt(SUPERFICIES[k].c * e.areas[k], 1)} m²`] as [
                string,
                string,
              ],
          ),
          ["Área efectiva, Σ C·A", `${fmt(r.areaEfectiva, 1)} m²`],
          ["Intensidad de lluvia de diseño", `${fmt(e.intensidad, 0)} mm/h`],
          ["Gasto, Q = Σ C·A · i / 3 600", `${fmt(r.gasto)} L/s`],
        ]}
      />

      <H>3. Tubería</H>
      <p className="mt-2 text-sm">
        Con pendiente de {fmt(e.pendiente, 1)} %, un tubo de <b>{r.tuberia.diametro} mm</b> lleva{" "}
        {fmt(r.tuberia.capacidad, 1)} L/s a tubo lleno con velocidad de {fmt(r.tuberia.velocidad)} m/s; al{" "}
        {fmt(LLENADO_MAXIMO * 100, 0)} % son {fmt(LLENADO_MAXIMO * r.tuberia.capacidad, 1)} L/s ≥ {fmt(r.gasto)} L/s.
        {r.advertencias.length > 0 && ` Ojo: ${r.advertencias.join("; ")}.`}
      </p>

      {r.pozos && (
        <>
          <H>4. Pozos de absorción</H>
          <p className="mt-2 text-sm">
            Tormenta de {fmt(e.duracion, 0)} min: volumen V = Q · t = {fmt(r.volumen, 1)} m³. Cada pozo de{" "}
            {fmt(e.diametroPozo)} m de diámetro y {fmt(e.profundidadPozo)} m de profundidad útil almacena{" "}
            {fmt(r.pozos.almacenamiento)} m³ e infiltra {fmt(r.pozos.infiltracion, 3)} m³/h por paredes y fondo con una
            tasa de {fmt(e.infiltracion!, 0)} mm/h; durante la tormenta recibe {fmt(r.pozos.capacidad)} m³. Se requieren{" "}
            <b>{r.pozos.cantidad} pozos</b>, que se vacían en {fmt(r.pozos.vaciado, 1)} h.
          </p>
        </>
      )}

      <H>{r.pozos ? "5" : "4"}. Conclusiones</H>
      <p className="mt-2 text-sm">
        El predio genera {fmt(r.gasto)} L/s con la lluvia de diseño. La tubería pluvial es de{" "}
        <b>{r.tuberia.diametro} mm</b> con pendiente de {fmt(e.pendiente, 1)} %
        {r.pozos ? (
          <>
            {" "}
            y descarga a <b>{r.pozos.cantidad} pozos de absorción</b> de {fmt(e.diametroPozo)} × {fmt(e.profundidadPozo)}{" "}
            m
          </>
        ) : null}
        .
      </p>

      <AnexoGraficas especs={graficasPluvial(e, r)} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

import { ANCHO_ZANJA, LARGO_MAXIMO_ZANJA, LODO_FRESCO } from "@/calc/drenaje/tablas";
import { fmt } from "@/components/form";
import type { DatosFosa, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows } from "../MemoriaComun";

export default function MemoriaFosa({ m }: { m: RegistroMemoria }) {
  const { proyecto: project, entrada: e, resultado: r } = m.datos as DatosFosa;
  const { firma, folio } = m;

  return (
    <article className="memoria rounded-lg border border-zinc-300 bg-white p-8 text-black shadow-sm">
      <header className="border-b-2 border-black pb-3">
        <p className="text-xs uppercase tracking-wide">Memoria de cálculo</p>
        <h2 className="text-2xl font-semibold">Fosa séptica</h2>
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
        Se dimensiona la fosa séptica de una vivienda sin drenaje municipal con el método de la norma NBR 7229, V = 1
        000 + N (C T + K Lf), y el campo de infiltración del efluente según la tasa de aplicación del terreno. La fosa
        debe ser hermética y, si es prefabricada, cumplir la NOM-006-CONAGUA.
      </p>

      <H>2. Volumen</H>
      <Rows
        rows={[
          ["Habitantes, N", fmt(e.habitantes, 0)],
          ["Aportación, C", `${fmt(e.aportacion, 0)} L/hab/día`],
          ["Contribución diaria, N·C", `${fmt(r.contribucion, 0)} L`],
          ["Tiempo de retención, T", `${fmt(r.retencion)} días`],
          [
            `Acumulación de lodo, K (limpieza ${e.limpieza === 1 ? "anual" : `cada ${e.limpieza} años`}, ${fmt(e.temperatura, 0)} °C)`,
            `${fmt(r.acumulacion, 0)} días`,
          ],
          ["Lodo fresco, Lf", `${LODO_FRESCO} L/hab/día`],
          ["Volumen útil, V", `${fmt(r.volumen, 0)} L`],
        ]}
      />

      <H>3. Medidas</H>
      <p className="mt-2 text-sm">
        Profundidad útil de {fmt(e.profundidad)} m, dentro del intervalo de {r.profundidades.minima} a{" "}
        {r.profundidades.maxima} m para este volumen. Planta rectangular con el largo del doble del ancho: interior de{" "}
        <b>
          {fmt(r.medidas.ancho)} × {fmt(r.medidas.largo)} m
        </b>{" "}
        ({fmt(r.medidas.volumenConstruido, 0)} L).{" "}
        {r.biodigestor
          ? `Equivale a un biodigestor prefabricado de ${fmt(r.biodigestor, 0)} L.`
          : "Si se usan biodigestores prefabricados se requiere más de uno."}
      </p>

      <H>4. Campo de infiltración</H>
      <p className="mt-2 text-sm">
        Con una tasa de aplicación de {fmt(e.tasaAplicacion, 0)} L/m²/día, el área de infiltración es{" "}
        {fmt(r.contribucion, 0)} / {fmt(e.tasaAplicacion, 0)} = {fmt(r.campo.area, 1)} m², es decir{" "}
        {fmt(r.campo.longitud, 1)} m de zanja de {fmt(ANCHO_ZANJA)} m de ancho en{" "}
        <b>
          {r.campo.zanjas} {r.campo.zanjas === 1 ? "zanja" : "zanjas"}
        </b>{" "}
        de no más de {LARGO_MAXIMO_ZANJA} m.
      </p>

      <H>5. Conclusiones</H>
      <p className="mt-2 text-sm">
        La vivienda requiere una <b>fosa séptica de {fmt(r.volumen, 0)} L</b> útiles, de{" "}
        {fmt(r.medidas.ancho)} × {fmt(r.medidas.largo)} × {fmt(e.profundidad)} m interiores
        {r.biodigestor ? ` o un biodigestor de ${fmt(r.biodigestor, 0)} L` : ""}, con un campo de infiltración de{" "}
        <b>{fmt(r.campo.longitud, 1)} m de zanja</b>. Los lodos se retiran{" "}
        {e.limpieza === 1 ? "cada año" : `cada ${e.limpieza} años`}.
      </p>

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

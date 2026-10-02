import { graficasPluvial } from "@/lib/graficas/agua";
import { graficasPluvialExtra } from "@/lib/graficas/pluvial";
import type { EntradaCaptacion, ResultadoCaptacion } from "@/calc/drenaje/pluvial";
import {
  AREA_MAXIMA_POR_BAJADA,
  CISTERNA_MINIMA,
  LLENADO_MAXIMO,
  MANNING_PVC,
  MESES_LARGOS,
  OCUPACION_BAJADA,
  PASO_CISTERNA,
  SUPERFICIES,
  type Superficie,
} from "@/calc/drenaje/tablas";
import { fmt } from "@/components/form";
import type { DatosPluvial, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";

export default function MemoriaPluvial({ m }: { m: RegistroMemoria }) {
  const { proyecto: project, entrada: e, resultado: r } = m.datos as DatosPluvial;
  const { firma, folio } = m;
  const superficies = (Object.keys(SUPERFICIES) as Superficie[]).filter((k) => e.areas[k] > 0);
  // Las secciones opcionales recorren la numeración; las memorias anteriores no traen bajadas ni captación.
  let n = 3;
  const nBajadas = r.bajadas ? ++n : 0;
  const nPozos = r.pozos ? ++n : 0;
  const nCaptacion = r.captacion && e.captacion ? ++n : 0;
  const nConclusiones = ++n;

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
        {r.bajadas ? ", se revisan las bajadas de azotea" : ""}
        {r.pozos ? ", se determina el número de pozos de absorción para el volumen de la tormenta de diseño" : ""}
        {r.captacion ? " y se evalúa la captación de agua de lluvia del techo con un balance mensual" : ""}. La
        intensidad de diseño la fija el responsable con las isoyetas de intensidad, duración y periodo de retorno de la
        SCT o las curvas de la CONAGUA para la localidad.
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

      {r.bajadas && (
        <>
          <H>{nBajadas}. Bajadas de azotea</H>
          <p className="mt-2 text-sm">
            La azotea de {fmt(r.bajadas.area, 1)} m² genera Q = {SUPERFICIES.azotea.c} × {fmt(r.bajadas.area, 1)} ×{" "}
            {fmt(e.intensidad, 0)} / 3 600 = {fmt(r.bajadas.gasto)} L/s. La capacidad de una bajada vertical de{" "}
            {r.bajadas.diametro} mm se calcula con la fórmula de Wyly-Eaton con el tubo ocupado a{" "}
            7/24 ({fmt(OCUPACION_BAJADA * 100, 0)} %) de su sección: {fmt(r.bajadas.capacidad, 1)} L/s. Por gasto se requieren{" "}
            {r.bajadas.porGasto} y, con una bajada por cada {AREA_MAXIMA_POR_BAJADA} m² de azotea para que el agua salga
            aunque se tape una coladera, {r.bajadas.porArea}. Se colocan{" "}
            <b>
              {r.bajadas.cantidad} {r.bajadas.cantidad === 1 ? "bajada" : "bajadas"} de {r.bajadas.diametro} mm
            </b>
            , repartidas para que cada una reciba un área parecida.
          </p>
        </>
      )}

      {r.pozos && (
        <>
          <H>{nPozos}. Pozos de absorción</H>
          <p className="mt-2 text-sm">
            Tormenta de {fmt(e.duracion, 0)} min: volumen V = Q · t = {fmt(r.volumen, 1)} m³. Cada pozo de{" "}
            {fmt(e.diametroPozo)} m de diámetro y {fmt(e.profundidadPozo)} m de profundidad útil almacena{" "}
            {fmt(r.pozos.almacenamiento)} m³ e infiltra {fmt(r.pozos.infiltracion, 3)} m³/h por paredes y fondo con una
            tasa de {fmt(e.infiltracion!, 0)} mm/h; durante la tormenta recibe {fmt(r.pozos.capacidad)} m³. Se requieren{" "}
            <b>{r.pozos.cantidad} pozos</b>, que se vacían en {fmt(r.pozos.vaciado, 1)} h.
          </p>
        </>
      )}

      {r.captacion && e.captacion && <SeccionCaptacion n={nCaptacion} c={e.captacion} r={r.captacion} />}

      <H>{nConclusiones}. Conclusiones</H>
      <p className="mt-2 text-sm">
        El predio genera {fmt(r.gasto)} L/s con la lluvia de diseño. La tubería pluvial es de{" "}
        <b>{r.tuberia.diametro} mm</b> con pendiente de {fmt(e.pendiente, 1)} %
        {r.bajadas ? (
          <>
            , la azotea baja por <b>{r.bajadas.cantidad} bajadas de {r.bajadas.diametro} mm</b>
          </>
        ) : null}
        {r.pozos ? (
          <>
            {" "}
            y descarga a <b>{r.pozos.cantidad} pozos de absorción</b> de {fmt(e.diametroPozo)} × {fmt(e.profundidadPozo)}{" "}
            m
          </>
        ) : null}
        .
        {r.captacion && (
          <>
            {" "}
            El techo capta {fmt(r.captacion.captacionAnual, 1)} m³ de lluvia al año
            {r.captacion.cisterna !== undefined ? (
              <>
                ; con una <b>cisterna de {fmt(r.captacion.cisterna, 1)} m³</b> se cubre el{" "}
                <b>{fmt(r.captacion.cobertura * 100, 0)} %</b> del agua de uso no potable
              </>
            ) : (
              <>, suficiente para el {fmt(r.captacion.cobertura * 100, 0)} % del agua de uso no potable</>
            )}
            .
          </>
        )}
      </p>

      <AnexoGraficas especs={[...graficasPluvial(e, r), ...graficasPluvialExtra(e, r)]} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

function SeccionCaptacion({ n, c, r }: { n: number; c: EntradaCaptacion; r: ResultadoCaptacion }) {
  const ahorroL = r.aprovechadoAnual * 1000;
  return (
    <>
      <H>{n}. Captación de agua de lluvia</H>
      <p className="mt-2 text-sm">
        El agua del techo se conduce a una cisterna para usos que no requieren agua potable (excusados, lavadora,
        limpieza y riego). El volumen captable de cada mes es V = P · A · Ce, con la lluvia media P, el área de techo A y
        el coeficiente de escurrimiento Ce, que ya descuenta las pérdidas y las primeras lluvias que se desvían.
      </p>
      <Rows
        rows={[
          ["Área de captación, A", `${fmt(c.area, 1)} m²`],
          ["Coeficiente de escurrimiento del techo, Ce", fmt(c.coeficiente)],
          [
            r.modo === "mensual" ? "Lluvia media anual (suma de los 12 meses)" : "Lluvia media anual",
            `${fmt(c.lluviaMensual ? c.lluviaMensual.reduce((a, b) => a + b, 0) : c.lluviaAnual!, 0)} mm`,
          ],
          [
            "Demanda de uso no potable",
            c.personas !== undefined && c.dotacion !== undefined
              ? `${fmt(c.personas, 0)} personas × ${fmt(c.dotacion, 0)} L/hab/día = ${fmt(c.demandaDiaria, 0)} L/día`
              : `${fmt(c.demandaDiaria, 0)} L/día`,
          ],
          ["Agua de lluvia captable al año", `${fmt(r.captacionAnual, 1)} m³`],
          ["Demanda al año", `${fmt(r.demandaAnual, 1)} m³`],
          ["Captación entre demanda", `${fmt(r.potencial * 100, 0)} %`],
        ]}
      />
      {r.meses ? (
        <>
          <p className="mt-3 text-sm">
            Balance mes a mes, suponiendo que cada año llueve igual: la cisterna recibe la captación del mes, entrega la
            demanda y, si se llena, tira el excedente; si se vacía, lo que falta se toma de la red. Volúmenes en m³.
          </p>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[560px] text-right text-sm tabular-nums">
              <thead>
                <tr className="border-b border-zinc-400 text-xs">
                  <th className="py-1 text-left font-semibold">Mes</th>
                  <th className="font-semibold">Lluvia (mm)</th>
                  <th className="font-semibold">Captación</th>
                  <th className="font-semibold">Demanda</th>
                  <th className="font-semibold">En cisterna</th>
                  <th className="font-semibold">De la red</th>
                  <th className="font-semibold">Se tira</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {r.meses.map((m, i) => (
                  <tr key={MESES_LARGOS[i]} className="border-b border-zinc-200">
                    <td className="py-0.5 text-left font-sans capitalize">{MESES_LARGOS[i]}</td>
                    <td>{fmt(c.lluviaMensual![i], 0)}</td>
                    <td>{fmt(m.captacion, 2)}</td>
                    <td>{fmt(m.demanda, 2)}</td>
                    <td>{fmt(m.almacenamiento, 2)}</td>
                    <td>{fmt(m.deficit, 2)}</td>
                    <td>{fmt(m.derrame, 2)}</td>
                  </tr>
                ))}
                <tr className="border-b border-zinc-400 font-semibold">
                  <td className="py-0.5 text-left font-sans">Año</td>
                  <td>{fmt(c.lluviaMensual!.reduce((a, b) => a + b, 0), 0)}</td>
                  <td>{fmt(r.captacionAnual, 2)}</td>
                  <td>{fmt(r.demandaAnual, 2)}</td>
                  <td></td>
                  <td>{fmt(r.meses.reduce((a, m) => a + m.deficit, 0), 2)}</td>
                  <td>{fmt(r.meses.reduce((a, m) => a + m.derrame, 0), 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm">
            Cisterna recomendada: la más chica con la que se aprovecha todo lo posible.{" "}
            {r.potencial >= 1
              ? "Como la lluvia del año alcanza para la demanda, es el mayor déficit acumulado de los meses secos (método del pico secuente)"
              : "Como la lluvia del año no alcanza para la demanda, es el mayor volumen que llega a guardarse sin tirar agua"}
            , redondeado a {fmt(PASO_CISTERNA, 1)} m³ y no menor de {fmt(CISTERNA_MINIMA, 0)} m³:{" "}
            <b>{fmt(r.cisternaRecomendada!, 1)} m³</b>.
            {r.cisterna !== r.cisternaRecomendada && <> El balance se hizo con la cisterna propuesta de {fmt(r.cisterna!, 1)} m³.</>}
          </p>
          {r.comparacion && r.comparacion.length > 1 && (
            <>
              <p className="mt-3 text-sm">Parte de la demanda que se cubre según el tamaño de la cisterna:</p>
              <Rows
                rows={r.comparacion.map(
                  (x) =>
                    [
                      `Cisterna de ${fmt(x.cisterna, 1)} m³${x.cisterna === r.cisternaRecomendada ? " (recomendada)" : ""}`,
                      `${fmt(x.cobertura * 100, 0)} %`,
                    ] as [string, string],
                )}
              />
            </>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm">
          Solo se tiene la lluvia anual, así que no se hace el balance mensual ni se dimensiona la cisterna; para eso se
          requiere la lluvia media de cada mes (normales climatológicas del Servicio Meteorológico Nacional).
        </p>
      )}
      <Rows
        rows={[
          ["Agua de lluvia que se usa al año", `${fmt(r.aprovechadoAnual, 1)} m³ (${fmt(ahorroL, 0)} L)`],
          [
            r.modo === "mensual" ? "Demanda de uso no potable cubierta" : "Demanda que podría cubrirse con cisterna suficiente",
            `${fmt(r.cobertura * 100, 0)} %`,
          ],
        ]}
      />
      <p className="mt-3 text-sm">
        Recomendaciones: desviar las primeras lluvias de cada temporada antes de la cisterna, filtrar hojas y
        sedimentos en las bajadas, mantener la cisterna cerrada y sin luz, y conectar la red de agua de lluvia solo a
        los muebles de uso no potable, con un respaldo de la red municipal. El agua de lluvia no se usa para beber sin
        un tratamiento que cumpla la NOM-127-SSA1-2021.
      </p>
    </>
  );
}

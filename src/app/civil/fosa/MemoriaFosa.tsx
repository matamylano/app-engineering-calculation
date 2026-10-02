import { graficasFosa } from "@/lib/graficas/agua";
import {
  ANCHO_ZANJA,
  LADO_MINIMO_TRAMPA,
  LARGO_MAXIMO_ZANJA,
  LODO_FRESCO,
  MESES_LARGOS,
  SEPARACION_POZOS,
  TRAMPA_BASE,
  TRAMPA_POR_PERSONA,
} from "@/calc/drenaje/tablas";
import { fmt } from "@/components/form";
import type { DatosFosa, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";

export default function MemoriaFosa({ m }: { m: RegistroMemoria }) {
  const { proyecto: project, entrada: e, resultado: r } = m.datos as DatosFosa;
  const { firma, folio } = m;
  // Las memorias anteriores no traen trampa, pozo ni mantenimiento: las secciones se recorren.
  let n = 4;
  const nTrampa = r.trampa ? ++n : 0;
  const nMantenimiento = r.mantenimiento ? ++n : 0;
  const nConclusiones = ++n;
  const cada = (anios: number) => (anios === 1 ? "cada año" : `cada ${anios} años`);

  return (
    <article className="memoria rounded-2xl border border-zinc-200 bg-white p-6 text-black shadow-elevada sm:p-10">
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
        000 + N (C T + K Lf), y {r.pozo ? "los pozos de absorción" : "el campo de infiltración"} del efluente según la
        tasa de aplicación del terreno
        {r.trampa ? ", la trampa de grasas de la cocina" : ""}
        {r.mantenimiento ? " y el programa de desazolve" : ""}. La fosa debe ser hermética y, si es prefabricada,
        cumplir la NOM-006-CONAGUA.
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

      {r.pozo ? (
        <>
          <H>4. Pozos de absorción</H>
          <p className="mt-2 text-sm">
            Con una tasa de aplicación de {fmt(e.tasaAplicacion, 0)} L/m²/día, el área de infiltración es{" "}
            {fmt(r.contribucion, 0)} / {fmt(e.tasaAplicacion, 0)} = {fmt(r.campo.area, 1)} m². En el pozo solo se cuenta
            el área de las paredes, π D h, porque el fondo se tapa pronto con los sólidos finos. Con D ={" "}
            {fmt(r.pozo.diametro)} m se requieren h = {fmt(r.campo.area, 1)} / (π × {fmt(r.pozo.diametro)}) ={" "}
            {fmt(r.pozo.profundidadTotal)} m de pared útil; con no más de {fmt(e.pozo!.profundidadMaxima, 1)} m por pozo
            se construyen{" "}
            <b>
              {r.pozo.cantidad} {r.pozo.cantidad === 1 ? "pozo" : "pozos"} de {fmt(r.pozo.diametro)} m de diámetro y{" "}
              {fmt(r.pozo.profundidad, 1)} m de profundidad útil
            </b>{" "}
            ({fmt(r.pozo.areaConstruida, 1)} m² de pared), medidos bajo el tubo de llegada.
            {r.pozo.cantidad > 1 &&
              ` Entre pozos se deja una distancia libre de al menos ${fmt(SEPARACION_POZOS * r.pozo.diametro, 1)} m (${SEPARACION_POZOS} diámetros) y el efluente se reparte por igual con una caja distribuidora.`}{" "}
            El pozo se reviste con tabique o piedra junteada solo en los costados, con relleno de grava entre el muro y
            el terreno, y su fondo debe quedar lejos del nivel freático máximo; el responsable confirma las distancias
            a pozos de agua y colindancias que pida la autoridad local.
          </p>
        </>
      ) : (
        <>
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
        </>
      )}

      {r.trampa && (
        <>
          <H>{nTrampa}. Trampa de grasas</H>
          <p className="mt-2 text-sm">
            El agua del fregadero pasa por una trampa de grasas antes de llegar a la fosa, para que la grasa no tape
            {r.pozo ? " los pozos" : " las zanjas"}.{" "}
            {r.trampa.metodo === "personas" ? (
              <>
                Por personas (NBR 8160): V = {TRAMPA_POR_PERSONA} N + {TRAMPA_BASE} = {TRAMPA_POR_PERSONA} ×{" "}
                {fmt(e.habitantes, 0)} + {TRAMPA_BASE} = {fmt(r.trampa.volumen, 0)} L.
              </>
            ) : (
              <>
                Por gasto: V = Q · t = {fmt(e.trampa?.metodo === "gasto" ? e.trampa.gasto : 0)} L/s × 60 ×{" "}
                {fmt(e.trampa?.metodo === "gasto" ? e.trampa.retencion : 0, 1)} min = {fmt(r.trampa.volumen, 0)} L.
              </>
            )}{" "}
            Con un tirante útil de {fmt(r.trampa.tirante)} m, el largo del doble del ancho y un lado mínimo de{" "}
            {fmt(LADO_MINIMO_TRAMPA)} m, el interior es de{" "}
            <b>
              {fmt(r.trampa.ancho)} × {fmt(r.trampa.largo)} m
            </b>{" "}
            ({fmt(r.trampa.volumenConstruido, 0)} L útiles), con tapa registrable, la entrada arriba del nivel del agua y
            la salida por un codo o mampara que tome el agua del fondo. La grasa acumulada se retira cada mes o antes
            si la capa llega a la salida.
          </p>
        </>
      )}

      {r.mantenimiento && (
        <>
          <H>{nMantenimiento}. Mantenimiento y desazolve</H>
          <Rows
            rows={[
              [
                `Lodo al momento del desazolve, N K Lf = ${fmt(e.habitantes, 0)} × ${fmt(r.acumulacion, 0)} × ${LODO_FRESCO}`,
                `${fmt(r.mantenimiento.lodos, 0)} L`,
              ],
              ["Parte del volumen útil que ocupa", `${fmt(r.mantenimiento.fraccion * 100, 0)} %`],
              ["Periodo de desazolve", cada(r.mantenimiento.periodo)],
              ...r.mantenimiento.fechas.map(
                (f, i) =>
                  [`Desazolve ${i + 1}`, `${MESES_LARGOS[Number(f.slice(5)) - 1]} de ${f.slice(0, 4)}`] as [string, string],
              ),
              ...(r.mantenimiento.costoAnual !== undefined && e.costoDesazolve !== undefined
                ? ([
                    ["Precio de un desazolve", `$${fmt(e.costoDesazolve, 2)}`],
                    ["Costo anual equivalente", `$${fmt(r.mantenimiento.costoAnual, 2)}`],
                  ] as [string, string][])
                : []),
            ]}
          />
          <p className="mt-2 text-sm">
            La fosa se diseñó para guardar este lodo; si no se desazolva a tiempo, los sólidos salen con el efluente y
            tapan {r.pozo ? "los pozos" : "las zanjas"}. Se recomienda revisar el nivel de lodos y natas cada año y
            desazolvar antes de la fecha si ocupan cerca de un tercio de la profundidad útil. El desazolve lo hace una
            empresa autorizada que lleve los lodos a un sitio de disposición permitido; se deja en la fosa una capa
            delgada de lodo para que arranque de nuevo la digestión.
          </p>
        </>
      )}

      <H>{nConclusiones}. Conclusiones</H>
      <p className="mt-2 text-sm">
        La vivienda requiere una <b>fosa séptica de {fmt(r.volumen, 0)} L</b> útiles, de{" "}
        {fmt(r.medidas.ancho)} × {fmt(r.medidas.largo)} × {fmt(e.profundidad)} m interiores
        {r.biodigestor ? ` o un biodigestor de ${fmt(r.biodigestor, 0)} L` : ""}, con{" "}
        {r.pozo ? (
          <b>
            {r.pozo.cantidad} {r.pozo.cantidad === 1 ? "pozo" : "pozos"} de absorción de {fmt(r.pozo.diametro)} ×{" "}
            {fmt(r.pozo.profundidad, 1)} m
          </b>
        ) : (
          <>
            un campo de infiltración de <b>{fmt(r.campo.longitud, 1)} m de zanja</b>
          </>
        )}
        {r.trampa ? (
          <>
            {" "}
            y una trampa de grasas de {fmt(r.trampa.ancho)} × {fmt(r.trampa.largo)} m
          </>
        ) : null}
        . Los lodos se retiran {cada(e.limpieza)}
        {r.mantenimiento?.fechas.length ? `, el primer desazolve en ${MESES_LARGOS[Number(r.mantenimiento.fechas[0].slice(5)) - 1]} de ${r.mantenimiento.fechas[0].slice(0, 4)}` : ""}
        {r.mantenimiento?.costoAnual !== undefined ? `, con un costo de $${fmt(r.mantenimiento.costoAnual, 0)} al año` : ""}.
      </p>

      <AnexoGraficas especs={graficasFosa(e, r)} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

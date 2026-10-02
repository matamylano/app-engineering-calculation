import { graficasHidrosanitaria } from "@/lib/graficas/agua";
import {
  CALENTADORES,
  C_HAZEN,
  DELTA_T_PASO,
  DURACION_BANO,
  EFICIENCIA_BOMBA,
  FRACCION_HORA_PICO,
  FRACCION_UTIL_DEPOSITO,
  GASTO_REGADERA,
  LITROS_POR_M2_PLANO,
  LITROS_POR_TUBO,
  TEMPERATURA_DEPOSITO,
  TEMPERATURA_USO,
  FACTOR_ACCESORIOS,
  MUEBLES,
  PRESION_MINIMA,
  VELOCIDAD_MAXIMA,
} from "@/calc/hidrosanitaria/tablas";
import { fmt } from "@/components/form";
import type { DatosHidrosanitaria, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";
import TablaMaterialesHidrosanitaria, { textoCalentador } from "./TablaMaterialesHidrosanitaria";

const litros = (x: number) => `${fmt(x, 0)} L`;
const pieza = (x: { comercial: number; piezas: number }) =>
  x.piezas > 1 ? `${x.piezas} de ${litros(x.comercial)}` : litros(x.comercial);

export default function MemoriaHidrosanitaria({ m }: { m: RegistroMemoria }) {
  const { proyecto: project, entrada: e, resultado: r } = m.datos as DatosHidrosanitaria;
  const { firma, folio } = m;
  // Las memorias anteriores no traen calentador ni lista de piezas.
  const c = r.calentador ?? null;
  const materiales = r.materiales ?? [];
  const desagues = r.drenaje.ramales.filter((x) => x.diametro > 0);
  const sinDesague = r.drenaje.ramales.filter((x) => x.diametro === 0);
  let seccion = 6;
  const siguiente = () => ++seccion;

  return (
    <article className="memoria rounded-2xl border border-zinc-200 bg-white p-6 text-black shadow-elevada sm:p-10">
      <header className="border-b-2 border-black pb-3">
        <p className="text-xs uppercase tracking-wide">Memoria de cálculo</p>
        <h2 className="text-2xl font-semibold">Instalación hidráulica y sanitaria</h2>
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

      <H>1. Alcance y criterios</H>
      <p className="mt-2 text-sm">
        Se dimensionan el almacenamiento, la alimentación de agua fría por gravedad desde el tinaco, la bomba de la
        cisterna al tinaco, los desagües y, en su caso, el calentador de agua de una casa habitación. El gasto
        probable se obtiene con el método de Hunter para muebles con tanque; las pérdidas por fricción, con Hazen-Williams (C = {C_HAZEN}, tubería de cobre tipo
        M) más {fmt(FACTOR_ACCESORIOS * 100, 0)} % por accesorios. Se limita la velocidad a {VELOCIDAD_MAXIMA} m/s y
        se pide una presión mínima de {PRESION_MINIMA} m de columna de agua en la salida más desfavorable.
      </p>

      <H>2. Demanda y almacenamiento</H>
      <Rows
        rows={[
          ["Habitantes; dotación", `${fmt(e.habitantes, 0)}; ${fmt(e.dotacion, 0)} L/hab/día`],
          ["Demanda diaria", litros(r.demandaDiaria)],
          [`Cisterna, ${fmt(e.diasCisterna, 1)} días de reserva`, `${litros(r.cisterna.requerido)}; se usa ${pieza(r.cisterna)}`],
          [`Tinaco, ${fmt(e.diasTinaco, 1)} días de reserva`, `${litros(r.tinaco.requerido)}; se usa ${pieza(r.tinaco)}`],
        ]}
      />

      <H>3. Gasto probable</H>
      <Rows
        rows={[
          ...r.drenaje.ramales.map(
            (x) =>
              [`${MUEBLES[x.mueble].nombre} (${fmt(MUEBLES[x.mueble].um, 1)} UM)`, `${x.cantidad} · ${fmt(MUEBLES[x.mueble].um, 1)} = ${fmt(x.cantidad * MUEBLES[x.mueble].um, 1)} UM`] as [
                string,
                string,
              ],
          ),
          ["Total; gasto probable de Hunter", `${fmt(r.unidadesMueble, 1)} UM; ${fmt(r.gastoProbable, 3)} L/s`],
        ]}
      />

      <H>4. Alimentación desde el tinaco</H>
      <p className="mt-2 text-sm">
        Con {fmt(r.gastoProbable, 3)} L/s en {fmt(e.longitudTinaco)} m de tubo hasta la salida más lejana, el menor
        diámetro que cumple la velocidad y la presión es <b>{r.alimentacion.nominal}</b>: velocidad{" "}
        {fmt(r.alimentacion.velocidad)} m/s, pérdida {fmt(r.alimentacion.perdida)} m. Con el tinaco{" "}
        {fmt(e.alturaTinaco)} m arriba de la salida más alta quedan {fmt(r.alimentacion.presionDisponible)} m ≥{" "}
        {PRESION_MINIMA} m.
      </p>

      <H>5. Bomba de la cisterna al tinaco</H>
      <p className="mt-2 text-sm">
        Para llenar {pieza(r.tinaco)} en {fmt(e.tiempoLlenado, 0)} min: Q = {fmt(r.bomba.gasto, 3)} L/s, en tubo de{" "}
        {r.bomba.nominal} ({fmt(r.bomba.velocidad)} m/s). Carga H = desnivel {fmt(e.alturaBombeo)} m + pérdidas{" "}
        {fmt(r.bomba.perdida)} m + llegada {PRESION_MINIMA} m = {fmt(r.bomba.carga)} m. Potencia P = γ Q H / (76 η) con
        η = {EFICIENCIA_BOMBA}: {fmt(r.bomba.potencia, 3)} HP; se usa una bomba de{" "}
        <b>{fmt(r.bomba.potenciaComercial)} HP</b>.
      </p>

      <H>6. Drenaje sanitario</H>
      <Rows
        rows={[
          ...desagues.map(
            (x) => [`Desagüe de ${MUEBLES[x.mueble].nombre.toLowerCase()}`, `${x.diametro} mm`] as [string, string],
          ),
          ...sinDesague.map(
            (x) => [MUEBLES[x.mueble].nombre, "sin descarga al drenaje sanitario"] as [string, string],
          ),
          ["Unidades de descarga", fmt(r.drenaje.unidadesDescarga, 0)],
          ["Colector interior", `${r.drenaje.colector} mm`],
          ["Albañal a la red municipal", `${r.drenaje.albanal} mm, pendiente mínima ${r.drenaje.pendiente} %`],
          ["Registros", `a no más de ${r.drenaje.distanciaRegistros} m y en cada cambio de dirección`],
        ]}
      />

      {c && (
        <>
          <H>{siguiente()}. Calentador de agua</H>
          <p className="mt-2 text-sm">
            Calentador {CALENTADORES[c.tipo].toLowerCase()}. Agua fría a {fmt(c.temperaturaFria, 0)} °C y uso a{" "}
            {TEMPERATURA_USO} °C; consumo de agua caliente de {fmt(c.consumoPersona, 0)} L/persona/día (criterio de la
            CONUEE para vivienda), {fmt(c.demandaDiaria, 0)} L/día para {fmt(e.habitantes, 0)} personas; {c.regaderas}{" "}
            {c.regaderas === 1 ? "regadera" : "regaderas"} a la vez de {GASTO_REGADERA} L/min (máximo de la
            NOM-008-CONAGUA).
          </p>
          <p className="mt-2 text-sm">
            {c.tipo === "paso" && (
              <>
                La capacidad comercial se da en L/min con {DELTA_T_PASO} °C de aumento: Q = {c.regaderas} ·{" "}
                {GASTO_REGADERA} · ({TEMPERATURA_USO} − {fmt(c.temperaturaFria, 0)}) / {DELTA_T_PASO} ={" "}
                {fmt(c.requerido, 1)} L/min.
              </>
            )}
            {c.tipo === "deposito" && (
              <>
                Agua caliente en la hora pico: el mayor de {c.regaderas} · {GASTO_REGADERA} L/min · {DURACION_BANO} min
                y {fmt(FRACCION_HORA_PICO * 100, 0)} % del consumo diario. Se convierte a agua almacenada a{" "}
                {TEMPERATURA_DEPOSITO} °C con ({TEMPERATURA_USO} − {fmt(c.temperaturaFria, 0)}) / ({TEMPERATURA_DEPOSITO}{" "}
                − {fmt(c.temperaturaFria, 0)}) y se divide entre {FRACCION_UTIL_DEPOSITO}, la fracción útil del
                depósito: {fmt(c.requerido, 0)} L.
              </>
            )}
            {c.tipo === "solar" && (
              <>
                El termotanque guarda el agua caliente de todo el día ({fmt(c.requerido, 0)} L). Se consideran{" "}
                {LITROS_POR_TUBO} L/día por tubo al vacío de 58 mm × 1.8 m o {LITROS_POR_M2_PLANO} L/día por m² de
                colector plano. Se recomienda un calentador de paso de respaldo para días nublados.
              </>
            )}{" "}
            Se usa: <b>{textoCalentador(c)}</b>.
          </p>
        </>
      )}

      {materiales.length > 0 && (
        <>
          <H>{siguiente()}. Equipos y piezas principales</H>
          <p className="mt-2 text-sm">
            Lista para cotizar. Los metros de tubería se cuantifican con los planos de la obra.
          </p>
          <TablaMaterialesHidrosanitaria partidas={materiales} papel />
        </>
      )}

      <H>{siguiente()}. Conclusiones</H>
      <p className="mt-2 text-sm">
        La casa requiere una <b>cisterna de {pieza(r.cisterna)}</b>, un <b>tinaco de {pieza(r.tinaco)}</b> y una{" "}
        <b>bomba de {fmt(r.bomba.potenciaComercial)} HP</b> con tubo de {r.bomba.nominal}. La alimentación general
        desde el tinaco es de <b>{r.alimentacion.nominal}</b>. El drenaje sale en <b>{r.drenaje.albanal} mm</b> al{" "}
        {r.drenaje.pendiente} % con registros a cada {r.drenaje.distanciaRegistros} m como máximo.
        {c && (
          <>
            {" "}
            El agua caliente se da con un <b>calentador {CALENTADORES[c.tipo].toLowerCase()} de {textoCalentador(c)}</b>.
          </>
        )}
      </p>

      <AnexoGraficas especs={graficasHidrosanitaria(e, r)} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

import {
  C_HAZEN,
  EFICIENCIA_BOMBA,
  FACTOR_ACCESORIOS,
  MUEBLES,
  PRESION_MINIMA,
  VELOCIDAD_MAXIMA,
} from "@/calc/hidrosanitaria/tablas";
import { fmt } from "@/components/form";
import type { DatosHidrosanitaria, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows } from "../MemoriaComun";

const litros = (x: number) => `${fmt(x, 0)} L`;
const pieza = (x: { comercial: number; piezas: number }) =>
  x.piezas > 1 ? `${x.piezas} de ${litros(x.comercial)}` : litros(x.comercial);

export default function MemoriaHidrosanitaria({ m }: { m: RegistroMemoria }) {
  const { proyecto: project, entrada: e, resultado: r } = m.datos as DatosHidrosanitaria;
  const { firma, folio } = m;

  return (
    <article className="memoria rounded-lg border border-zinc-300 bg-white p-8 text-black shadow-sm">
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
        cisterna al tinaco y los desagües de una casa habitación. El gasto probable se obtiene con el método de Hunter
        para muebles con tanque; las pérdidas por fricción, con Hazen-Williams (C = {C_HAZEN}, tubería de cobre tipo
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
          ...r.drenaje.ramales.map(
            (x) => [`Desagüe de ${MUEBLES[x.mueble].nombre.toLowerCase()}`, `${x.diametro} mm`] as [string, string],
          ),
          ["Unidades de descarga", fmt(r.drenaje.unidadesDescarga, 0)],
          ["Colector interior", `${r.drenaje.colector} mm`],
          ["Albañal a la red municipal", `${r.drenaje.albanal} mm, pendiente mínima ${r.drenaje.pendiente} %`],
          ["Registros", `a no más de ${r.drenaje.distanciaRegistros} m y en cada cambio de dirección`],
        ]}
      />

      <H>7. Conclusiones</H>
      <p className="mt-2 text-sm">
        La casa requiere una <b>cisterna de {pieza(r.cisterna)}</b>, un <b>tinaco de {pieza(r.tinaco)}</b> y una{" "}
        <b>bomba de {fmt(r.bomba.potenciaComercial)} HP</b> con tubo de {r.bomba.nominal}. La alimentación general
        desde el tinaco es de <b>{r.alimentacion.nominal}</b>. El drenaje sale en <b>{r.drenaje.albanal} mm</b> al{" "}
        {r.drenaje.pendiente} % con registros a cada {r.drenaje.distanciaRegistros} m como máximo.
      </p>

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

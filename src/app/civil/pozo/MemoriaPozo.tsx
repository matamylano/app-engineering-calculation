import { EFICIENCIA_BOMBA, FACTOR_ACCESORIOS, C_COLUMNA, VELOCIDAD_ENTRADA } from "@/calc/pozos/tablas";
import { fmt } from "@/components/form";
import type { DatosPozo, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows } from "../MemoriaComun";

export default function MemoriaPozo({ m }: { m: RegistroMemoria }) {
  const { proyecto: project, entrada: e, resultado: r } = m.datos as DatosPozo;
  const { firma, folio } = m;
  const observacion = e.radioObservacion !== undefined;

  return (
    <article className="memoria rounded-lg border border-zinc-300 bg-white p-8 text-black shadow-sm">
      <header className="border-b-2 border-black pb-3">
        <p className="text-xs uppercase tracking-wide">Memoria de cálculo</p>
        <h2 className="text-2xl font-semibold">Pozo de agua</h2>
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

      <H>1. Alcance</H>
      <p className="mt-2 text-sm">
        Se interpreta la prueba de bombeo a gasto constante con el método de Cooper-Jacob y, con el gasto de diseño,
        se determinan el abatimiento, el diámetro del ademe, la longitud mínima de rejilla, la profundidad de la bomba,
        la columna y la potencia del equipo. La construcción del pozo y su protección sanitaria deben cumplir la
        NOM-003-CONAGUA.
      </p>

      <H>2. Prueba de bombeo</H>
      <p className="mt-2 text-sm">
        Gasto de prueba {fmt(e.gastoPrueba)} L/s; lecturas {observacion ? `en un pozo de observación a ${fmt(e.radioObservacion!)} m` : "en el pozo bombeado"}.
      </p>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-400 text-left">
            <th className="py-1 pr-2 font-semibold">Tiempo (min)</th>
            <th className="py-1 pr-2 text-right font-semibold">Abatimiento (m)</th>
            <th className="py-1 text-right font-semibold">En la recta</th>
          </tr>
        </thead>
        <tbody>
          {e.lecturas.map((l, i) => (
            <tr key={i} className="border-b border-zinc-200">
              <td className="py-1 pr-2 font-mono">{fmt(l.t, l.t % 1 ? 1 : 0)}</td>
              <td className="py-1 pr-2 text-right font-mono">{fmt(l.s)}</td>
              <td className="py-1 text-right">{l.t >= e.desde ? "sí" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-sm">
        Recta ajustada por mínimos cuadrados con {r.recta.puntos} lecturas: s = {fmt(r.recta.ordenada, 3)} +{" "}
        {fmt(r.recta.pendiente, 3)} log t. Transmisividad T = 2.3 Q / (4 π Δs) ={" "}
        <b>{fmt(r.transmisividad, 1)} m²/día</b>
        {r.almacenamiento !== undefined && (
          <>
            ; coeficiente de almacenamiento S = 2.25 T t₀ / r² = <b>{r.almacenamiento.toExponential(2)}</b>
          </>
        )}
        . Capacidad específica al final de la prueba: {fmt(r.capacidadEspecifica)} L/s/m.
      </p>

      <H>3. Abatimiento de diseño</H>
      <p className="mt-2 text-sm">
        Se prolonga la recta a {fmt(e.horasBombeo, 0)} horas de bombeo continuo y se escala con el gasto de diseño de{" "}
        {fmt(e.gastoDiseno)} L/s: abatimiento {fmt(r.abatimientoDiseno)} m. Con nivel estático de{" "}
        {fmt(e.nivelEstatico)} m, el nivel dinámico queda a <b>{fmt(r.nivelDinamico)} m</b>.
        {r.advertencias.length > 0 && ` Ojo: ${r.advertencias.join("; ")}.`}
      </p>

      <H>4. Ademe y rejilla</H>
      <p className="mt-2 text-sm">
        Para {fmt(e.gastoDiseno)} L/s se recomienda ademe de <b>{r.ademe}&quot;</b>. Con área abierta de{" "}
        {fmt(e.aberturaRejilla * 100, 0)} % y velocidad de entrada máxima de {VELOCIDAD_ENTRADA} m/s, la rejilla debe
        medir al menos L = Q / (π D p v) = <b>{fmt(r.rejilla.longitudMinima)} m</b>, frente a los estratos
        permeables.
      </p>

      <H>5. Bomba</H>
      <Rows
        rows={[
          ["Profundidad de la bomba (nivel dinámico + sumergencia)", `${fmt(r.colocacion, 0)} m`],
          ["Columna", `${r.columna.nominal}, ${fmt(r.columna.velocidad)} m/s`],
          [
            `Pérdidas en columna y descarga (Hazen-Williams, C = ${C_COLUMNA}, +${fmt(FACTOR_ACCESORIOS * 100, 0)} % accesorios)`,
            `${fmt(r.columna.perdida)} m`,
          ],
          ["Carga en la descarga", `${fmt(e.cargaDescarga)} m`],
          ["Carga dinámica total", `${fmt(r.carga)} m`],
          [`Potencia, Q H / (76 η) con η = ${EFICIENCIA_BOMBA}`, `${fmt(r.potencia)} HP`],
        ]}
      />

      <H>6. Conclusiones</H>
      <p className="mt-2 text-sm">
        El acuífero tiene una transmisividad de {fmt(r.transmisividad, 0)} m²/día. Para extraer{" "}
        <b>{fmt(e.gastoDiseno)} L/s</b> se requiere ademe de <b>{r.ademe}&quot;</b>, al menos{" "}
        <b>{fmt(r.rejilla.longitudMinima, 1)} m de rejilla</b> y una <b>bomba sumergible de {fmt(r.potenciaComercial, 1)} HP</b>{" "}
        colocada a {fmt(r.colocacion, 0)} m con columna de {r.columna.nominal}.
      </p>

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

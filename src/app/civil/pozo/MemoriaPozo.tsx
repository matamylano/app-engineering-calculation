import { graficasPozo } from "@/lib/graficas/agua";
import { graficasPozoExtra } from "@/lib/graficas/pozo";
import { EFICIENCIA_BOMBA, FACTOR_ACCESORIOS, C_COLUMNA, KW_POR_HP, VELOCIDAD_ENTRADA } from "@/calc/pozos/tablas";
import { fmt } from "@/components/form";
import type { DatosPozo, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";

export default function MemoriaPozo({ m }: { m: RegistroMemoria }) {
  const { proyecto: project, entrada: e, resultado: r } = m.datos as DatosPozo;
  const { firma, folio } = m;
  const observacion = e.radioObservacion !== undefined;
  // Las memorias anteriores no traen energía ni extracción.
  const en = r.energia;
  const x = r.extraccion;
  const pesos = (v: number, d = 0) => `$${fmt(v, d)}`;

  return (
    <article className="memoria rounded-2xl border border-zinc-200 bg-white p-6 text-black shadow-elevada sm:p-10">
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

      {en && x && (
        <>
          <H>6. Energía y costo de bombeo</H>
          <Rows
            rows={[
              [
                `Potencia eléctrica, ${fmt(r.potenciaComercial, 1)} HP · ${KW_POR_HP} / ${fmt(en.eficienciaMotor * 100, 0)} % del motor`,
                `${fmt(en.kw)} kW`,
              ],
              ["Operación", `${fmt(en.horasDia, 1)} h/día, ${fmt(en.diasAno, 0)} días/año`],
              ["Energía al día; al mes", `${fmt(en.kwhDia, 0)} kWh; ${fmt(en.kwhMes, 0)} kWh`],
              ["Energía por m³ bombeado", `${fmt(en.kwhM3, 3)} kWh/m³`],
              ...(en.costoMes !== undefined
                ? ([
                    ["Tarifa eléctrica", `${pesos(en.tarifa ?? 0, 2)}/kWh`],
                    ["Costo de energía al mes; al año", `${pesos(en.costoMes)}; ${pesos(en.costoAno ?? 0)}`],
                    ["Costo de energía por m³", pesos(en.costoM3 ?? 0, 2)],
                  ] as [string, string][])
                : []),
            ]}
          />
          <p className="mt-2 text-sm">
            Se toma la bomba a su potencia de placa, lo que da un consumo conservador. El costo es solo de energía, con
            la tarifa que indicó el usuario; no incluye cargos fijos, demanda ni IVA.
          </p>

          <H>7. Volumen de extracción</H>
          <Rows
            rows={[
              ["Volumen diario", `${fmt(x.diario, 0)} m³`],
              ["Volumen mensual", `${fmt(x.mensual, 0)} m³`],
              ["Volumen anual", `${fmt(x.anual, 0)} m³`],
              ...(x.concesionado !== undefined
                ? ([
                    ["Volumen concesionado (título de CONAGUA)", `${fmt(x.concesionado, 0)} m³/año`],
                    ["Uso del volumen concesionado", `${fmt((x.uso ?? 0) * 100, 0)} %`],
                  ] as [string, string][])
                : []),
            ]}
          />
          {x.concesionado === undefined && (
            <p className="mt-2 text-sm">
              No se indicó volumen concesionado; la extracción debe quedar dentro del título de concesión de CONAGUA.
            </p>
          )}
        </>
      )}

      <H>{en && x ? 8 : 6}. Conclusiones</H>
      <p className="mt-2 text-sm">
        El acuífero tiene una transmisividad de {fmt(r.transmisividad, 0)} m²/día. Para extraer{" "}
        <b>{fmt(e.gastoDiseno)} L/s</b> se requiere ademe de <b>{r.ademe}&quot;</b>, al menos{" "}
        <b>{fmt(r.rejilla.longitudMinima, 1)} m de rejilla</b> y una <b>bomba sumergible de {fmt(r.potenciaComercial, 1)} HP</b>{" "}
        colocada a {fmt(r.colocacion, 0)} m con columna de {r.columna.nominal}.
        {en && x && (
          <>
            {" "}
            Se extraen {fmt(x.anual, 0)} m³ al año con {fmt(en.kwhMes, 0)} kWh al mes
            {en.costoMes !== undefined && <> (unos {pesos(en.costoMes)} al mes de energía, {pesos(en.costoM3 ?? 0, 2)} por m³)</>}.
          </>
        )}
      </p>

      <AnexoGraficas especs={[...graficasPozo(e, r), ...graficasPozoExtra(e, r)]} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

"use client";

import { useMemo, useState } from "react";
import { disenarPluvial, type ResultadoPluvial } from "@/calc/drenaje/pluvial";
import {
  AREA_MAXIMA_POR_BAJADA,
  DIAMETROS_BAJADA,
  MESES,
  SUPERFICIES,
  type Superficie,
} from "@/calc/drenaje/tablas";
import {
  Check,
  ErrorText,
  Field,
  fmt,
  ResultRow,
  Section,
  Select,
} from "@/components/form";
import { Graficas } from "@/components/graficas/Grafica";
import PieGenerar from "@/components/PieGenerar";
import PasoAPaso from "@/components/revision/PasoAPaso";
import { EjemplosPrueba, PanelRevision } from "@/components/revision/Revision";
import { registroPrevio } from "@/lib/revision/previa";
import { EJEMPLOS_PLUVIAL, revisionesPluvial } from "@/lib/revision/pluvial";
import { cumpleRevision } from "@/lib/revision/tipos";
import MemoriaPluvial from "./MemoriaPluvial";
import { graficasPluvial } from "@/lib/graficas/agua";
import { graficasPluvialExtra } from "@/lib/graficas/pluvial";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import {
  entradaPluvial,
  FORMULARIO_PLUVIAL_INICIAL,
  type FormularioPluvial,
} from "@/lib/estudios/pluvial";
import type { ProjectInfo } from "@/lib/estudios/proyecto";

const LISTA = Object.keys(SUPERFICIES) as Superficie[];
const BAJADAS = DIAMETROS_BAJADA.map((d) => ({
  value: String(d),
  label: `${d} mm`,
}));

interface Props {
  folio?: string;
  inicial?: FormularioPluvial;
  creditos: number | null;
}

export default function DisenoPluvial({ folio, inicial, creditos }: Props) {
  // Las memorias anteriores no traen las opciones nuevas: se completan con los valores de omisión.
  const [f, setF] = useState<FormularioPluvial>({
    ...FORMULARIO_PLUVIAL_INICIAL,
    ...inicial,
  });
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioPluvial>(
    "pluvial",
    folio,
    setF,
  );

  const setP = (k: keyof ProjectInfo) => (v: string) =>
    setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set =
    (
      k: Exclude<
        keyof FormularioPluvial,
        "project" | "areas" | "lluviaMensual"
      >,
    ) =>
    (v: string) =>
      setF((p) => ({ ...p, [k]: v }));
  const setMes = (i: number) => (v: string) =>
    setF((p) => ({
      ...p,
      lluviaMensual: p.lluviaMensual.map((x, j) => (j === i ? v : x)),
    }));
  const setArea = (k: Superficie) => (v: string) =>
    setF((p) => ({ ...p, areas: { ...p.areas, [k]: v } }));

  const calculo = useMemo(():
    | { ok: true; r: ResultadoPluvial }
    | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarPluvial(entradaPluvial(f)) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [f]);
  const revisiones = calculo.ok
    ? revisionesPluvial(entradaPluvial(f), calculo.r)
    : [];

  const generar = () => {
    setAviso(null);
    if (!calculo.ok || !calculo.r.cumple) {
      setAviso(
        "Corrige los datos marcados en rojo antes de generar la memoria.",
      );
      return;
    }
    guardar(f);
  };

  const falla = revisiones.find((r) => !cumpleRevision(r));
  const veredicto = calculo.ok
    ? {
        cumple: calculo.r.cumple,
        texto: calculo.r.cumple
          ? [
              `${fmt(calculo.r.gasto, 1)} L/s en tubería de ${calculo.r.tuberia.diametro} mm al ${f.pendiente} %`,
              calculo.r.bajadas &&
                `${calculo.r.bajadas.cantidad} bajadas de ${calculo.r.bajadas.diametro} mm`,
              calculo.r.pozos &&
                `${calculo.r.pozos.cantidad} pozo${calculo.r.pozos.cantidad === 1 ? "" : "s"} de absorción`,
            ]
              .filter(Boolean)
              .join(", ") + "."
          : `No pasa: ${falla ? `${falla.nombre.toLowerCase()}, ${fmt(falla.actuante, falla.decimales ?? 2)} contra ${fmt(falla.limite, falla.decimales ?? 2)} ${falla.unidad}` : (calculo.r.problemas[0] ?? "revisa los datos")}.`,
      }
    : { cumple: false, texto: calculo.error };

  return (
    <div className="mt-8 grid gap-6">
      <EjemplosPrueba
        ejemplos={EJEMPLOS_PLUVIAL}
        onUsar={(v) => setF((p) => ({ ...p, ...v }))}
      />

      <Section title="Datos de la obra">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            type="text"
            label="Obra"
            value={f.project.obra}
            onChange={setP("obra")}
            placeholder="Casa habitación de 2 niveles"
          />
          <Field
            type="text"
            label="Ubicación"
            value={f.project.ubicacion}
            onChange={setP("ubicacion")}
            placeholder="Calle, colonia, municipio, estado"
          />
          <Field
            type="text"
            label="Cliente"
            value={f.project.cliente}
            onChange={setP("cliente")}
          />
          <Field
            type="text"
            label="Ingeniero responsable"
            value={f.project.responsable}
            onChange={setP("responsable")}
          />
          <Field
            type="text"
            label="Cédula profesional"
            value={f.project.cedula}
            onChange={setP("cedula")}
          />
          <Field
            type="text"
            label="Registro (DRO o corresponsable)"
            value={f.project.registro}
            onChange={setP("registro")}
          />
        </div>
      </Section>

      <Section title="1. Áreas que drenan">
        <div className="grid gap-4 sm:grid-cols-3">
          {LISTA.map((k) => (
            <Field
              key={k}
              label={`${SUPERFICIES[k].nombre} (C = ${SUPERFICIES[k].c})`}
              unit="m²"
              value={f.areas[k]}
              onChange={setArea(k)}
            />
          ))}
        </div>
      </Section>

      <Section title="2. Lluvia y tubería">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Intensidad de lluvia"
            unit="mm/h"
            value={f.intensidad}
            onChange={set("intensidad")}
          />
          <Field
            label="Duración de la tormenta"
            unit="min"
            value={f.duracion}
            onChange={set("duracion")}
          />
          <Field
            label="Pendiente de la tubería"
            unit="%"
            value={f.pendiente}
            onChange={set("pendiente")}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          La app no trae intensidades precargadas. Tómala de las isoyetas de
          intensidad, duración y periodo de retorno de la SCT o de las curvas de
          la CONAGUA para tu localidad, con la duración de la tormenta y el
          periodo de retorno que pida el municipio.
        </p>
      </Section>

      <Section title="3. Bajadas de azotea">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Diámetro de las bajadas"
            value={f.diametroBajada}
            options={BAJADAS}
            onChange={set("diametroBajada")}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Se revisa que el tubo vertical lleve el gasto de la azotea y se pone
          al menos una bajada por cada {AREA_MAXIMA_POR_BAJADA} m², para que el
          agua salga aunque se tape una coladera.
        </p>
      </Section>

      <Section title="4. Pozos de absorción">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Infiltración del suelo"
            unit="mm/h"
            value={f.infiltracion}
            onChange={set("infiltracion")}
            placeholder="Vacío si el agua va a la calle"
          />
          <Field
            label="Diámetro del pozo"
            unit="m"
            value={f.diametroPozo}
            onChange={set("diametroPozo")}
          />
          <Field
            label="Profundidad útil del pozo"
            unit="m"
            value={f.profundidadPozo}
            onChange={set("profundidadPozo")}
          />
        </div>
      </Section>

      <Section title="5. Captación de agua de lluvia (opcional)">
        <Check
          label="Calcular la captación de lluvia del techo y su cisterna"
          checked={f.captacion === "si"}
          onChange={(v) => set("captacion")(v ? "si" : "")}
        />
        {f.captacion === "si" && (
          <div className="mt-4 grid gap-4">
            <p className="text-sm font-medium">Lluvia media de cada mes</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {MESES.map((m, i) => (
                <Field
                  key={m}
                  label={m}
                  unit="mm"
                  value={f.lluviaMensual[i] ?? ""}
                  onChange={setMes(i)}
                />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="O solo la lluvia anual"
                unit="mm"
                value={f.lluviaAnual}
                onChange={set("lluviaAnual")}
                placeholder="Si no tienes los meses"
              />
              <Field
                label="Área de techo que capta"
                unit="m²"
                value={f.areaCaptacion}
                onChange={set("areaCaptacion")}
                placeholder={`Azotea: ${f.areas.azotea || 0} m²`}
              />
              <Field
                label="Coeficiente de escurrimiento del techo"
                value={f.coeficienteTecho}
                onChange={set("coeficienteTecho")}
              />
              <Field
                label="Personas"
                value={f.personas}
                onChange={set("personas")}
              />
              <Field
                label="Uso no potable por persona"
                unit="L/hab/día"
                value={f.dotacion}
                onChange={set("dotacion")}
              />
              <Field
                label="O demanda total"
                unit="L/día"
                value={f.demandaDiaria}
                onChange={set("demandaDiaria")}
                placeholder="Manda sobre personas × uso"
              />
              <Field
                label="Cisterna propuesta"
                unit="m³"
                value={f.cisterna}
                onChange={set("cisterna")}
                placeholder="Vacío: la recomendada"
              />
            </div>
            <p className="text-sm text-zinc-500">
              La lluvia de cada mes viene en las normales climatológicas del
              Servicio Meteorológico Nacional (CONAGUA) de la estación más
              cercana. El coeficiente va de 0.8 a 0.9 en techos de concreto o
              lámina. El uso no potable es para excusados, lavadora, limpieza y
              riego.
            </p>
          </div>
        )}
      </Section>

      <Section title="Resultados">
        {calculo.ok ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <table className="w-full text-sm">
              <tbody>
                <ResultRow
                  label="Área efectiva, Σ C·A"
                  value={`${fmt(calculo.r.areaEfectiva, 1)} m²`}
                />
                <ResultRow
                  label="Gasto pluvial"
                  value={`${fmt(calculo.r.gasto)} L/s`}
                />
                <ResultRow
                  label="Tubería"
                  value={`${calculo.r.tuberia.diametro} mm (lleva ${fmt(calculo.r.tuberia.capacidad, 1)} L/s, ${fmt(calculo.r.tuberia.velocidad)} m/s)`}
                />
                <ResultRow
                  label="Volumen de la tormenta"
                  value={`${fmt(calculo.r.volumen, 1)} m³`}
                />
              </tbody>
            </table>
            {calculo.r.pozos && (
              <table className="w-full text-sm">
                <tbody>
                  <ResultRow
                    label="Pozos de absorción"
                    value={`${calculo.r.pozos.cantidad}`}
                  />
                  <ResultRow
                    label="Capacidad de cada pozo en la tormenta"
                    value={`${fmt(calculo.r.pozos.capacidad)} m³`}
                  />
                  <ResultRow
                    label="Infiltración de cada pozo"
                    value={`${fmt(calculo.r.pozos.infiltracion, 3)} m³/h`}
                  />
                  <ResultRow
                    label="Tiempo de vaciado"
                    value={`${fmt(calculo.r.pozos.vaciado, 1)} h`}
                  />
                </tbody>
              </table>
            )}
            {calculo.r.bajadas && (
              <table className="w-full text-sm">
                <tbody>
                  <ResultRow
                    label="Gasto de la azotea"
                    value={`${fmt(calculo.r.bajadas.gasto)} L/s`}
                  />
                  <ResultRow
                    label={`Capacidad de una bajada de ${calculo.r.bajadas.diametro} mm`}
                    value={`${fmt(calculo.r.bajadas.capacidad, 1)} L/s`}
                  />
                  <ResultRow
                    label="Bajadas por gasto / por área"
                    value={`${calculo.r.bajadas.porGasto} / ${calculo.r.bajadas.porArea}`}
                  />
                  <ResultRow
                    label="Bajadas"
                    value={`${calculo.r.bajadas.cantidad} de ${calculo.r.bajadas.diametro} mm`}
                  />
                </tbody>
              </table>
            )}
            {calculo.r.captacion && (
              <ResultadosCaptacion c={calculo.r.captacion} />
            )}
            {calculo.r.advertencias.length > 0 && (
              <p className="text-sm text-amber-700 lg:col-span-2 dark:text-amber-400">
                Ojo: {calculo.r.advertencias.join("; ")}.
              </p>
            )}
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>
                  El drenaje no pasa: {calculo.r.problemas.join("; ")}.
                </ErrorText>
              </div>
            )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && <PanelRevision revisiones={revisiones} />}

      {calculo.ok && (
        <Graficas
          especs={[
            ...graficasPluvial(entradaPluvial(f), calculo.r),
            ...graficasPluvialExtra(entradaPluvial(f), calculo.r),
          ]}
        />
      )}

      {calculo.ok && (
        <PasoAPaso>
          {() => (
            <MemoriaPluvial
              m={registroPrevio("pluvial", {
                formulario: f,
                proyecto: f.project,
                entrada: entradaPluvial(f),
                resultado: calculo.r,
              })}
            />
          )}
        </PasoAPaso>
      )}

      <PieGenerar
        folio={folio}
        creditos={creditos}
        pendiente={pendiente}
        error={aviso ?? error}
        onGenerar={generar}
        veredicto={veredicto}
      />
    </div>
  );
}

function ResultadosCaptacion({
  c,
}: {
  c: NonNullable<ResultadoPluvial["captacion"]>;
}) {
  return (
    <div className="grid gap-4 lg:col-span-2">
      <table className="w-full text-sm">
        <tbody>
          <ResultRow
            label="Agua de lluvia captable"
            value={`${fmt(c.captacionAnual, 1)} m³/año`}
          />
          <ResultRow
            label="Demanda de uso no potable"
            value={`${fmt(c.demandaAnual, 1)} m³/año`}
          />
          {c.cisternaRecomendada !== undefined && (
            <ResultRow
              label="Cisterna recomendada"
              value={`${fmt(c.cisternaRecomendada, 1)} m³`}
            />
          )}
          {c.cisterna !== undefined && c.cisterna !== c.cisternaRecomendada && (
            <ResultRow
              label="Cisterna propuesta"
              value={`${fmt(c.cisterna, 1)} m³`}
            />
          )}
          <ResultRow
            label="Agua de lluvia que se usa"
            value={`${fmt(c.aprovechadoAnual, 1)} m³/año`}
          />
          <ResultRow
            label={
              c.modo === "anual"
                ? "Demanda que podría cubrirse"
                : "Demanda cubierta"
            }
            value={`${fmt(c.cobertura * 100, 0)} %`}
          />
        </tbody>
      </table>
      {c.meses && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-right text-sm tabular-nums">
            <thead className="text-xs text-zinc-500">
              <tr>
                <th className="py-1 text-left font-medium">Mes</th>
                <th className="font-medium">Captación</th>
                <th className="font-medium">Demanda</th>
                <th className="font-medium">En cisterna</th>
                <th className="font-medium">De la red</th>
                <th className="font-medium">Se tira</th>
              </tr>
            </thead>
            <tbody>
              {c.meses.map((m, i) => (
                <tr key={MESES[i]} className="border-t border-linea">
                  <td className="py-1 text-left">{MESES[i]}</td>
                  <td>{fmt(m.captacion, 1)}</td>
                  <td>{fmt(m.demanda, 1)}</td>
                  <td>{fmt(m.almacenamiento, 1)}</td>
                  <td>{fmt(m.deficit, 1)}</td>
                  <td>{fmt(m.derrame, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-zinc-500">
            Volúmenes en m³. El balance supone que cada año llueve igual.
          </p>
        </div>
      )}
      {c.comparacion && c.comparacion.length > 1 && (
        <table className="w-full text-sm">
          <tbody>
            {c.comparacion.map((x) => (
              <ResultRow
                key={x.cisterna}
                label={`Con cisterna de ${fmt(x.cisterna, 1)} m³${x.cisterna === c.cisternaRecomendada ? " (recomendada)" : ""}`}
                value={`cubre ${fmt(x.cobertura * 100, 0)} %`}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

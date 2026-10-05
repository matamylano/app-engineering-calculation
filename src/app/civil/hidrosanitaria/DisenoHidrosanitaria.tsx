"use client";

import { useMemo, useState } from "react";
import { disenarCasa, type ResultadoCasa } from "@/calc/hidrosanitaria/casa";
import {
  CALENTADORES,
  CONSUMO_CALIENTE,
  MUEBLES,
  RESERVA_CISTERNA,
  RESERVA_TINACO,
  TEMPERATURA_FRIA,
  type Mueble,
  type TipoCalentador,
} from "@/calc/hidrosanitaria/tablas";
import {
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
import {
  EJEMPLOS_HIDROSANITARIA,
  revisionesHidrosanitaria,
} from "@/lib/revision/hidrosanitaria";
import { registroPrevio } from "@/lib/revision/previa";
import MemoriaHidrosanitaria from "./MemoriaHidrosanitaria";
import { graficasHidrosanitaria } from "@/lib/graficas/agua";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import {
  entradaHidrosanitaria,
  FORMULARIO_HIDROSANITARIA_INICIAL,
  type FormularioHidrosanitaria,
} from "@/lib/estudios/hidrosanitaria";
import type { ProjectInfo } from "@/lib/estudios/proyecto";
import TablaMaterialesHidrosanitaria, {
  textoCalentador,
} from "./TablaMaterialesHidrosanitaria";

const LISTA_MUEBLES = Object.keys(MUEBLES) as Mueble[];
const litros = (x: number) => `${fmt(x, 0)} L`;
const OPCIONES_CALENTADOR = (Object.keys(CALENTADORES) as TipoCalentador[]).map(
  (value) => ({
    value,
    label: CALENTADORES[value],
  }),
);

interface Props {
  folio?: string;
  inicial?: FormularioHidrosanitaria;
  creditos: number | null;
}

export default function DisenoHidrosanitaria({
  folio,
  inicial,
  creditos,
}: Props) {
  const [f, setF] = useState<FormularioHidrosanitaria>(
    inicial ?? FORMULARIO_HIDROSANITARIA_INICIAL,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } =
    useGuardarMemoria<FormularioHidrosanitaria>("hidrosanitaria", folio, setF);

  const setP = (k: keyof ProjectInfo) => (v: string) =>
    setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set =
    (
      k: Exclude<
        keyof FormularioHidrosanitaria,
        "project" | "muebles" | "calentador"
      >,
    ) =>
    (v: string) =>
      setF((p) => ({ ...p, [k]: v }));
  const setMueble = (m: Mueble) => (v: string) =>
    setF((p) => ({ ...p, muebles: { ...p.muebles, [m]: v } }));

  const calculo = useMemo(():
    | { ok: true; r: ResultadoCasa }
    | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarCasa(entradaHidrosanitaria(f)) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [f]);

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

  const pieza = (x: { comercial: number; piezas: number }) =>
    x.piezas > 1
      ? `${x.piezas} de ${litros(x.comercial)}`
      : litros(x.comercial);

  const veredicto = calculo.ok
    ? {
        cumple: calculo.r.cumple,
        texto: calculo.r.cumple
          ? `Cisterna ${pieza(calculo.r.cisterna)}, tinaco ${pieza(calculo.r.tinaco)}, alimentación de ${calculo.r.alimentacion.nominal} y bomba de ${fmt(calculo.r.bomba.potenciaComercial)} HP.`
          : `No pasa: ${calculo.r.problemas[0] ?? "revisa los datos"}.`,
      }
    : { cumple: false, texto: calculo.error };

  return (
    <div className="mt-8 grid gap-6">
      <EjemplosPrueba
        ejemplos={EJEMPLOS_HIDROSANITARIA}
        onUsar={(v) =>
          setF((p) => ({ ...p, ...v, muebles: { ...p.muebles, ...v.muebles } }))
        }
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

      <Section title="1. Demanda y almacenamiento">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Habitantes"
            value={f.habitantes}
            onChange={set("habitantes")}
          />
          <Field
            label="Dotación"
            unit="L/hab/día"
            value={f.dotacion}
            onChange={set("dotacion")}
          />
          <Field
            label="Reserva en cisterna"
            unit="días"
            value={f.diasCisterna}
            onChange={set("diasCisterna")}
            placeholder={`Vacío: ${RESERVA_CISTERNA}`}
          />
          <Field
            label="Reserva en tinaco"
            unit="días"
            value={f.diasTinaco}
            onChange={set("diasTinaco")}
            placeholder={`Vacío: ${RESERVA_TINACO}`}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Revisa la dotación que pide el reglamento de tu municipio. Si la zona
          tiene tandeo, pon en la cisterna los días seguidos sin agua más uno
          (hasta 15). En el tinaco puedes usar fracciones: 0.5 es medio día.
        </p>
      </Section>

      <Section title="2. Muebles">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LISTA_MUEBLES.map((m) => (
            <Field
              key={m}
              label={MUEBLES[m].nombre}
              unit="piezas"
              value={f.muebles[m]}
              onChange={setMueble(m)}
            />
          ))}
        </div>
      </Section>

      <Section title="3. Tinaco y bomba">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Altura del tinaco sobre la salida más alta"
            unit="m"
            value={f.alturaTinaco}
            onChange={set("alturaTinaco")}
          />
          <Field
            label="Tubo del tinaco a la salida más lejana"
            unit="m"
            value={f.longitudTinaco}
            onChange={set("longitudTinaco")}
          />
          <Field
            label="Desnivel de la cisterna al tinaco"
            unit="m"
            value={f.alturaBombeo}
            onChange={set("alturaBombeo")}
          />
          <Field
            label="Tubo de la bomba al tinaco"
            unit="m"
            value={f.longitudBombeo}
            onChange={set("longitudBombeo")}
          />
          <Field
            label="Tiempo para llenar el tinaco"
            unit="min"
            value={f.tiempoLlenado}
            onChange={set("tiempoLlenado")}
          />
          <Field
            label="Drenaje de la casa a la red"
            unit="m"
            value={f.longitudDrenaje}
            onChange={set("longitudDrenaje")}
            placeholder="Vacío: registros según planos"
          />
        </div>
      </Section>

      <Section title="4. Calentador de agua">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Tipo de calentador"
            value={f.calentador}
            options={OPCIONES_CALENTADOR}
            onChange={(v) => setF((p) => ({ ...p, calentador: v }))}
          />
          {f.calentador !== "ninguno" && (
            <>
              <Field
                label="Regaderas a la vez"
                unit="piezas"
                value={f.regaderasSimultaneas}
                onChange={set("regaderasSimultaneas")}
                placeholder="Vacío: hasta 2"
              />
              <Field
                label="Agua caliente por persona"
                unit="L/día"
                value={f.consumoCaliente}
                onChange={set("consumoCaliente")}
                placeholder={`Vacío: ${CONSUMO_CALIENTE}`}
              />
              <Field
                label="Temperatura del agua fría"
                unit="°C"
                value={f.temperaturaFria}
                onChange={set("temperaturaFria")}
                placeholder={`Vacío: ${TEMPERATURA_FRIA}`}
              />
            </>
          )}
        </div>
        {f.calentador !== "ninguno" && (
          <p className="mt-2 text-sm text-zinc-500">
            De paso: se dimensiona con las regaderas a la vez (10 L/min cada
            una, a 40 °C). De depósito: con el baño en la hora pico. Solar: con
            el agua caliente de todo el día; deja un calentador de paso de
            respaldo para días nublados.
          </p>
        )}
      </Section>

      <Section title="Resultados">
        {calculo.ok ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <table className="w-full text-sm">
              <tbody>
                <ResultRow
                  label="Demanda diaria"
                  value={litros(calculo.r.demandaDiaria)}
                />
                <ResultRow
                  label="Cisterna"
                  value={`${litros(calculo.r.cisterna.requerido)} → ${pieza(calculo.r.cisterna)}`}
                />
                <ResultRow
                  label="Tinaco"
                  value={`${litros(calculo.r.tinaco.requerido)} → ${pieza(calculo.r.tinaco)}`}
                />
                <ResultRow
                  label="Gasto probable (Hunter)"
                  value={`${fmt(calculo.r.unidadesMueble, 1)} UM → ${fmt(calculo.r.gastoProbable)} L/s`}
                />
                <ResultRow
                  label="Alimentación desde el tinaco"
                  value={`${calculo.r.alimentacion.nominal} · ${fmt(calculo.r.alimentacion.velocidad)} m/s`}
                />
                <ResultRow
                  label="Presión en la salida más desfavorable"
                  value={`${fmt(calculo.r.alimentacion.presionDisponible)} m`}
                />
              </tbody>
            </table>
            <table className="w-full text-sm">
              <tbody>
                <ResultRow
                  label="Bomba"
                  value={`${fmt(calculo.r.bomba.potenciaComercial)} HP`}
                />
                <ResultRow
                  label="Gasto y carga de bombeo"
                  value={`${fmt(calculo.r.bomba.gasto)} L/s · ${fmt(calculo.r.bomba.carga, 1)} m`}
                />
                <ResultRow
                  label="Tubo de bombeo"
                  value={calculo.r.bomba.nominal}
                />
                <ResultRow
                  label="Unidades de descarga"
                  value={fmt(calculo.r.drenaje.unidadesDescarga, 0)}
                />
                <ResultRow
                  label="Colector interior"
                  value={`${calculo.r.drenaje.colector} mm`}
                />
                <ResultRow
                  label="Albañal"
                  value={`${calculo.r.drenaje.albanal} mm al ${calculo.r.drenaje.pendiente} %`}
                />
                {calculo.r.calentador && (
                  <ResultRow
                    label={`Calentador ${CALENTADORES[calculo.r.calentador.tipo].toLowerCase()}`}
                    value={textoCalentador(calculo.r.calentador)}
                  />
                )}
              </tbody>
            </table>
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>
                  La instalación no pasa: {calculo.r.problemas.join("; ")}.
                </ErrorText>
              </div>
            )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && (
        <PanelRevision
          revisiones={revisionesHidrosanitaria(
            entradaHidrosanitaria(f),
            calculo.r,
          )}
        />
      )}

      {calculo.ok && (
        <Section title="Equipos y piezas para cotizar">
          <TablaMaterialesHidrosanitaria partidas={calculo.r.materiales} />
          <p className="mt-3 text-sm text-zinc-500">
            Los metros de tubo salen de los planos de la casa; aquí van los
            diámetros para pedirlos.
          </p>
        </Section>
      )}

      {calculo.ok && (
        <Graficas
          especs={graficasHidrosanitaria(entradaHidrosanitaria(f), calculo.r)}
        />
      )}

      {calculo.ok && (
        <PasoAPaso>
          {() => (
            <MemoriaHidrosanitaria
              m={registroPrevio("hidrosanitaria", {
                formulario: f,
                proyecto: f.project,
                entrada: entradaHidrosanitaria(f),
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

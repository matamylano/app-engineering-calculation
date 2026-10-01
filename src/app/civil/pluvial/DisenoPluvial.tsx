"use client";

import { useMemo, useState } from "react";
import { disenarPluvial, type ResultadoPluvial } from "@/calc/drenaje/pluvial";
import { SUPERFICIES, type Superficie } from "@/calc/drenaje/tablas";
import { ErrorText, Field, fmt, ResultRow, Section } from "@/components/form";
import PieGenerar from "@/components/PieGenerar";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import { entradaPluvial, FORMULARIO_PLUVIAL_INICIAL, type FormularioPluvial } from "@/lib/estudios/pluvial";
import type { ProjectInfo } from "@/lib/estudios/proyecto";

const LISTA = Object.keys(SUPERFICIES) as Superficie[];

interface Props {
  folio?: string;
  inicial?: FormularioPluvial;
  creditos: number | null;
}

export default function DisenoPluvial({ folio, inicial, creditos }: Props) {
  const [f, setF] = useState<FormularioPluvial>(inicial ?? FORMULARIO_PLUVIAL_INICIAL);
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioPluvial>("pluvial", folio, setF);

  const setP = (k: keyof ProjectInfo) => (v: string) => setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set = (k: Exclude<keyof FormularioPluvial, "project" | "areas">) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const setArea = (k: Superficie) => (v: string) => setF((p) => ({ ...p, areas: { ...p.areas, [k]: v } }));

  const calculo = useMemo((): { ok: true; r: ResultadoPluvial } | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarPluvial(entradaPluvial(f)) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [f]);

  const generar = () => {
    setAviso(null);
    if (!calculo.ok || !calculo.r.cumple) {
      setAviso("Corrige los datos marcados en rojo antes de generar la memoria.");
      return;
    }
    guardar(f);
  };

  return (
    <div className="mt-8 grid gap-6">
      <Section title="Datos de la obra">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field type="text" label="Obra" value={f.project.obra} onChange={setP("obra")} placeholder="Casa habitación de 2 niveles" />
          <Field type="text" label="Ubicación" value={f.project.ubicacion} onChange={setP("ubicacion")} placeholder="Calle, colonia, municipio, estado" />
          <Field type="text" label="Cliente" value={f.project.cliente} onChange={setP("cliente")} />
          <Field type="text" label="Ingeniero responsable" value={f.project.responsable} onChange={setP("responsable")} />
          <Field type="text" label="Cédula profesional" value={f.project.cedula} onChange={setP("cedula")} />
          <Field type="text" label="Registro (DRO o corresponsable)" value={f.project.registro} onChange={setP("registro")} />
        </div>
      </Section>

      <Section title="1. Áreas que drenan">
        <div className="grid gap-4 sm:grid-cols-3">
          {LISTA.map((k) => (
            <Field key={k} label={`${SUPERFICIES[k].nombre} (C = ${SUPERFICIES[k].c})`} unit="m²" value={f.areas[k]} onChange={setArea(k)} />
          ))}
        </div>
      </Section>

      <Section title="2. Lluvia y tubería">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Intensidad de lluvia" unit="mm/h" value={f.intensidad} onChange={set("intensidad")} />
          <Field label="Duración de la tormenta" unit="min" value={f.duracion} onChange={set("duracion")} />
          <Field label="Pendiente de la tubería" unit="%" value={f.pendiente} onChange={set("pendiente")} />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          La intensidad sale de las curvas de intensidad, duración y periodo de retorno de la CONAGUA o de la SCT para
          tu localidad.
        </p>
      </Section>

      <Section title="3. Pozos de absorción">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Infiltración del suelo"
            unit="mm/h"
            value={f.infiltracion}
            onChange={set("infiltracion")}
            placeholder="Vacío si el agua va a la calle"
          />
          <Field label="Diámetro del pozo" unit="m" value={f.diametroPozo} onChange={set("diametroPozo")} />
          <Field label="Profundidad útil del pozo" unit="m" value={f.profundidadPozo} onChange={set("profundidadPozo")} />
        </div>
      </Section>

      <Section title="Resultados">
        {calculo.ok ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <table className="w-full text-sm">
              <tbody>
                <ResultRow label="Área efectiva, Σ C·A" value={`${fmt(calculo.r.areaEfectiva, 1)} m²`} />
                <ResultRow label="Gasto pluvial" value={`${fmt(calculo.r.gasto)} L/s`} />
                <ResultRow
                  label="Tubería"
                  value={`${calculo.r.tuberia.diametro} mm (lleva ${fmt(calculo.r.tuberia.capacidad, 1)} L/s, ${fmt(calculo.r.tuberia.velocidad)} m/s)`}
                />
                <ResultRow label="Volumen de la tormenta" value={`${fmt(calculo.r.volumen, 1)} m³`} />
              </tbody>
            </table>
            {calculo.r.pozos && (
              <table className="w-full text-sm">
                <tbody>
                  <ResultRow label="Pozos de absorción" value={`${calculo.r.pozos.cantidad}`} />
                  <ResultRow label="Capacidad de cada pozo en la tormenta" value={`${fmt(calculo.r.pozos.capacidad)} m³`} />
                  <ResultRow label="Infiltración de cada pozo" value={`${fmt(calculo.r.pozos.infiltracion, 3)} m³/h`} />
                  <ResultRow label="Tiempo de vaciado" value={`${fmt(calculo.r.pozos.vaciado, 1)} h`} />
                </tbody>
              </table>
            )}
            {calculo.r.advertencias.length > 0 && (
              <p className="text-sm text-amber-700 lg:col-span-2 dark:text-amber-400">Ojo: {calculo.r.advertencias.join("; ")}.</p>
            )}
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>El drenaje no pasa: {calculo.r.problemas.join("; ")}.</ErrorText>
              </div>
            )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      <PieGenerar folio={folio} creditos={creditos} pendiente={pendiente} error={aviso ?? error} onGenerar={generar} />
    </div>
  );
}

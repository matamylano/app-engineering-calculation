"use client";

import { useMemo, useState } from "react";
import { disenarFosa, type ResultadoFosa } from "@/calc/drenaje/fosa";
import { ErrorText, Field, fmt, ResultRow, Section, Select } from "@/components/form";
import { Graficas } from "@/components/graficas/Grafica";
import PieGenerar from "@/components/PieGenerar";
import { graficasFosa } from "@/lib/graficas/agua";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import { entradaFosa, FORMULARIO_FOSA_INICIAL, type FormularioFosa } from "@/lib/estudios/fosa";
import type { ProjectInfo } from "@/lib/estudios/proyecto";

const LIMPIEZAS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: n === 1 ? "Cada año" : `Cada ${n} años` }));

interface Props {
  folio?: string;
  inicial?: FormularioFosa;
  creditos: number | null;
}

export default function DisenoFosa({ folio, inicial, creditos }: Props) {
  const [f, setF] = useState<FormularioFosa>(inicial ?? FORMULARIO_FOSA_INICIAL);
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioFosa>("fosa", folio, setF);

  const setP = (k: keyof ProjectInfo) => (v: string) => setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set = (k: Exclude<keyof FormularioFosa, "project">) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const calculo = useMemo((): { ok: true; r: ResultadoFosa } | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarFosa(entradaFosa(f)) };
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
          <Field type="text" label="Obra" value={f.project.obra} onChange={setP("obra")} placeholder="Casa de campo" />
          <Field type="text" label="Ubicación" value={f.project.ubicacion} onChange={setP("ubicacion")} placeholder="Predio, municipio, estado" />
          <Field type="text" label="Cliente" value={f.project.cliente} onChange={setP("cliente")} />
          <Field type="text" label="Ingeniero responsable" value={f.project.responsable} onChange={setP("responsable")} />
          <Field type="text" label="Cédula profesional" value={f.project.cedula} onChange={setP("cedula")} />
          <Field type="text" label="Registro (DRO o corresponsable)" value={f.project.registro} onChange={setP("registro")} />
        </div>
      </Section>

      <Section title="1. Uso">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Habitantes" value={f.habitantes} onChange={set("habitantes")} />
          <Field label="Aportación de aguas negras" unit="L/hab/día" value={f.aportacion} onChange={set("aportacion")} />
          <Select label="Limpieza de lodos" value={f.limpieza} options={LIMPIEZAS} onChange={set("limpieza")} />
          <Field label="Temperatura media del mes más frío" unit="°C" value={f.temperatura} onChange={set("temperatura")} />
        </div>
        <p className="mt-2 text-sm text-zinc-500">La aportación suele tomarse como el 80 % de la dotación de agua.</p>
      </Section>

      <Section title="2. Fosa y terreno">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Profundidad útil de la fosa" unit="m" value={f.profundidad} onChange={set("profundidad")} />
          <Field label="Tasa de aplicación del suelo" unit="L/m²/día" value={f.tasaAplicacion} onChange={set("tasaAplicacion")} />
        </div>
        <p className="mt-2 text-sm text-zinc-500">La tasa de aplicación sale de la prueba de percolación del terreno.</p>
      </Section>

      <Section title="Resultados">
        {calculo.ok ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <table className="w-full text-sm">
              <tbody>
                <ResultRow label="Contribución diaria" value={`${fmt(calculo.r.contribucion, 0)} L`} />
                <ResultRow label="Tiempo de retención" value={`${fmt(calculo.r.retencion)} días`} />
                <ResultRow label="Volumen útil" value={`${fmt(calculo.r.volumen, 0)} L`} />
                <ResultRow
                  label="Medidas interiores"
                  value={`${fmt(calculo.r.medidas.ancho)} × ${fmt(calculo.r.medidas.largo)} × ${f.profundidad} m`}
                />
                <ResultRow
                  label="Biodigestor equivalente"
                  value={calculo.r.biodigestor ? `${fmt(calculo.r.biodigestor, 0)} L` : "más de uno"}
                />
              </tbody>
            </table>
            <table className="w-full text-sm">
              <tbody>
                <ResultRow label="Área de infiltración" value={`${fmt(calculo.r.campo.area, 1)} m²`} />
                <ResultRow label="Zanja de 0.60 m de ancho" value={`${fmt(calculo.r.campo.longitud, 1)} m`} />
                <ResultRow label="Zanjas de hasta 30 m" value={`${calculo.r.campo.zanjas}`} />
              </tbody>
            </table>
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>La fosa no pasa: {calculo.r.problemas.join("; ")}.</ErrorText>
              </div>
            )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && <Graficas especs={graficasFosa(entradaFosa(f), calculo.r)} />}

      <PieGenerar folio={folio} creditos={creditos} pendiente={pendiente} error={aviso ?? error} onGenerar={generar} />
    </div>
  );
}

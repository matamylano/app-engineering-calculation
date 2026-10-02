"use client";

import { useMemo, useState } from "react";
import { disenarPozo, type ResultadoPozo } from "@/calc/pozos/pozo";
import { ErrorText, Field, fmt, inputClass, ResultRow, Section } from "@/components/form";
import { Graficas } from "@/components/graficas/Grafica";
import PieGenerar from "@/components/PieGenerar";
import { graficasPozo } from "@/lib/graficas/agua";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import { entradaPozo, FORMULARIO_POZO_INICIAL, MAX_LECTURAS, type FormularioPozo, type LecturaForm } from "@/lib/estudios/pozo";
import type { ProjectInfo } from "@/lib/estudios/proyecto";

const quitar = "text-sm text-zinc-500 hover:text-red-600";
const agregar = "rounded-md border border-dashed border-zinc-400 px-3 py-1.5 text-sm hover:border-zinc-600";

interface Props {
  folio?: string;
  inicial?: FormularioPozo;
  creditos: number | null;
}

export default function DisenoPozo({ folio, inicial, creditos }: Props) {
  const [f, setF] = useState<FormularioPozo>(inicial ?? FORMULARIO_POZO_INICIAL);
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioPozo>("pozo", folio, setF);

  const setP = (k: keyof ProjectInfo) => (v: string) => setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set = (k: Exclude<keyof FormularioPozo, "project" | "lecturas">) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const setLectura = (i: number, cambio: Partial<LecturaForm>) =>
    setF((p) => ({ ...p, lecturas: p.lecturas.map((l, j) => (j === i ? { ...l, ...cambio } : l)) }));

  const calculo = useMemo((): { ok: true; r: ResultadoPozo } | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarPozo(entradaPozo(f)) };
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
          <Field type="text" label="Obra" value={f.project.obra} onChange={setP("obra")} placeholder="Pozo para riego, rancho El Encino" />
          <Field type="text" label="Ubicación" value={f.project.ubicacion} onChange={setP("ubicacion")} placeholder="Predio, municipio, estado" />
          <Field type="text" label="Cliente" value={f.project.cliente} onChange={setP("cliente")} />
          <Field type="text" label="Ingeniero responsable" value={f.project.responsable} onChange={setP("responsable")} />
          <Field type="text" label="Cédula profesional" value={f.project.cedula} onChange={setP("cedula")} />
          <Field type="text" label="Registro (DRO o corresponsable)" value={f.project.registro} onChange={setP("registro")} />
        </div>
      </Section>

      <Section title="1. Prueba de bombeo">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Gasto de la prueba" unit="L/s" value={f.gastoPrueba} onChange={set("gastoPrueba")} />
          <Field label="Usar lecturas desde" unit="min" value={f.desde} onChange={set("desde")} />
          <Field
            label="Distancia al pozo de observación"
            unit="m"
            value={f.radioObservacion}
            onChange={set("radioObservacion")}
            placeholder="Vacío: lecturas del pozo bombeado"
          />
        </div>
        <div className="mt-4 grid max-w-md gap-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 text-sm font-medium">
            <span>Tiempo (min)</span>
            <span>Abatimiento (m)</span>
            <span />
          </div>
          {f.lecturas.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
              <input aria-label="Tiempo" inputMode="decimal" type="number" step="any" className={inputClass} value={l.t} onChange={(x) => setLectura(i, { t: x.target.value })} />
              <input aria-label="Abatimiento" inputMode="decimal" type="number" step="any" className={inputClass} value={l.s} onChange={(x) => setLectura(i, { s: x.target.value })} />
              <button type="button" className={quitar} onClick={() => setF((p) => ({ ...p, lecturas: p.lecturas.filter((_, j) => j !== i) }))}>
                Quitar
              </button>
            </div>
          ))}
          {f.lecturas.length < MAX_LECTURAS && (
            <button type="button" className={`${agregar} justify-self-start`} onClick={() => setF((p) => ({ ...p, lecturas: [...p.lecturas, { t: "", s: "" }] }))}>
              + Agregar lectura
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Las primeras lecturas suelen salirse de la recta; empieza el ajuste donde los puntos se alinean en papel
          semilogarítmico.
        </p>
      </Section>

      <Section title="2. Pozo y equipo">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nivel estático" unit="m" value={f.nivelEstatico} onChange={set("nivelEstatico")} />
          <Field label="Profundidad del pozo" unit="m" value={f.profundidad} onChange={set("profundidad")} />
          <Field label="Gasto de diseño" unit="L/s" value={f.gastoDiseno} onChange={set("gastoDiseno")} />
          <Field label="Bombeo continuo" unit="horas" value={f.horasBombeo} onChange={set("horasBombeo")} />
          <Field label="Sumergencia de la bomba" unit="m" value={f.sumergencia} onChange={set("sumergencia")} />
          <Field label="Área abierta de la rejilla" unit="%" value={f.aberturaRejilla} onChange={set("aberturaRejilla")} />
          <Field label="Tubo de la descarga al tanque" unit="m" value={f.longitudDescarga} onChange={set("longitudDescarga")} />
          <Field label="Carga en la descarga" unit="m" value={f.cargaDescarga} onChange={set("cargaDescarga")} />
        </div>
      </Section>

      <Section title="Resultados">
        {calculo.ok ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <table className="w-full text-sm">
              <tbody>
                <ResultRow label="Pendiente por ciclo log, Δs" value={`${fmt(calculo.r.recta.pendiente, 3)} m`} />
                <ResultRow label="Transmisividad" value={`${fmt(calculo.r.transmisividad, 1)} m²/día`} />
                {calculo.r.almacenamiento !== undefined && (
                  <ResultRow label="Coeficiente de almacenamiento" value={calculo.r.almacenamiento.toExponential(2)} />
                )}
                <ResultRow label="Capacidad específica" value={`${fmt(calculo.r.capacidadEspecifica)} L/s/m`} />
                <ResultRow label="Abatimiento de diseño" value={`${fmt(calculo.r.abatimientoDiseno)} m`} />
                <ResultRow label="Nivel dinámico" value={`${fmt(calculo.r.nivelDinamico)} m`} />
              </tbody>
            </table>
            <table className="w-full text-sm">
              <tbody>
                <ResultRow label="Ademe" value={`${calculo.r.ademe}"`} />
                <ResultRow label="Rejilla, longitud mínima" value={`${fmt(calculo.r.rejilla.longitudMinima)} m`} />
                <ResultRow label="Bomba colocada a" value={`${fmt(calculo.r.colocacion, 0)} m`} />
                <ResultRow label="Columna" value={`${calculo.r.columna.nominal} · ${fmt(calculo.r.columna.velocidad)} m/s`} />
                <ResultRow label="Carga dinámica total" value={`${fmt(calculo.r.carga, 1)} m`} />
                <ResultRow label="Bomba sumergible" value={`${fmt(calculo.r.potenciaComercial, 1)} HP`} />
              </tbody>
            </table>
            {calculo.r.advertencias.length > 0 && (
              <p className="text-sm text-amber-700 lg:col-span-2 dark:text-amber-400">Ojo: {calculo.r.advertencias.join("; ")}.</p>
            )}
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>El pozo no pasa: {calculo.r.problemas.join("; ")}.</ErrorText>
              </div>
            )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && <Graficas especs={graficasPozo(entradaPozo(f), calculo.r)} />}

      <PieGenerar folio={folio} creditos={creditos} pendiente={pendiente} error={aviso ?? error} onGenerar={generar} />
    </div>
  );
}

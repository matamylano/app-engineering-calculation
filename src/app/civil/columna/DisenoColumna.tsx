"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { disenarColumna, type ResultadoColumna } from "@/calc/concreto/columna";
import { VARILLAS } from "@/calc/concreto/ntc";
import { ErrorText, Field, fmt, ResultRow, Section, Select } from "@/components/form";
import PieGenerar from "@/components/PieGenerar";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import { entradaColumna, FORMULARIO_COLUMNA_INICIAL, type FormularioColumna } from "@/lib/estudios/columna";
import type { ProjectInfo } from "@/lib/estudios/proyecto";

const OPCIONES_VARILLA = VARILLAS.map((v) => ({ value: String(v.numero), label: `#${v.numero} (${fmt(v.area)} cm²)` }));

interface Props {
  folio?: string;
  inicial?: FormularioColumna;
  creditos: number | null;
}

export default function DisenoColumna({ folio, inicial, creditos }: Props) {
  const [f, setF] = useState<FormularioColumna>(inicial ?? FORMULARIO_COLUMNA_INICIAL);
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioColumna>("columna", folio, setF);

  const setP = (k: keyof ProjectInfo) => (v: string) => setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set = (k: Exclude<keyof FormularioColumna, "project">) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const calculo = useMemo((): { ok: true; r: ResultadoColumna } | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarColumna(entradaColumna(f)) };
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

      <Section title="1. Cargas">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field type="text" label="Columna" value={f.elemento} onChange={set("elemento")} />
          <Field label="Carga axial última, Pu" unit="t" value={f.carga} onChange={set("carga")} />
          <Field label="Momento último mayor, Mu" unit="t·m" value={f.momento} onChange={set("momento")} placeholder="0 si no hay" />
          <Field label="Altura libre" unit="m" value={f.altura} onChange={set("altura")} />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Pu sale de tu{" "}
          <Link href="/civil/cargas" className="underline">
            bajada de cargas
          </Link>
          . Mu es el momento mayor en los extremos, en la dirección del lado h; si no lo tienes, se usa la
          excentricidad mínima.
        </p>
      </Section>

      <Section title="2. Sección y materiales">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Lado b" unit="cm" value={f.b} onChange={set("b")} />
          <Field label="Lado h (dirección del momento)" unit="cm" value={f.h} onChange={set("h")} />
          <Field label="Recubrimiento libre" unit="cm" value={f.recubrimiento} onChange={set("recubrimiento")} />
          <Select label="Varilla longitudinal" value={f.varilla} options={OPCIONES_VARILLA} onChange={set("varilla")} />
          <Select label="Estribo" value={f.estribo} options={OPCIONES_VARILLA} onChange={set("estribo")} />
          <Field label="Concreto, f'c" unit="kg/cm²" value={f.fc} onChange={set("fc")} />
          <Field label="Acero, fy" unit="kg/cm²" value={f.fy} onChange={set("fy")} />
        </div>
      </Section>

      <Section title="Resultados">
        {calculo.ok ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <table className="w-full text-sm">
              <tbody>
                <ResultRow label="Esbeltez, kL/r" value={fmt(calculo.r.esbeltez, 1)} />
                <ResultRow label="Amplificación de momentos" value={fmt(calculo.r.amplificacion, 3)} />
                <ResultRow label="Momento de diseño" value={`${fmt(calculo.r.momentoDiseno)} t·m`} />
                <ResultRow label="Carga axial resistente" value={`${fmt(calculo.r.cargaResistente, 1)} t`} />
                <ResultRow label="Momento resistente con Pu" value={`${fmt(calculo.r.momentoResistente)} t·m`} />
              </tbody>
            </table>
            <table className="w-full text-sm">
              <tbody>
                <ResultRow
                  label="Acero longitudinal"
                  value={`${calculo.r.armado.cantidad} #${calculo.r.armado.varilla} (${fmt(calculo.r.armado.area)} cm²)`}
                />
                <ResultRow label="Cuantía" value={`${fmt(calculo.r.armado.cuantia * 100)} %`} />
                <ResultRow label="Varillas por cara" value={`${calculo.r.armado.cantidad / 2}`} />
                <ResultRow label="Estribos" value={`#${calculo.r.estribos.varilla} @ ${fmt(calculo.r.estribos.separacion, 1)} cm`} />
              </tbody>
            </table>
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>La columna no pasa: {calculo.r.problemas.join("; ")}.</ErrorText>
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

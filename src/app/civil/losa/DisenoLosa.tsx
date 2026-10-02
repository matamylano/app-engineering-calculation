"use client";

import { useMemo, useState } from "react";
import { ESPESOR_MINIMO, disenarLosa, type Armado, type ResultadoLosa } from "@/calc/concreto/losa";
import { VARILLAS } from "@/calc/concreto/ntc";
import { APOYOS, type Apoyo } from "@/calc/concreto/viga";
import { Check, ErrorText, Field, fmt, ResultRow, Section, Select } from "@/components/form";
import { Graficas } from "@/components/graficas/Grafica";
import PieGenerar from "@/components/PieGenerar";
import { graficasLosa } from "@/lib/graficas/concreto";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import { entradaLosa, FORMULARIO_LOSA_INICIAL, type FormularioLosa } from "@/lib/estudios/losa";
import type { ProjectInfo } from "@/lib/estudios/proyecto";

const OPCIONES_VARILLA = VARILLAS.filter((v) => v.numero <= 5).map((v) => ({
  value: String(v.numero),
  label: `#${v.numero} (${fmt(v.area)} cm²)`,
}));
const OPCIONES_APOYO = (Object.keys(APOYOS) as Apoyo[]).map((a) => ({ value: a, label: APOYOS[a].nombre }));

interface Props {
  folio?: string;
  inicial?: FormularioLosa;
  creditos: number | null;
}

export default function DisenoLosa({ folio, inicial, creditos }: Props) {
  const [f, setF] = useState<FormularioLosa>(inicial ?? FORMULARIO_LOSA_INICIAL);
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioLosa>("losa", folio, setF);

  const setP = (k: keyof ProjectInfo) => (v: string) => setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set = (k: Exclude<keyof FormularioLosa, "project" | "apoyo" | "incrementos">) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const calculo = useMemo((): { ok: true; r: ResultadoLosa } | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarLosa(entradaLosa(f)) };
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

  const armado = (a: Armado) => `#${f.varilla} @ ${fmt(a.separacion, 1)} cm (${fmt(a.areaColocada)} cm²/m)`;

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

      <Section title="1. Claro y cargas">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field type="text" label="Losa" value={f.elemento} onChange={set("elemento")} />
          <Select label="Apoyos" value={f.apoyo} options={OPCIONES_APOYO} onChange={(apoyo) => setF((p) => ({ ...p, apoyo }))} />
          <Field label="Claro corto libre, L" unit="m" value={f.claro} onChange={set("claro")} />
          <Field label="Carga muerta sin peso de la losa" unit="kg/m²" value={f.muerta} onChange={set("muerta")} />
          <Field label="Carga viva" unit="kg/m²" value={f.viva} onChange={set("viva")} />
          <div className="flex items-end pb-1">
            <Check
              label="Colada en el lugar con mortero (+40 kg/m²)"
              checked={f.incrementos}
              onChange={(incrementos) => setF((p) => ({ ...p, incrementos }))}
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Carga viva para habitación: 190 kg/m² (Wm de las NTC). Si la losa apoya en sus cuatro bordes y el lado largo
          es menor que el doble del corto, trabaja en dos direcciones y este cálculo no aplica.
        </p>
      </Section>

      <Section title="2. Espesor y materiales">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Espesor, h" unit="cm" value={f.h} onChange={set("h")} />
          <Field label="Recubrimiento libre" unit="cm" value={f.recubrimiento} onChange={set("recubrimiento")} />
          <Select label="Varilla" value={f.varilla} options={OPCIONES_VARILLA} onChange={set("varilla")} />
          <Field label="Concreto, f'c" unit="kg/cm²" value={f.fc} onChange={set("fc")} />
          <Field label="Acero, fy" unit="kg/cm²" value={f.fy} onChange={set("fy")} />
        </div>
      </Section>

      <Section title="Resultados">
        {calculo.ok ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <table className="w-full text-sm">
              <tbody>
                <ResultRow label="Carga muerta total" value={`${fmt(calculo.r.muertaTotal, 0)} kg/m²`} />
                <ResultRow label="Carga última" value={`${fmt(calculo.r.cargaUltima, 0)} kg/m²`} />
                <ResultRow label="Peralte efectivo, d" value={`${fmt(calculo.r.d, 1)} cm`} />
                <ResultRow label="Momento negativo" value={`${fmt(calculo.r.negativo.momento)} t·m/m`} />
                <ResultRow label="Momento positivo" value={`${fmt(calculo.r.positivo.momento)} t·m/m`} />
              </tbody>
            </table>
            <table className="w-full text-sm">
              <tbody>
                <ResultRow label="Acero arriba (en apoyos)" value={armado(calculo.r.negativo)} />
                <ResultRow label="Acero abajo" value={armado(calculo.r.positivo)} />
                <ResultRow label="Temperatura (dirección larga)" value={armado(calculo.r.temperatura)} />
                <ResultRow
                  label="Cortante"
                  value={`${fmt(calculo.r.cortante.actuante)} ≤ ${fmt(calculo.r.cortante.resistente)} t/m · ${calculo.r.cortante.cumple ? "cumple" : "NO CUMPLE"}`}
                />
                <ResultRow label="Espesor mínimo sin revisar flechas" value={`${fmt(calculo.r.espesorMinimo, 1)} cm`} />
              </tbody>
            </table>
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>La losa no pasa por cortante. Aumenta el espesor.</ErrorText>
              </div>
            )}
            {calculo.r.cumple && Number(f.h) < calculo.r.espesorMinimo && (
              <p className="text-sm text-amber-700 lg:col-span-2 dark:text-amber-400">
                El espesor es menor que L/{ESPESOR_MINIMO[f.apoyo]}: conviene revisar las deflexiones.
              </p>
            )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && <Graficas especs={graficasLosa(entradaLosa(f), calculo.r)} />}

      <PieGenerar folio={folio} creditos={creditos} pendiente={pendiente} error={aviso ?? error} onGenerar={generar} />
    </div>
  );
}

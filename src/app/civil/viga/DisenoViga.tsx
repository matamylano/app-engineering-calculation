"use client";

import { useMemo, useState } from "react";
import { VARILLAS } from "@/calc/concreto/ntc";
import { APOYOS, disenarViga, problemasViga, type Apoyo, type ResultadoViga } from "@/calc/concreto/viga";
import { ErrorText, Field, fmt, ResultRow, Section, Select } from "@/components/form";
import { Graficas } from "@/components/graficas/Grafica";
import PieGenerar from "@/components/PieGenerar";
import { graficasViga } from "@/lib/graficas/concreto";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import type { ProjectInfo } from "@/lib/estudios/proyecto";
import { entradaViga, FORMULARIO_VIGA_INICIAL, type FormularioViga } from "@/lib/estudios/viga";

const OPCIONES_VARILLA = VARILLAS.map((v) => ({ value: String(v.numero), label: `#${v.numero} (${fmt(v.area)} cm²)` }));
const OPCIONES_APOYO = (Object.keys(APOYOS) as Apoyo[]).map((a) => ({ value: a, label: APOYOS[a].nombre }));

interface Props {
  folio?: string;
  inicial?: FormularioViga;
  creditos: number | null;
}

export default function DisenoViga({ folio, inicial, creditos }: Props) {
  const [f, setF] = useState<FormularioViga>(inicial ?? FORMULARIO_VIGA_INICIAL);
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioViga>("viga", folio, setF);

  const setP = (k: keyof ProjectInfo) => (v: string) => setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set = (k: Exclude<keyof FormularioViga, "project" | "apoyo">) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const calculo = useMemo((): { ok: true; r: ResultadoViga } | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarViga(entradaViga(f)) };
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

  const armado = (l: ResultadoViga["superior"]) => `${l.cantidad} #${f.varilla} (${fmt(l.areaColocada)} cm²)`;

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
          <Field type="text" label="Viga" value={f.elemento} onChange={set("elemento")} />
          <Select label="Apoyos" value={f.apoyo} options={OPCIONES_APOYO} onChange={(apoyo) => setF((p) => ({ ...p, apoyo }))} />
          <Field label="Claro libre, L" unit="m" value={f.claro} onChange={set("claro")} />
          <Field label="Carga muerta sin peso propio" unit="t/m" value={f.muerta} onChange={set("muerta")} />
          <Field label="Carga viva" unit="t/m" value={f.viva} onChange={set("viva")} />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Carga por metro = carga por m² de la losa × ancho tributario, más muros sobre la viga.
        </p>
      </Section>

      <Section title="2. Sección y materiales">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Ancho, b" unit="cm" value={f.b} onChange={set("b")} />
          <Field label="Peralte total, h" unit="cm" value={f.h} onChange={set("h")} />
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
                <ResultRow label="Carga última (con peso propio)" value={`${fmt(calculo.r.cargaUltima)} t/m`} />
                <ResultRow label="Peralte efectivo, d" value={`${fmt(calculo.r.d, 1)} cm`} />
                <ResultRow label="Momento negativo" value={`${fmt(calculo.r.superior.momento)} t·m`} />
                <ResultRow label="Momento positivo" value={`${fmt(calculo.r.inferior.momento)} t·m`} />
                <ResultRow label="Acero mínimo / máximo" value={`${fmt(calculo.r.aceroMinimo)} / ${fmt(calculo.r.aceroMaximo)} cm²`} />
              </tbody>
            </table>
            <table className="w-full text-sm">
              <tbody>
                <ResultRow label="Acero arriba" value={armado(calculo.r.superior)} />
                <ResultRow label="Acero abajo" value={armado(calculo.r.inferior)} />
                <ResultRow
                  label="Cortante a d del apoyo"
                  value={`${fmt(calculo.r.cortante.actuante)} t (concreto ${fmt(calculo.r.cortante.concreto)} t)`}
                />
                <ResultRow label="Estribos" value={`#${f.estribo} @ ${fmt(calculo.r.cortante.separacion, 1)} cm`} />
                <ResultRow label="Peralte mínimo sin revisar flechas" value={`${fmt(calculo.r.peralteMinimo, 0)} cm`} />
              </tbody>
            </table>
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>La viga no pasa: {problemasViga(calculo.r).join("; ")}.</ErrorText>
              </div>
            )}
            {calculo.r.cumple && Number(f.h) < calculo.r.peralteMinimo && (
              <p className="text-sm text-amber-700 lg:col-span-2 dark:text-amber-400">
                El peralte es menor que L/{APOYOS[f.apoyo].peralte}: conviene revisar las deflexiones.
              </p>
            )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && <Graficas especs={graficasViga(entradaViga(f), calculo.r)} />}

      <PieGenerar folio={folio} creditos={creditos} pendiente={pendiente} error={aviso ?? error} onGenerar={generar} />
    </div>
  );
}

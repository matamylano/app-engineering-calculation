"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VARILLAS } from "@/calc/concreto/ntc";
import { disenarZapata, type ResultadoZapata } from "@/calc/concreto/zapata";
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
import { graficasZapata } from "@/lib/graficas/concreto";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import type { ProjectInfo } from "@/lib/estudios/proyecto";
import {
  entradaZapata,
  FORMULARIO_ZAPATA_INICIAL,
  type FormularioZapata,
} from "@/lib/estudios/zapata";

const OPCIONES_VARILLA = VARILLAS.map((v) => ({
  value: String(v.numero),
  label: `#${v.numero} (${fmt(v.area)} cm²)`,
}));

const cumple = (ok: boolean) => (ok ? "cumple" : "NO CUMPLE");

interface Props {
  folio?: string;
  inicial?: FormularioZapata;
  creditos: number | null;
}

export default function DisenoZapata({ folio, inicial, creditos }: Props) {
  const [f, setF] = useState<FormularioZapata>(
    inicial ?? FORMULARIO_ZAPATA_INICIAL,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioZapata>(
    "zapata",
    folio,
    setF,
  );

  const setP = (k: keyof ProjectInfo) => (v: string) =>
    setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set = (k: Exclude<keyof FormularioZapata, "project">) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const calculo = useMemo(():
    | { ok: true; r: ResultadoZapata }
    | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarZapata(entradaZapata(f)) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [f]);

  const generar = () => {
    setAviso(null);
    if (!calculo.ok) {
      setAviso(
        "Corrige los datos marcados en rojo antes de generar la memoria.",
      );
      return;
    }
    if (!calculo.r.cumple) {
      setAviso(
        "La zapata no pasa por cortante; ajústala antes de generar la memoria.",
      );
      return;
    }
    guardar(f);
  };

  return (
    <div className="mt-8 grid gap-6">
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

      <Section title="1. Cargas y suelo">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            type="text"
            label="Zapata"
            value={f.elemento}
            onChange={set("elemento")}
          />
          <Field
            label="Carga de servicio, P"
            unit="t"
            value={f.carga}
            onChange={set("carga")}
          />
          <Field
            label="Carga última, Pu"
            unit="t"
            value={f.cargaUltima}
            onChange={set("cargaUltima")}
          />
          <Field
            label="Capacidad admisible del suelo, qa"
            unit="t/m²"
            value={f.qa}
            onChange={set("qa")}
          />
          <Field
            label="Incremento por peso de la zapata"
            unit="%"
            value={f.incremento}
            onChange={set("incremento")}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Las cargas salen de tu{" "}
          <Link href="/civil/cargas" className="enlace">
            bajada de cargas
          </Link>{" "}
          y qa de tu{" "}
          <Link href="/civil/suelos" className="enlace">
            estudio de suelos
          </Link>
          .
        </p>
      </Section>

      <Section title="2. Geometría y materiales">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Columna, lado c1"
            unit="cm"
            value={f.c1}
            onChange={set("c1")}
          />
          <Field
            label="Columna, lado c2"
            unit="cm"
            value={f.c2}
            onChange={set("c2")}
          />
          <Field
            label="Lado de la zapata, B"
            unit="m"
            value={f.lado}
            onChange={set("lado")}
            placeholder="Vacío: el mínimo"
          />
          <Field
            label="Peralte total, h"
            unit="cm"
            value={f.h}
            onChange={set("h")}
          />
          <Field
            label="Recubrimiento libre"
            unit="cm"
            value={f.recubrimiento}
            onChange={set("recubrimiento")}
          />
          <Select
            label="Varilla"
            value={f.varilla}
            options={OPCIONES_VARILLA}
            onChange={set("varilla")}
          />
          <Field
            label="Concreto, f'c"
            unit="kg/cm²"
            value={f.fc}
            onChange={set("fc")}
          />
          <Field
            label="Acero, fy"
            unit="kg/cm²"
            value={f.fy}
            onChange={set("fy")}
          />
        </div>
      </Section>

      <Section title="Resultados">
        {calculo.ok ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <table className="w-full text-sm">
              <tbody>
                <ResultRow
                  label="Zapata"
                  value={`${fmt(calculo.r.lado)} × ${fmt(calculo.r.lado)} m, h = ${fmt(Number(f.h), 0)} cm`}
                />
                <ResultRow
                  label="Lado mínimo por qa"
                  value={`${fmt(calculo.r.ladoMinimo)} m`}
                />
                <ResultRow
                  label="Presión de servicio"
                  value={`${fmt(calculo.r.presionServicio)} t/m²`}
                />
                <ResultRow
                  label="Presión última"
                  value={`${fmt(calculo.r.presionUltima)} t/m²`}
                />
                <ResultRow
                  label="Peralte efectivo, d"
                  value={`${fmt(calculo.r.d, 1)} cm`}
                />
              </tbody>
            </table>
            <table className="w-full text-sm">
              <tbody>
                <ResultRow
                  label="Penetración (kg/cm²)"
                  value={`${fmt(calculo.r.penetracion.actuante)} ≤ ${fmt(calculo.r.penetracion.resistente)} · ${cumple(calculo.r.penetracion.cumple)}`}
                />
                <ResultRow
                  label="Viga ancha (t)"
                  value={`${fmt(calculo.r.vigaAncha.actuante)} ≤ ${fmt(calculo.r.vigaAncha.resistente)} · ${cumple(calculo.r.vigaAncha.cumple)}`}
                />
                <ResultRow
                  label="Momento último"
                  value={`${fmt(calculo.r.momento)} t·m`}
                />
                <ResultRow
                  label="Acero requerido"
                  value={`${fmt(calculo.r.aceroDiseno)} cm²`}
                />
                <ResultRow
                  label="Armado, en ambas direcciones"
                  value={`${calculo.r.armado.cantidad} varillas #${calculo.r.armado.varilla} @ ${fmt(calculo.r.armado.separacion, 1)} cm`}
                />
              </tbody>
            </table>
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>
                  La zapata no pasa por cortante. Aumenta el peralte o el lado.
                </ErrorText>
              </div>
            )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && <Graficas especs={graficasZapata(entradaZapata(f), calculo.r)} />}

      <PieGenerar folio={folio} creditos={creditos} pendiente={pendiente} error={aviso ?? error} onGenerar={generar} />
    </div>
  );
}

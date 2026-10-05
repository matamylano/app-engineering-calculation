"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FailureMode, FootingShape } from "@/calc/soils/terzaghi";
import { Graficas } from "@/components/graficas/Grafica";
import PieGenerar from "@/components/PieGenerar";
import PasoAPaso from "@/components/revision/PasoAPaso";
import { EjemplosPrueba, PanelRevision } from "@/components/revision/Revision";
import { registroPrevio } from "@/lib/revision/previa";
import { EJEMPLOS_SUELOS, revisionesSuelos } from "@/lib/revision/suelos";
import { cumpleRevision } from "@/lib/revision/tipos";
import { graficasSuelos } from "@/lib/graficas/suelos-cargas";
import { runSoilStudy, type SoilStudyResult } from "@/calc/soils/study";
import { fromKPa, UNIT_SYSTEMS } from "@/calc/units";
import {
  Check,
  ErrorText,
  Field,
  fmt,
  ResultRow,
  Section,
  Select,
} from "@/components/form";
import { urlPrellenado } from "@/lib/estudios/prellenar";
import {
  completarFormulario,
  entradaDesdeFormulario,
  FORMULARIO_INICIAL,
  unitsOf,
  type FormularioSuelos,
  type ProjectInfo,
  type ValueKey,
} from "@/lib/estudios/suelos";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import Memoria, { snapshotDe } from "./Memoria";
import TablaDisenoSuelos from "./TablaDisenoSuelos";

const SHAPES: { value: FootingShape; label: string }[] = [
  { value: "cuadrada", label: "Zapata cuadrada" },
  { value: "corrida", label: "Zapata corrida" },
  { value: "circular", label: "Zapata circular" },
];

const FAILURE: { value: FailureMode; label: string }[] = [
  { value: "general", label: "Corte general (suelo denso o firme)" },
  { value: "local", label: "Corte local (suelo suelto o blando)" },
];

interface Props {
  /** Memoria que se está corrigiendo (no gasta otro crédito). */
  folio?: string;
  inicial?: FormularioSuelos;
  /** Créditos del usuario, o null si no ha entrado. */
  creditos: number | null;
}

export default function SoilStudy({ folio, inicial, creditos }: Props) {
  const [f, setF] = useState<FormularioSuelos>(
    inicial ? completarFormulario(inicial) : FORMULARIO_INICIAL,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const {
    guardar,
    pendiente: pending,
    error,
  } = useGuardarMemoria<FormularioSuelos>("suelos", folio, (b) =>
    setF(completarFormulario(b)),
  );

  const v = f.values;
  const set = (key: ValueKey) => (value: string) =>
    setF((p) => ({ ...p, values: { ...p.values, [key]: value } }));
  const setP = (key: keyof ProjectInfo) => (value: string) =>
    setF((p) => ({ ...p, project: { ...p.project, [key]: value } }));
  const flag =
    (key: "plastic" | "hasWater" | "useQa" | "hasClay" | "preconsolidated") =>
    (value: boolean) =>
      setF((p) => ({ ...p, [key]: value }));
  const {
    plastic,
    shape,
    failure,
    hasWater,
    useQa,
    hasClay,
    preconsolidated,
    project,
  } = f;
  const units = unitsOf(f);

  const S = units.stress;
  const W = units.unitWeight;

  const input = useMemo(() => entradaDesdeFormulario(f), [f]);
  const result: SoilStudyResult = useMemo(() => runSoilStudy(input), [input]);
  const allOk = result.sucs.ok && result.bearing.ok && result.settlement.ok;
  const st = (kPa: number, d = 2) => `${fmt(fromKPa(kPa, S), d)} ${S}`;

  const revisiones = revisionesSuelos(input, result, units);
  const falla = revisiones.find((r) => !cumpleRevision(r));
  const errorCalculo = [result.sucs, result.bearing, result.settlement].flatMap(
    (r) => (r.ok ? [] : [r.error]),
  )[0];
  const veredicto =
    allOk && result.bearing.ok && result.settlement.ok
      ? {
          cumple: !falla,
          texto: falla
            ? `No pasa: ${falla.nombre.toLowerCase()} (${fmt(falla.actuante, falla.decimales ?? 2)} > ${fmt(falla.limite, falla.decimales ?? 2)} ${falla.unidad}).`
            : `${result.sucs.ok ? `${result.sucs.value.symbol}, ` : ""}qa = ${st(result.bearing.value.allowable)}, asentamiento ${fmt(result.settlement.value.total * 100)} cm.`,
        }
      : { cumple: false, texto: errorCalculo ?? "Revisa los datos." };

  const generate = () => {
    setNotice(null);
    if (!allOk) {
      setNotice(
        "Corrige los datos marcados en rojo antes de generar la memoria.",
      );
      return;
    }
    guardar(f);
  };

  return (
    <div className="mt-8 grid gap-6">
      <div className="no-print grid gap-6">
        <EjemplosPrueba
          ejemplos={EJEMPLOS_SUELOS}
          onUsar={(x) =>
            setF((p) =>
              completarFormulario({
                ...p,
                ...x,
                values: { ...p.values, ...x.values },
              }),
            )
          }
        />

        <Section title="Datos de la obra">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              type="text"
              label="Obra"
              value={project.obra}
              onChange={setP("obra")}
              placeholder="Casa habitación de 2 niveles"
            />
            <Field
              type="text"
              label="Ubicación"
              value={project.ubicacion}
              onChange={setP("ubicacion")}
              placeholder="Calle, colonia, municipio, estado"
            />
            <Field
              type="text"
              label="Cliente"
              value={project.cliente}
              onChange={setP("cliente")}
            />
            <Field
              type="text"
              label="Ingeniero responsable"
              value={project.responsable}
              onChange={setP("responsable")}
            />
            <Field
              type="text"
              label="Cédula profesional"
              value={project.cedula}
              onChange={setP("cedula")}
            />
            <Field
              type="text"
              label="Registro (DRO o corresponsable)"
              value={project.registro}
              onChange={setP("registro")}
            />
          </div>
          <div className="mt-4 max-w-xs">
            <Select
              label="Unidades"
              value={units.id}
              options={UNIT_SYSTEMS.map((u) => ({
                value: u.id,
                label: u.label,
              }))}
              onChange={(id) => setF((p) => ({ ...p, unitsId: id }))}
            />
          </div>
        </Section>

        <Section title="1. Clasificación del suelo (SUCS)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Pasa la malla No. 200"
              unit="%"
              value={v.p200}
              onChange={set("p200")}
            />
            <Field
              label="Pasa la malla No. 4"
              unit="%"
              value={v.p4}
              onChange={set("p4")}
            />
            <div className="flex items-end pb-2">
              <Check
                label="El suelo es plástico"
                checked={plastic}
                onChange={flag("plastic")}
              />
            </div>
            {plastic && (
              <Field
                label="Límite líquido, LL"
                unit="%"
                value={v.ll}
                onChange={set("ll")}
              />
            )}
            {plastic && (
              <Field
                label="Límite plástico, LP"
                unit="%"
                value={v.pl}
                onChange={set("pl")}
              />
            )}
            <Field
              label="Coef. de uniformidad, Cu"
              value={v.cu}
              onChange={set("cu")}
              placeholder="Si finos ≤ 12 %"
            />
            <Field
              label="Coef. de curvatura, Cc"
              value={v.cc}
              onChange={set("cc")}
              placeholder="Si finos ≤ 12 %"
            />
          </div>
          <div className="mt-4">
            {result.sucs.ok ? (
              <p className="text-sm">
                <span className="font-mono text-lg font-semibold">
                  {result.sucs.value.symbol}
                </span>{" "}
                {result.sucs.value.name}. Grava{" "}
                {fmt(result.sucs.value.gravel, 0)} %, arena{" "}
                {fmt(result.sucs.value.sand, 0)} %, finos{" "}
                {fmt(result.sucs.value.fines, 0)} %, IP ={" "}
                {fmt(result.sucs.value.plasticityIndex, 0)}.
              </p>
            ) : (
              <ErrorText>{result.sucs.error}</ErrorText>
            )}
          </div>
        </Section>

        <Section title="2. Capacidad de carga (Terzaghi)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Cimentación"
              value={shape}
              options={SHAPES}
              onChange={(x) => setF((p) => ({ ...p, shape: x }))}
            />
            <Select
              label="Tipo de falla"
              value={failure}
              options={FAILURE}
              onChange={(x) => setF((p) => ({ ...p, failure: x }))}
            />
            <Field
              label="Factor de seguridad, FS"
              value={v.fs}
              onChange={set("fs")}
            />
            <Field
              label="Cohesión, c"
              unit={S}
              value={v.c}
              onChange={set("c")}
            />
            <Field
              label="Ángulo de fricción, φ"
              unit="°"
              value={v.phi}
              onChange={set("phi")}
            />
            <Field
              label="Peso volumétrico, γ"
              unit={W}
              value={v.gamma}
              onChange={set("gamma")}
            />
            <Field
              label="Profundidad de desplante, Df"
              unit="m"
              value={v.df}
              onChange={set("df")}
            />
            <Field
              label={shape === "circular" ? "Diámetro, B" : "Ancho, B"}
              unit="m"
              value={v.b}
              onChange={set("b")}
            />
            <div className="flex items-end pb-2">
              <Check
                label="Hay nivel freático"
                checked={hasWater}
                onChange={flag("hasWater")}
              />
            </div>
            {hasWater && (
              <Field
                label="Profundidad del NF"
                unit="m"
                value={v.dw}
                onChange={set("dw")}
              />
            )}
            {hasWater && (
              <Field
                label="Peso volumétrico saturado"
                unit={W}
                value={v.gammaSat}
                onChange={set("gammaSat")}
              />
            )}
          </div>
          <div className="mt-4">
            {result.bearing.ok ? (
              <>
                <table className="w-full max-w-md text-sm">
                  <tbody>
                    <ResultRow
                      label="Nc / Nq / Nγ"
                      value={`${fmt(result.bearing.value.factors.Nc)} / ${fmt(result.bearing.value.factors.Nq)} / ${fmt(result.bearing.value.factors.Ngamma)}`}
                    />
                    <ResultRow
                      label="Capacidad última, qu"
                      value={st(result.bearing.value.ultimate)}
                    />
                    <ResultRow
                      label="Capacidad admisible, qa"
                      value={`${st(result.bearing.value.allowable)} · ${fmt(fromKPa(result.bearing.value.allowable, "kg/cm²"))} kg/cm²`}
                    />
                  </tbody>
                </table>
                <p className="mt-3 text-sm">
                  {/* La zapata siempre trabaja qa en t/m², aunque el estudio esté en kPa. */}
                  <Link
                    href={urlPrellenado("/civil/zapata", {
                      qa: fromKPa(result.bearing.value.allowable, "t/m²"),
                    })}
                    className="enlace"
                  >
                    Diseñar una zapata con este qa →
                  </Link>
                </p>
              </>
            ) : (
              <ErrorText>{result.bearing.error}</ErrorText>
            )}
          </div>
        </Section>

        <Section title="3. Asentamientos">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-end pb-2">
              <Check
                label="Usar qa como presión de contacto"
                checked={useQa}
                onChange={flag("useQa")}
              />
            </div>
            {!useQa && (
              <Field
                label="Presión de contacto, q"
                unit={S}
                value={v.pressure}
                onChange={set("pressure")}
              />
            )}
            <Field
              label="Módulo de elasticidad, Es"
              unit={S}
              value={v.es}
              onChange={set("es")}
            />
            <Field
              label="Relación de Poisson, ν"
              value={v.nu}
              onChange={set("nu")}
            />
            <Field
              label="Asentamiento total admisible"
              unit="cm"
              value={v.sAdm}
              onChange={set("sAdm")}
              placeholder="2.5"
            />
            <div className="flex items-end pb-2">
              <Check
                label="Hay un estrato de arcilla compresible"
                checked={hasClay}
                onChange={flag("hasClay")}
              />
            </div>
          </div>
          {hasClay && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Espesor del estrato, H"
                unit="m"
                value={v.h}
                onChange={set("h")}
              />
              <Field
                label="Del desplante a la mitad del estrato"
                unit="m"
                value={v.z}
                onChange={set("z")}
              />
              <Field
                label="Esfuerzo efectivo inicial, σ'0"
                unit={S}
                value={v.s0}
                onChange={set("s0")}
              />
              <Field
                label="Relación de vacíos, e0"
                value={v.e0}
                onChange={set("e0")}
              />
              <Field
                label="Índice de compresión, Cc"
                value={v.ccomp}
                onChange={set("ccomp")}
              />
              <div className="flex items-end pb-2">
                <Check
                  label="Arcilla preconsolidada"
                  checked={preconsolidated}
                  onChange={flag("preconsolidated")}
                />
              </div>
              {preconsolidated && (
                <Field
                  label="Índice de recompresión, Cs"
                  value={v.cs}
                  onChange={set("cs")}
                />
              )}
              {preconsolidated && (
                <Field
                  label="Preconsolidación, σ'c"
                  unit={S}
                  value={v.pc}
                  onChange={set("pc")}
                />
              )}
            </div>
          )}
          <div className="mt-4">
            {result.settlement.ok ? (
              <table className="w-full max-w-md text-sm">
                <tbody>
                  <ResultRow
                    label="Presión de contacto"
                    value={st(result.settlement.value.pressure)}
                  />
                  <ResultRow
                    label="Inmediato"
                    value={`${fmt(result.settlement.value.immediate.settlement * 100)} cm`}
                  />
                  {result.settlement.value.consolidation && (
                    <ResultRow
                      label="Por consolidación"
                      value={`${fmt(result.settlement.value.consolidation.settlement * 100)} cm`}
                    />
                  )}
                  <ResultRow
                    label="Total"
                    value={`${fmt(result.settlement.value.total * 100)} cm`}
                  />
                  {result.settlement.value.allowable !== undefined && (
                    <ResultRow
                      label="Admisible"
                      value={`${fmt(result.settlement.value.allowable * 100)} cm · ${result.settlement.value.meetsAllowable ? "cumple" : "no cumple"}`}
                    />
                  )}
                </tbody>
              </table>
            ) : (
              <ErrorText>{result.settlement.error}</ErrorText>
            )}
          </div>
        </Section>

        {result.problemas && result.problemas.length > 0 && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Ojo: {result.problemas.join(" ")} Puedes generar la memoria; quedará
            indicado que no cumple.
          </p>
        )}

        {allOk && <PanelRevision revisiones={revisiones} />}

        {result.designTable && (
          <Section title="4. Tabla de diseño: qa según ancho y desplante">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Usa esta tabla para escoger el tamaño de la zapata. Resaltados, el
              ancho y el desplante capturados (si coinciden con la tabla).
            </p>
            <TablaDisenoSuelos
              tabla={result.designTable}
              unidad={S}
              ancho={input.bearing.width}
              profundidad={input.bearing.depth}
              circular={shape === "circular"}
            />
          </Section>
        )}

        <Graficas especs={graficasSuelos(input, result, units)} />

        {allOk && (
          <PasoAPaso>
            {() => (
              <Memoria
                snapshot={snapshotDe(
                  registroPrevio("suelos", {
                    formulario: f,
                    proyecto: f.project,
                    unidades: units,
                    entrada: input,
                    resultado: result,
                  }),
                )}
              />
            )}
          </PasoAPaso>
        )}

        <PieGenerar
          folio={folio}
          creditos={creditos}
          pendiente={pending}
          error={notice ?? error}
          onGenerar={generate}
          veredicto={veredicto}
        />
      </div>
    </div>
  );
}

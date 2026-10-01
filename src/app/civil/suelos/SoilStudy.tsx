"use client";

import { useMemo, useState } from "react";
import type { FailureMode, FootingShape } from "@/calc/soils/terzaghi";
import { runSoilStudy, type SoilStudyInput, type SoilStudyResult } from "@/calc/soils/study";
import { fromKPa, toKNm3, toKPa, UNIT_SYSTEMS, type UnitSystem } from "@/calc/units";
import { useCredits } from "@/lib/credits";
import { Check, ErrorText, Field, fmt, num, optNum, ResultRow, Section, Select } from "@/components/form";
import ContactoVentas from "@/components/ContactoVentas";
import Memoria, { type MemoriaSnapshot, type ProjectInfo } from "./Memoria";

const SHAPES: { value: FootingShape; label: string }[] = [
  { value: "cuadrada", label: "Zapata cuadrada" },
  { value: "corrida", label: "Zapata corrida" },
  { value: "circular", label: "Zapata circular" },
];

const FAILURE: { value: FailureMode; label: string }[] = [
  { value: "general", label: "Corte general (suelo denso o firme)" },
  { value: "local", label: "Corte local (suelo suelto o blando)" },
];

type Values = Record<string, string>;

/** Valores de ejemplo en unidades de obra (t/m², t/m³). */
const DEFAULTS: Values = {
  p200: "35",
  p4: "90",
  ll: "32",
  pl: "20",
  cu: "",
  cc: "",
  c: "2",
  phi: "28",
  gamma: "1.8",
  df: "1.2",
  b: "1.5",
  fs: "3",
  dw: "",
  gammaSat: "1.95",
  pressure: "",
  es: "1500",
  nu: "0.3",
  z: "",
  h: "",
  s0: "",
  e0: "",
  ccomp: "",
  cs: "",
  pc: "",
};

const EMPTY_PROJECT: ProjectInfo = {
  obra: "",
  ubicacion: "",
  cliente: "",
  responsable: "",
  cedula: "",
  registro: "",
};

function newFolio() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `SUE-${ymd}-${rand}`;
}

export default function SoilStudy() {
  const [units, setUnits] = useState<UnitSystem>(UNIT_SYSTEMS[0]);
  const [v, setV] = useState<Values>(DEFAULTS);
  const [plastic, setPlastic] = useState(true);
  const [shape, setShape] = useState<FootingShape>("cuadrada");
  const [failure, setFailure] = useState<FailureMode>("general");
  const [hasWater, setHasWater] = useState(false);
  const [useQa, setUseQa] = useState(true);
  const [hasClay, setHasClay] = useState(false);
  const [preconsolidated, setPreconsolidated] = useState(false);
  const [project, setProject] = useState<ProjectInfo>(EMPTY_PROJECT);
  const [snapshot, setSnapshot] = useState<MemoriaSnapshot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { credits, spend } = useCredits();

  const set = (key: string) => (value: string) => setV((prev) => ({ ...prev, [key]: value }));
  const setP = (key: keyof ProjectInfo) => (value: string) => setProject((prev) => ({ ...prev, [key]: value }));

  const S = units.stress;
  const W = units.unitWeight;

  const input = useMemo((): SoilStudyInput => {
    const n = (s: string) => num(s);
    const stress = (s: string) => toKPa(num(s), units.stress);
    const weight = (s: string) => toKNm3(num(s), units.unitWeight);
    return {
      sucs: {
        passingNo200: n(v.p200),
        passingNo4: n(v.p4),
        liquidLimit: plastic ? n(v.ll) : undefined,
        plasticLimit: plastic ? n(v.pl) : undefined,
        uniformity: optNum(v.cu),
        curvature: optNum(v.cc),
      },
      bearing: {
        cohesion: stress(v.c),
        frictionAngle: n(v.phi),
        unitWeight: weight(v.gamma),
        depth: n(v.df),
        width: n(v.b),
        shape,
        failureMode: failure,
        safetyFactor: n(v.fs),
        waterTable: hasWater ? { depth: n(v.dw), saturatedUnitWeight: weight(v.gammaSat) } : undefined,
      },
      settlement: {
        pressure: useQa ? undefined : stress(v.pressure),
        elasticModulus: stress(v.es),
        poisson: n(v.nu),
        consolidation: hasClay
          ? {
              depthToMidLayer: n(v.z),
              thickness: n(v.h),
              initialStress: stress(v.s0),
              voidRatio: n(v.e0),
              compressionIndex: n(v.ccomp),
              recompressionIndex: preconsolidated ? n(v.cs) : undefined,
              preconsolidationStress: preconsolidated ? stress(v.pc) : undefined,
            }
          : undefined,
      },
    };
  }, [v, plastic, shape, failure, hasWater, useQa, hasClay, preconsolidated, units]);

  const result: SoilStudyResult = useMemo(() => runSoilStudy(input), [input]);
  const allOk = result.sucs.ok && result.bearing.ok && result.settlement.ok;
  const st = (kPa: number, d = 2) => `${fmt(fromKPa(kPa, S), d)} ${S}`;

  const generate = () => {
    setNotice(null);
    if (!allOk) {
      setNotice("Corrige los datos marcados en rojo antes de generar la memoria.");
      return;
    }
    // Actualizar una memoria ya generada no gasta otro crédito.
    const folio = snapshot?.folio;
    if (!folio && !spend()) {
      setNotice("Ya no tienes créditos. La compra de créditos estará disponible pronto.");
      return;
    }
    setSnapshot({
      folio: folio ?? newFolio(),
      date: new Date().toISOString(),
      project,
      units,
      input,
      result,
    });
  };

  return (
    <div className="mt-8 grid gap-6">
      <div className="no-print grid gap-6">
        <Section title="Datos de la obra">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field type="text" label="Obra" value={project.obra} onChange={setP("obra")} placeholder="Casa habitación de 2 niveles" />
            <Field type="text" label="Ubicación" value={project.ubicacion} onChange={setP("ubicacion")} placeholder="Calle, colonia, municipio, estado" />
            <Field type="text" label="Cliente" value={project.cliente} onChange={setP("cliente")} />
            <Field type="text" label="Ingeniero responsable" value={project.responsable} onChange={setP("responsable")} />
            <Field type="text" label="Cédula profesional" value={project.cedula} onChange={setP("cedula")} />
            <Field type="text" label="Registro (DRO o corresponsable)" value={project.registro} onChange={setP("registro")} />
          </div>
          <div className="mt-4 max-w-xs">
            <Select
              label="Unidades"
              value={units.id}
              options={UNIT_SYSTEMS.map((u) => ({ value: u.id, label: u.label }))}
              onChange={(id) => setUnits(UNIT_SYSTEMS.find((u) => u.id === id) ?? UNIT_SYSTEMS[0])}
            />
          </div>
        </Section>

        <Section title="1. Clasificación del suelo (SUCS)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Pasa la malla No. 200" unit="%" value={v.p200} onChange={set("p200")} />
            <Field label="Pasa la malla No. 4" unit="%" value={v.p4} onChange={set("p4")} />
            <div className="flex items-end pb-2">
              <Check label="El suelo es plástico" checked={plastic} onChange={setPlastic} />
            </div>
            {plastic && <Field label="Límite líquido, LL" unit="%" value={v.ll} onChange={set("ll")} />}
            {plastic && <Field label="Límite plástico, LP" unit="%" value={v.pl} onChange={set("pl")} />}
            <Field label="Coef. de uniformidad, Cu" value={v.cu} onChange={set("cu")} placeholder="Si finos ≤ 12 %" />
            <Field label="Coef. de curvatura, Cc" value={v.cc} onChange={set("cc")} placeholder="Si finos ≤ 12 %" />
          </div>
          <div className="mt-4">
            {result.sucs.ok ? (
              <p className="text-sm">
                <span className="font-mono text-lg font-semibold">{result.sucs.value.symbol}</span>{" "}
                {result.sucs.value.name}. Grava {fmt(result.sucs.value.gravel, 0)} %, arena{" "}
                {fmt(result.sucs.value.sand, 0)} %, finos {fmt(result.sucs.value.fines, 0)} %, IP ={" "}
                {fmt(result.sucs.value.plasticityIndex, 0)}.
              </p>
            ) : (
              <ErrorText>{result.sucs.error}</ErrorText>
            )}
          </div>
        </Section>

        <Section title="2. Capacidad de carga (Terzaghi)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Cimentación" value={shape} options={SHAPES} onChange={setShape} />
            <Select label="Tipo de falla" value={failure} options={FAILURE} onChange={setFailure} />
            <Field label="Factor de seguridad, FS" value={v.fs} onChange={set("fs")} />
            <Field label="Cohesión, c" unit={S} value={v.c} onChange={set("c")} />
            <Field label="Ángulo de fricción, φ" unit="°" value={v.phi} onChange={set("phi")} />
            <Field label="Peso volumétrico, γ" unit={W} value={v.gamma} onChange={set("gamma")} />
            <Field label="Profundidad de desplante, Df" unit="m" value={v.df} onChange={set("df")} />
            <Field label={shape === "circular" ? "Diámetro, B" : "Ancho, B"} unit="m" value={v.b} onChange={set("b")} />
            <div className="flex items-end pb-2">
              <Check label="Hay nivel freático" checked={hasWater} onChange={setHasWater} />
            </div>
            {hasWater && <Field label="Profundidad del NF" unit="m" value={v.dw} onChange={set("dw")} />}
            {hasWater && <Field label="Peso volumétrico saturado" unit={W} value={v.gammaSat} onChange={set("gammaSat")} />}
          </div>
          <div className="mt-4">
            {result.bearing.ok ? (
              <table className="w-full max-w-md text-sm">
                <tbody>
                  <ResultRow label="Nc / Nq / Nγ" value={`${fmt(result.bearing.value.factors.Nc)} / ${fmt(result.bearing.value.factors.Nq)} / ${fmt(result.bearing.value.factors.Ngamma)}`} />
                  <ResultRow label="Capacidad última, qu" value={st(result.bearing.value.ultimate)} />
                  <ResultRow label="Capacidad admisible, qa" value={`${st(result.bearing.value.allowable)} · ${fmt(fromKPa(result.bearing.value.allowable, "kg/cm²"))} kg/cm²`} />
                </tbody>
              </table>
            ) : (
              <ErrorText>{result.bearing.error}</ErrorText>
            )}
          </div>
        </Section>

        <Section title="3. Asentamientos">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-end pb-2">
              <Check label="Usar qa como presión de contacto" checked={useQa} onChange={setUseQa} />
            </div>
            {!useQa && <Field label="Presión de contacto, q" unit={S} value={v.pressure} onChange={set("pressure")} />}
            <Field label="Módulo de elasticidad, Es" unit={S} value={v.es} onChange={set("es")} />
            <Field label="Relación de Poisson, ν" value={v.nu} onChange={set("nu")} />
            <div className="flex items-end pb-2">
              <Check label="Hay un estrato de arcilla compresible" checked={hasClay} onChange={setHasClay} />
            </div>
          </div>
          {hasClay && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Espesor del estrato, H" unit="m" value={v.h} onChange={set("h")} />
              <Field label="Del desplante a la mitad del estrato" unit="m" value={v.z} onChange={set("z")} />
              <Field label="Esfuerzo efectivo inicial, σ'0" unit={S} value={v.s0} onChange={set("s0")} />
              <Field label="Relación de vacíos, e0" value={v.e0} onChange={set("e0")} />
              <Field label="Índice de compresión, Cc" value={v.ccomp} onChange={set("ccomp")} />
              <div className="flex items-end pb-2">
                <Check label="Arcilla preconsolidada" checked={preconsolidated} onChange={setPreconsolidated} />
              </div>
              {preconsolidated && <Field label="Índice de recompresión, Cs" value={v.cs} onChange={set("cs")} />}
              {preconsolidated && <Field label="Preconsolidación, σ'c" unit={S} value={v.pc} onChange={set("pc")} />}
            </div>
          )}
          <div className="mt-4">
            {result.settlement.ok ? (
              <table className="w-full max-w-md text-sm">
                <tbody>
                  <ResultRow label="Presión de contacto" value={st(result.settlement.value.pressure)} />
                  <ResultRow label="Inmediato" value={`${fmt(result.settlement.value.immediate.settlement * 100)} cm`} />
                  {result.settlement.value.consolidation && (
                    <ResultRow label="Por consolidación" value={`${fmt(result.settlement.value.consolidation.settlement * 100)} cm`} />
                  )}
                  <ResultRow label="Total" value={`${fmt(result.settlement.value.total * 100)} cm`} />
                </tbody>
              </table>
            ) : (
              <ErrorText>{result.settlement.error}</ErrorText>
            )}
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generate}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {snapshot ? "Actualizar memoria" : "Generar memoria (1 crédito)"}
          </button>
          {snapshot && (
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-500 dark:border-zinc-700"
            >
              Descargar PDF
            </button>
          )}
          <span className="text-sm text-zinc-500">
            {snapshot
              ? "«Descargar PDF» abre la impresión; elige «Guardar como PDF»."
              : `Te quedan ${credits} ${credits === 1 ? "crédito" : "créditos"}.`}
          </span>
        </div>
        {notice && <ErrorText>{notice}</ErrorText>}
        {!snapshot && credits === 0 && (
          <ContactoVentas
            interes="creditos"
            estudio="suelos"
            titulo="Consigue más créditos"
            descripcion="Déjanos tu WhatsApp y te mandamos los paquetes de créditos disponibles."
          />
        )}
        {snapshot && (
          <ContactoVentas
            interes="firma"
            estudio="suelos"
            titulo="¿No tienes quién firme el estudio?"
            descripcion="Un ingeniero con registro puede revisarlo y firmarlo por ti. Déjanos tu WhatsApp y te contactamos."
          />
        )}
      </div>

      {snapshot && <Memoria snapshot={snapshot} />}
    </div>
  );
}

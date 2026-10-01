"use client";

import { useMemo, useState } from "react";
import {
  terzaghiBearingCapacity,
  type FailureMode,
  type FootingShape,
  type TerzaghiResult,
} from "@/calc/bearing-capacity/terzaghi";

type NumericField = "cohesion" | "frictionAngle" | "unitWeight" | "depth" | "width" | "safetyFactor";

const NUMERIC_FIELDS: { key: NumericField; label: string; unit: string; step: string }[] = [
  { key: "cohesion", label: "Cohesión, c", unit: "kPa", step: "any" },
  { key: "frictionAngle", label: "Ángulo de fricción, φ", unit: "°", step: "any" },
  { key: "unitWeight", label: "Peso volumétrico, γ", unit: "kN/m³", step: "any" },
  { key: "depth", label: "Profundidad de desplante, Df", unit: "m", step: "any" },
  { key: "width", label: "Ancho o diámetro, B", unit: "m", step: "any" },
  { key: "safetyFactor", label: "Factor de seguridad, FS", unit: "", step: "any" },
];

const fmt = (n: number, digits = 2) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export default function BearingCapacityForm() {
  const [values, setValues] = useState<Record<NumericField, string>>({
    cohesion: "0",
    frictionAngle: "30",
    unitWeight: "18",
    depth: "1",
    width: "2",
    safetyFactor: "3",
  });
  const [shape, setShape] = useState<FootingShape>("cuadrada");
  const [failureMode, setFailureMode] = useState<FailureMode>("general");

  const outcome = useMemo((): { result: TerzaghiResult } | { error: string } => {
    const num = (k: NumericField) => (values[k].trim() === "" ? Number.NaN : Number(values[k]));
    try {
      return {
        result: terzaghiBearingCapacity({
          cohesion: num("cohesion"),
          frictionAngle: num("frictionAngle"),
          unitWeight: num("unitWeight"),
          depth: num("depth"),
          width: num("width"),
          safetyFactor: num("safetyFactor"),
          shape,
          failureMode,
        }),
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [values, shape, failureMode]);

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-2">
      <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Tipo de cimentación</span>
          <select className={inputClass} value={shape} onChange={(e) => setShape(e.target.value as FootingShape)}>
            <option value="corrida">Corrida</option>
            <option value="cuadrada">Cuadrada</option>
            <option value="circular">Circular</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Tipo de falla</span>
          <select
            className={inputClass}
            value={failureMode}
            onChange={(e) => setFailureMode(e.target.value as FailureMode)}
          >
            <option value="general">Corte general (suelo denso o firme)</option>
            <option value="local">Corte local (suelo suelto o blando)</option>
          </select>
        </label>
        {NUMERIC_FIELDS.map((f) => (
          <label key={f.key} className="grid gap-1 text-sm">
            <span className="font-medium">
              {f.label} {f.unit && <span className="font-normal text-zinc-500">({f.unit})</span>}
            </span>
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              step={f.step}
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          </label>
        ))}
      </form>

      <section aria-live="polite" className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Resultados</h2>
        {"error" in outcome ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{outcome.error}</p>
        ) : (
          <Results r={outcome.result} failureMode={failureMode} />
        )}
      </section>
    </div>
  );
}

function Results({ r, failureMode }: { r: TerzaghiResult; failureMode: FailureMode }) {
  return (
    <div className="mt-3 grid gap-5 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-zinc-100 p-3 dark:bg-zinc-900">
          <div className="text-zinc-500">Capacidad última, qu</div>
          <div className="text-xl font-semibold">{fmt(r.ultimate, 1)} kPa</div>
        </div>
        <div className="rounded-md bg-zinc-100 p-3 dark:bg-zinc-900">
          <div className="text-zinc-500">Admisible, qa = qu/{fmt(r.safetyFactor, 1)}</div>
          <div className="text-xl font-semibold">{fmt(r.allowable, 1)} kPa</div>
        </div>
      </div>

      {failureMode === "local" && (
        <p className="text-zinc-600 dark:text-zinc-400">
          Falla local: c&apos; = {fmt(r.cohesionUsed)} kPa, φ&apos; = {fmt(r.frictionAngleUsed)}°
        </p>
      )}

      <table className="w-full">
        <caption className="mb-1 text-left font-medium">Factores de capacidad de carga</caption>
        <tbody>
          <Row label="Nc" value={fmt(r.factors.Nc)} />
          <Row label="Nq" value={fmt(r.factors.Nq)} />
          <Row label="Nγ" value={fmt(r.factors.Ngamma)} />
        </tbody>
      </table>

      <table className="w-full">
        <caption className="mb-1 text-left font-medium">Desglose de qu</caption>
        <tbody>
          <Row label="Término de cohesión" value={`${fmt(r.terms.cohesion, 1)} kPa`} />
          <Row label={`Sobrecarga (q = ${fmt(r.surcharge)} kPa)`} value={`${fmt(r.terms.surcharge, 1)} kPa`} />
          <Row label="Peso propio del suelo" value={`${fmt(r.terms.selfWeight, 1)} kPa`} />
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-800">
      <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{label}</td>
      <td className="py-1.5 text-right font-mono">{value}</td>
    </tr>
  );
}

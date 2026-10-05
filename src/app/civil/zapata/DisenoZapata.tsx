"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VARILLAS } from "@/calc/concreto/ntc";
import {
  cuantificarZapata,
  disenarZapata,
  type ResultadoZapata,
} from "@/calc/concreto/zapata";
import {
  preciosDeFormulario,
  presupuesto,
  type Presupuesto,
} from "@/calc/obra/cuantificacion";
import CamposObra from "@/components/obra/CamposObra";
import TablaPresupuesto from "@/components/obra/TablaPresupuesto";
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
import PasoAPaso from "@/components/revision/PasoAPaso";
import { EjemplosPrueba, PanelRevision } from "@/components/revision/Revision";
import { registroPrevio } from "@/lib/revision/previa";
import { EJEMPLOS_ZAPATA, revisionesZapata } from "@/lib/revision/zapata";
import MemoriaZapata from "./MemoriaZapata";
import { graficasZapataCompletas } from "@/lib/graficas/zapata";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import type { ProjectInfo } from "@/lib/estudios/proyecto";
import {
  completarFormularioZapata,
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
    (g) => setF(completarFormularioZapata(g)),
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

  // Cuantificación: con un error en piezas o precios se avisa, pero el diseño sigue.
  const obra = useMemo(():
    | { ok: true; p: Presupuesto }
    | { ok: false; error: string }
    | null => {
    if (!calculo.ok) return null;
    try {
      const { piezas, precios } = preciosDeFormulario(f);
      const partidas = cuantificarZapata(entradaZapata(f), calculo.r, {
        cimbra: f.cimbra === "perimetral",
      });
      return { ok: true, p: presupuesto(partidas, precios, piezas) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [calculo, f]);

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
        `La zapata no pasa: ${calculo.r.problemas.join("; ")}. Ajústala antes de generar la memoria.`,
      );
      return;
    }
    guardar(f);
  };

  const veredicto = calculo.ok
    ? {
        cumple: calculo.r.cumple,
        texto: calculo.r.cumple
          ? resumenZapata(calculo.r, f.h)
          : noPasa(calculo.r.problemas[0]),
      }
    : { cumple: false, texto: calculo.error };

  return (
    <div className="mt-8 grid gap-6">
      <EjemplosPrueba
        ejemplos={EJEMPLOS_ZAPATA}
        onUsar={(v) => setF((p) => ({ ...p, ...v }))}
      />

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
          <Field
            label="Momento de servicio en la base, M"
            unit="t·m"
            value={f.momento}
            onChange={set("momento")}
            placeholder="Vacío: sin momento"
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
          . El momento M actúa en la dirección del largo L; para el diseño se
          toma Mu = M · Pu / P.
        </p>
      </Section>

      <Section title="2. Geometría y materiales">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Columna, lado c1 (paralelo a B)"
            unit="cm"
            value={f.c1}
            onChange={set("c1")}
          />
          <Field
            label="Columna, lado c2 (paralelo a L)"
            unit="cm"
            value={f.c2}
            onChange={set("c2")}
          />
          <Field
            label="Ancho de la zapata, B"
            unit="m"
            value={f.lado}
            onChange={set("lado")}
            placeholder="Vacío: el mínimo"
          />
          <Field
            label="Largo de la zapata, L"
            unit="m"
            value={f.largo}
            onChange={set("largo")}
            placeholder="Vacío: cuadrada"
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
          <Resultados r={calculo.r} h={Number(f.h)} qa={Number(f.qa)} />
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && (
        <PanelRevision
          revisiones={revisionesZapata(entradaZapata(f), calculo.r)}
        />
      )}

      {calculo.ok && (
        <Graficas
          especs={graficasZapataCompletas(entradaZapata(f), calculo.r)}
        />
      )}

      {calculo.ok && (
        <PasoAPaso>
          {() => (
            <MemoriaZapata
              m={registroPrevio("zapata", {
                formulario: f,
                proyecto: f.project,
                entrada: entradaZapata(f),
                resultado: calculo.r,
              })}
            />
          )}
        </PasoAPaso>
      )}

      <Section title="Cuantificación y costo">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Cimbra"
              value={f.cimbra === "perimetral" ? "perimetral" : ""}
              options={[
                { value: "perimetral", label: "Cimbra en el perímetro" },
                { value: "", label: "Colada contra el terreno" },
              ]}
              onChange={set("cimbra")}
            />
          </div>
          <CamposObra
            valores={f}
            onChange={(k, v) => setF((p) => ({ ...p, [k]: v }))}
            materiales={
              f.cimbra === "perimetral"
                ? ["concreto", "acero", "cimbra"]
                : ["concreto", "acero"]
            }
          />
          {obra?.ok && <TablaPresupuesto p={obra.p} />}
          {obra && !obra.ok && <ErrorText>{obra.error}</ErrorText>}
          <p className="text-sm text-zinc-500">
            Incluye la plantilla de concreto pobre de 5 cm (con el precio del
            concreto) y varillas con gancho a 90° de 12 diámetros en cada
            extremo.
          </p>
        </div>
      </Section>

      <PieGenerar
        folio={folio}
        creditos={creditos}
        pendiente={pendiente}
        error={aviso ?? error}
        onGenerar={generar}
        veredicto={veredicto}
      />
    </div>
  );
}

/** El primer problema del motor, sin repetir «no pasa». */
const noPasa = (p = "revisa los datos") =>
  p.startsWith("no pasa")
    ? `${p[0].toUpperCase()}${p.slice(1)}.`
    : `No pasa: ${p}.`;

/** Medidas y armado en una línea, para el pie. */
function resumenZapata(r: ResultadoZapata, h: string) {
  const { largo: l, ancho: a } = r.direcciones;
  const armado = (x: typeof l) =>
    `${x.armado.cantidad} #${x.armado.varilla} @ ${fmt(x.armado.separacion, 1)} cm`;
  const medidas = `Zapata de ${fmt(r.lado)} × ${fmt(r.largo)} m, h = ${h} cm`;
  return r.cuadrada && !r.presiones
    ? `${medidas}, parrilla ${armado(l)} en ambas direcciones.`
    : `${medidas}, ${armado(l)} paralelas a L y ${armado(a)} paralelas a B.`;
}

function Resultados({
  r,
  h,
  qa,
}: {
  r: ResultadoZapata;
  h: number;
  qa: number;
}) {
  const { largo: l, ancho: a } = r.direcciones;
  const armado = (x: typeof l) =>
    `${x.armado.cantidad} #${x.armado.varilla} @ ${fmt(x.armado.separacion, 1)} cm`;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <table className="w-full text-sm">
        <tbody>
          <ResultRow
            label="Zapata"
            value={`${fmt(r.lado)} × ${fmt(r.largo)} m, h = ${fmt(h, 0)} cm`}
          />
          <ResultRow
            label={r.cuadrada ? "Lado mínimo por qa" : "Ancho mínimo por qa"}
            value={`${fmt(r.ladoMinimo)} m`}
          />
          {r.presiones ? (
            <>
              <ResultRow
                label="Excentricidad e = M/P"
                value={`${fmt(r.presiones.excentricidad, 3)} m ≤ L/6 = ${fmt(r.presiones.limite, 3)} m · ${cumple(r.presiones.excentricidad <= r.presiones.limite + 1e-9)}`}
              />
              <ResultRow
                label="Presión máxima de servicio"
                value={`${fmt(r.presiones.maxima)} ≤ ${fmt(qa)} t/m² · ${cumple(r.presiones.maxima <= qa + 1e-9)}`}
              />
              <ResultRow
                label="Presión mínima de servicio"
                value={`${fmt(r.presiones.minima)} t/m²`}
              />
              <ResultRow
                label="Presión última máxima"
                value={`${fmt(r.presiones.maximaUltima)} t/m²`}
              />
            </>
          ) : (
            <>
              <ResultRow
                label="Presión de servicio"
                value={`${fmt(r.presionServicio)} t/m²`}
              />
              <ResultRow
                label="Presión última"
                value={`${fmt(r.presionUltima)} t/m²`}
              />
            </>
          )}
          <ResultRow label="Peralte efectivo, d" value={`${fmt(r.d, 1)} cm`} />
        </tbody>
      </table>
      <table className="w-full text-sm">
        <tbody>
          <ResultRow
            label="Penetración (kg/cm²)"
            value={`${fmt(r.penetracion.actuante)} ≤ ${fmt(r.penetracion.resistente)} · ${cumple(r.penetracion.cumple)}`}
          />
          {r.cuadrada && !r.presiones ? (
            <>
              <ResultRow
                label="Viga ancha (t)"
                value={`${fmt(r.vigaAncha.actuante)} ≤ ${fmt(r.vigaAncha.resistente)} · ${cumple(r.vigaAncha.cumple)}`}
              />
              <ResultRow
                label="Momento último"
                value={`${fmt(r.momento)} t·m`}
              />
              <ResultRow
                label="Acero requerido"
                value={`${fmt(r.aceroDiseno)} cm²`}
              />
              <ResultRow
                label="Armado, en ambas direcciones"
                value={armado(l)}
              />
            </>
          ) : (
            <>
              <ResultRow
                label="Viga ancha, varillas paralelas a L (t)"
                value={`${fmt(l.vigaAncha.actuante)} ≤ ${fmt(l.vigaAncha.resistente)} · ${cumple(l.vigaAncha.cumple)}`}
              />
              <ResultRow
                label="Viga ancha, varillas paralelas a B (t)"
                value={`${fmt(a.vigaAncha.actuante)} ≤ ${fmt(a.vigaAncha.resistente)} · ${cumple(a.vigaAncha.cumple)}`}
              />
              <ResultRow
                label="Mu, varillas paralelas a L / a B"
                value={`${fmt(l.momento)} / ${fmt(a.momento)} t·m`}
              />
              <ResultRow label="Armado paralelo a L" value={armado(l)} />
              <ResultRow label="Armado paralelo a B" value={armado(a)} />
            </>
          )}
        </tbody>
      </table>
      {!r.cumple && (
        <div className="lg:col-span-2">
          <ErrorText>La zapata no pasa: {r.problemas.join("; ")}.</ErrorText>
        </div>
      )}
    </div>
  );
}

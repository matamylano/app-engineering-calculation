"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  cuantificarColumna,
  disenarColumna,
  type ResultadoColumna,
} from "@/calc/concreto/columna";
import {
  preciosDeFormulario,
  presupuesto,
  type Presupuesto,
} from "@/calc/obra/cuantificacion";
import CamposObra from "@/components/obra/CamposObra";
import TablaPresupuesto from "@/components/obra/TablaPresupuesto";
import { VARILLAS } from "@/calc/concreto/ntc";
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
import { EJEMPLOS_COLUMNA, revisionesColumna } from "@/lib/revision/columna";
import { registroPrevio } from "@/lib/revision/previa";
import MemoriaColumna from "./MemoriaColumna";
import { graficasColumnaCompletas } from "@/lib/graficas/columna";
import { urlPrellenado } from "@/lib/estudios/prellenar";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import {
  completarFormularioColumna,
  entradaColumna,
  FORMULARIO_COLUMNA_INICIAL,
  type FormularioColumna,
} from "@/lib/estudios/columna";
import type { ProjectInfo } from "@/lib/estudios/proyecto";

const OPCIONES_VARILLA = VARILLAS.map((v) => ({
  value: String(v.numero),
  label: `#${v.numero} (${fmt(v.area)} cm²)`,
}));

interface Props {
  folio?: string;
  inicial?: FormularioColumna;
  creditos: number | null;
}

export default function DisenoColumna({ folio, inicial, creditos }: Props) {
  const [f, setF] = useState<FormularioColumna>(
    inicial ?? FORMULARIO_COLUMNA_INICIAL,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioColumna>(
    "columna",
    folio,
    (g) => setF(completarFormularioColumna(g)),
  );

  const setP = (k: keyof ProjectInfo) => (v: string) =>
    setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set = (k: Exclude<keyof FormularioColumna, "project">) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const calculo = useMemo(():
    | { ok: true; r: ResultadoColumna }
    | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarColumna(entradaColumna(f)) };
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
      return {
        ok: true,
        p: presupuesto(
          cuantificarColumna(entradaColumna(f), calculo.r),
          precios,
          piezas,
        ),
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [calculo, f]);

  const generar = () => {
    setAviso(null);
    if (!calculo.ok || !calculo.r.cumple) {
      setAviso(
        "Corrige los datos marcados en rojo antes de generar la memoria.",
      );
      return;
    }
    guardar(f);
  };

  const veredicto = calculo.ok
    ? {
        cumple: calculo.r.cumple,
        texto: calculo.r.cumple
          ? `Columna de ${f.b} × ${f.h} cm con ${calculo.r.armado.cantidad} #${calculo.r.armado.varilla} (${fmt(calculo.r.armado.cuantia * 100)} %), estribos #${calculo.r.estribos.varilla} @ ${fmt(calculo.r.estribos.separacion, 1)} cm.`
          : `No pasa: ${calculo.r.problemas[0] ?? "revisa los datos"}.`,
      }
    : { cumple: false, texto: calculo.error };

  return (
    <div className="mt-8 grid gap-6">
      <EjemplosPrueba
        ejemplos={EJEMPLOS_COLUMNA}
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

      <Section title="1. Cargas">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            type="text"
            label="Columna"
            value={f.elemento}
            onChange={set("elemento")}
          />
          <Field
            label="Carga axial última, Pu"
            unit="t"
            value={f.carga}
            onChange={set("carga")}
          />
          <Field
            label="Momento último mayor, Mu"
            unit="t·m"
            value={f.momento}
            onChange={set("momento")}
            placeholder="0 si no hay"
          />
          <Field
            label="Segundo momento, en la dirección de b"
            unit="t·m"
            value={f.momentoB}
            onChange={set("momentoB")}
            placeholder="Vacío: una dirección"
          />
          <Field
            label="Altura libre"
            unit="m"
            value={f.altura}
            onChange={set("altura")}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Pu sale de tu{" "}
          <Link href="/civil/cargas" className="enlace">
            bajada de cargas
          </Link>
          . Mu es el momento mayor en los extremos, en la dirección del lado h;
          si no lo tienes, se usa la excentricidad mínima. Si das el segundo
          momento, se revisa la flexión biaxial con la fórmula de Bresler y el
          acero se reparte en las cuatro caras.
        </p>
      </Section>

      <Section title="2. Sección y materiales">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Lado b" unit="cm" value={f.b} onChange={set("b")} />
          <Field
            label="Lado h (dirección del momento)"
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
            label="Varilla longitudinal"
            value={f.varilla}
            options={OPCIONES_VARILLA}
            onChange={set("varilla")}
          />
          <Select
            label="Estribo"
            value={f.estribo}
            options={OPCIONES_VARILLA}
            onChange={set("estribo")}
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
                  label="Esbeltez, kL/r"
                  value={fmt(calculo.r.esbeltez, 1)}
                />
                <ResultRow
                  label="Amplificación de momentos"
                  value={
                    calculo.r.biaxial
                      ? `${fmt(calculo.r.amplificacion, 3)} (h) · ${fmt(calculo.r.biaxial.amplificacion, 3)} (b)`
                      : fmt(calculo.r.amplificacion, 3)
                  }
                />
                <ResultRow
                  label="Momento de diseño"
                  value={
                    calculo.r.biaxial
                      ? `${fmt(calculo.r.momentoDiseno)} (h) · ${fmt(calculo.r.biaxial.momentoDiseno)} (b) t·m`
                      : `${fmt(calculo.r.momentoDiseno)} t·m`
                  }
                />
                <ResultRow
                  label="Carga axial resistente"
                  value={`${fmt(calculo.r.cargaResistente, 1)} t`}
                />
                {calculo.r.biaxial ? (
                  calculo.r.biaxial.metodo === "bresler" ? (
                    <ResultRow
                      label="Bresler: PR con los dos momentos"
                      value={`${fmt(calculo.r.biaxial.cargaBresler, 1)} ≥ ${fmt(Number(f.carga), 1)} t · ${calculo.r.biaxial.indice <= 1 ? "cumple" : "NO CUMPLE"}`}
                    />
                  ) : (
                    <ResultRow
                      label="Mx/MRx + My/MRy"
                      value={`${fmt(calculo.r.biaxial.indice, 3)} ≤ 1 · ${calculo.r.biaxial.indice <= 1 ? "cumple" : "NO CUMPLE"}`}
                    />
                  )
                ) : (
                  <ResultRow
                    label="Momento resistente con Pu"
                    value={`${fmt(calculo.r.momentoResistente)} t·m`}
                  />
                )}
              </tbody>
            </table>
            <table className="w-full text-sm">
              <tbody>
                <ResultRow
                  label="Acero longitudinal"
                  value={`${calculo.r.armado.cantidad} #${calculo.r.armado.varilla} (${fmt(calculo.r.armado.area)} cm²)`}
                />
                <ResultRow
                  label="Cuantía"
                  value={`${fmt(calculo.r.armado.cuantia * 100)} %`}
                />
                <ResultRow
                  label="Varillas por cara"
                  value={
                    calculo.r.armado.caras === 4
                      ? `${calculo.r.armado.porCaraB} en caras de b · ${calculo.r.armado.porCaraH} en caras de h`
                      : `${calculo.r.armado.cantidad / 2}`
                  }
                />
                <ResultRow
                  label="Estribos"
                  value={`#${calculo.r.estribos.varilla} @ ${fmt(calculo.r.estribos.separacion, 1)} cm`}
                />
              </tbody>
            </table>
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>
                  La columna no pasa: {calculo.r.problemas.join("; ")}.
                </ErrorText>
              </div>
            )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && (
        <PanelRevision
          revisiones={revisionesColumna(entradaColumna(f), calculo.r)}
        />
      )}

      {calculo.ok && (
        <Graficas
          especs={graficasColumnaCompletas(entradaColumna(f), calculo.r)}
        />
      )}

      {calculo.ok && (
        <PasoAPaso>
          {() => (
            <MemoriaColumna
              m={registroPrevio("columna", {
                formulario: f,
                proyecto: f.project,
                entrada: entradaColumna(f),
                resultado: calculo.r,
              })}
            />
          )}
        </PasoAPaso>
      )}

      <Section title="Cuantificación y costo">
        <div className="grid gap-4">
          <CamposObra
            valores={f}
            onChange={(k, v) => setF((p) => ({ ...p, [k]: v }))}
          />
          {obra?.ok && <TablaPresupuesto p={obra.p} />}
          {obra && !obra.ok && <ErrorText>{obra.error}</ErrorText>}
          <p className="text-sm text-zinc-500">
            Concreto y cimbra en la altura libre; varillas con un traslape de 40
            diámetros; estribos con dos ganchos a 135° de 10 diámetros.
          </p>
        </div>
      </Section>

      {calculo.ok && calculo.r.cumple && (
        <p className="text-sm">
          <Link
            className="enlace"
            href={urlPrellenado("/civil/zapata", {
              c1: Number(f.b),
              c2: Number(f.h),
              cargaUltima: Number(f.carga),
            })}
          >
            Diseñar la zapata de esta columna →
          </Link>{" "}
          <span className="text-zinc-500">
            Ahí captura la carga de servicio y la capacidad del suelo.
          </span>
        </p>
      )}

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

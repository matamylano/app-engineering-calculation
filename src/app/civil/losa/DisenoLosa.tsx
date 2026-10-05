"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Uso } from "@/calc/cargas/bajada";
import {
  disenarLosa,
  ESPESOR_MINIMO,
  partidasLosa,
  problemasLosa,
  type Armado,
  type ResultadoLosa,
} from "@/calc/concreto/losa";
import {
  preciosDeFormulario,
  presupuesto,
  type Presupuesto,
} from "@/calc/obra/cuantificacion";
import CamposObra from "@/components/obra/CamposObra";
import TablaPresupuesto from "@/components/obra/TablaPresupuesto";
import { urlPrellenado } from "@/lib/estudios/prellenar";
import { VARILLAS } from "@/calc/concreto/ntc";
import { APOYOS, type Apoyo } from "@/calc/concreto/viga";
import {
  Check,
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
import { EJEMPLOS_LOSA, revisionesLosa } from "@/lib/revision/losa";
import { registroPrevio } from "@/lib/revision/previa";
import MemoriaLosa from "./MemoriaLosa";
import { graficasLosa } from "@/lib/graficas/concreto";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import {
  entradaLosa,
  FORMULARIO_LOSA_INICIAL,
  OPCIONES_USO,
  vivaDeUso,
  type FormularioLosa,
} from "@/lib/estudios/losa";
import type { ProjectInfo } from "@/lib/estudios/proyecto";

const OPCIONES_VARILLA = VARILLAS.filter((v) => v.numero <= 5).map((v) => ({
  value: String(v.numero),
  label: `#${v.numero} (${fmt(v.area)} cm²)`,
}));
const OPCIONES_APOYO = (Object.keys(APOYOS) as Apoyo[]).map((a) => ({
  value: a,
  label: APOYOS[a].nombre,
}));

interface Props {
  folio?: string;
  inicial?: FormularioLosa;
  creditos: number | null;
}

export default function DisenoLosa({ folio, inicial, creditos }: Props) {
  // Las memorias anteriores no traen los campos nuevos: toman los valores iniciales.
  const [f, setF] = useState<FormularioLosa>(
    inicial
      ? { ...FORMULARIO_LOSA_INICIAL, ...inicial }
      : FORMULARIO_LOSA_INICIAL,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioLosa>(
    "losa",
    folio,
    setF,
  );

  const setP = (k: keyof ProjectInfo) => (v: string) =>
    setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set =
    (
      k: Exclude<
        keyof FormularioLosa,
        "project" | "apoyo" | "incrementos" | "elementosFragiles" | "uso"
      >,
    ) =>
    (v: string) =>
      setF((p) => ({ ...p, [k]: v }));
  // La carga viva capturada a mano deja el destino como "otro".
  const setViva = (v: string) => setF((p) => ({ ...p, viva: v, uso: "" }));
  const setUso = (u: Uso | "") =>
    setF((p) => ({ ...p, uso: u, ...(u ? vivaDeUso(u) : {}) }));

  const calculo = useMemo(():
    | { ok: true; r: ResultadoLosa }
    | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarLosa(entradaLosa(f)) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [f]);

  // Cuantificación del tablero completo (claro × largo); sin largo no se cuantifica.
  const obra = useMemo(():
    | { ok: true; p: Presupuesto; area: number }
    | { ok: false; error: string }
    | null => {
    if (!calculo.ok || f.largo.trim() === "") return null;
    try {
      const { piezas, precios } = preciosDeFormulario(f);
      const e = entradaLosa(f);
      const largo = Number(f.largo);
      return {
        ok: true,
        p: presupuesto(partidasLosa(e, calculo.r, largo), precios, piezas),
        area: e.claro * largo * piezas,
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
          ? `Losa de ${f.h} cm: abajo #${f.varilla} @ ${fmt(calculo.r.positivo.separacion, 1)} cm, arriba #${f.varilla} @ ${fmt(calculo.r.negativo.separacion, 1)} cm, temperatura @ ${fmt(calculo.r.temperatura.separacion, 1)} cm.`
          : `No pasa: ${problemasLosa(calculo.r)[0] ?? "revisa los datos"}.`,
      }
    : { cumple: false, texto: calculo.error };

  const armado = (a: Armado) =>
    `#${f.varilla} @ ${fmt(a.separacion, 1)} cm (${fmt(a.areaColocada)} cm²/m)`;

  return (
    <div className="mt-8 grid gap-6">
      <EjemplosPrueba
        ejemplos={EJEMPLOS_LOSA}
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

      <Section title="1. Claro y cargas">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            type="text"
            label="Losa"
            value={f.elemento}
            onChange={set("elemento")}
          />
          <Select
            label="Apoyos"
            value={f.apoyo}
            options={OPCIONES_APOYO}
            onChange={(apoyo) => setF((p) => ({ ...p, apoyo }))}
          />
          <Field
            label="Claro corto libre, L"
            unit="m"
            value={f.claro}
            onChange={set("claro")}
          />
          <Field
            label="Carga muerta sin peso de la losa"
            unit="kg/m²"
            value={f.muerta}
            onChange={set("muerta")}
          />
          <Select
            label="Destino (carga viva NTC)"
            value={f.uso}
            options={OPCIONES_USO}
            onChange={setUso}
          />
          <Field
            label="Carga viva"
            unit="kg/m²"
            value={f.viva}
            onChange={setViva}
          />
          <div className="flex items-end pb-1">
            <Check
              label="Colada en el lugar con mortero (+40 kg/m²)"
              checked={f.incrementos}
              onChange={(incrementos) => setF((p) => ({ ...p, incrementos }))}
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          El destino llena la carga viva máxima Wm de las NTC Criterios y
          Acciones y la parte sostenida para la flecha diferida (W / Wm). Si la
          losa apoya en sus cuatro bordes y el lado largo es menor que el doble
          del corto, trabaja en dos direcciones y este cálculo no aplica.
        </p>
      </Section>

      <Section title="2. Espesor y materiales">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Espesor, h" unit="cm" value={f.h} onChange={set("h")} />
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

      <Section title="3. Deflexiones">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Carga viva sostenida"
            unit="%"
            value={f.vivaSostenida}
            onChange={set("vivaSostenida")}
            placeholder="40"
          />
          <div className="flex items-end pb-1 lg:col-span-2">
            <Check
              label="La flecha puede dañar muros o acabados frágiles (límite L/480 + 0.3 cm)"
              checked={f.elementosFragiles}
              onChange={(elementosFragiles) =>
                setF((p) => ({ ...p, elementosFragiles }))
              }
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Parte de la carga viva que actúa siempre; la muerta y el peso propio
          se toman completos para la flecha diferida.
        </p>
      </Section>

      <Section title="Resultados">
        {calculo.ok ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <table className="w-full text-sm">
              <tbody>
                <ResultRow
                  label="Carga muerta total"
                  value={`${fmt(calculo.r.muertaTotal, 0)} kg/m²`}
                />
                <ResultRow
                  label="Carga última"
                  value={`${fmt(calculo.r.cargaUltima, 0)} kg/m²`}
                />
                <ResultRow
                  label="Peralte efectivo, d"
                  value={`${fmt(calculo.r.d, 1)} cm`}
                />
                <ResultRow
                  label="Momento negativo"
                  value={`${fmt(calculo.r.negativo.momento)} t·m/m`}
                />
                <ResultRow
                  label="Momento positivo"
                  value={`${fmt(calculo.r.positivo.momento)} t·m/m`}
                />
              </tbody>
            </table>
            <table className="w-full text-sm">
              <tbody>
                <ResultRow
                  label="Acero arriba (en apoyos)"
                  value={armado(calculo.r.negativo)}
                />
                <ResultRow
                  label="Acero abajo"
                  value={armado(calculo.r.positivo)}
                />
                <ResultRow
                  label="Temperatura (dirección larga)"
                  value={armado(calculo.r.temperatura)}
                />
                <ResultRow
                  label="Cortante"
                  value={`${fmt(calculo.r.cortante.actuante)} ≤ ${fmt(calculo.r.cortante.resistente)} t/m · ${calculo.r.cortante.cumple ? "cumple" : "NO CUMPLE"}`}
                />
                <ResultRow
                  label="Espesor mínimo sin revisar flechas"
                  value={`${fmt(calculo.r.espesorMinimo, 1)} cm`}
                />
              </tbody>
            </table>
            {calculo.r.deflexion && (
              <table className="w-full text-sm lg:col-span-2">
                <tbody>
                  <ResultRow
                    label="Flecha inmediata; diferida"
                    value={`${fmt(calculo.r.deflexion.inmediata)} cm; ${fmt(calculo.r.deflexion.diferida)} cm`}
                  />
                  <ResultRow
                    label="Flecha total contra el límite NTC"
                    value={`${fmt(calculo.r.deflexion.total)} ≤ ${fmt(calculo.r.deflexion.limite)} cm · ${calculo.r.deflexion.cumple ? "cumple" : "NO CUMPLE"}`}
                  />
                </tbody>
              </table>
            )}
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>
                  La losa no pasa: {problemasLosa(calculo.r).join("; ")}.
                </ErrorText>
              </div>
            )}
            {calculo.r.cumple &&
              calculo.r.deflexion &&
              !calculo.r.deflexion.cumple && (
                <p className="text-sm text-amber-700 lg:col-span-2 dark:text-amber-400">
                  La flecha calculada pasa del límite, aunque el espesor cumple
                  el mínimo L/{ESPESOR_MINIMO[f.apoyo]} con el que las NTC
                  permiten omitir el cálculo. Conviene aumentar el espesor.
                </p>
              )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && (
        <PanelRevision revisiones={revisionesLosa(entradaLosa(f), calculo.r)} />
      )}

      {calculo.ok && (
        <Graficas especs={graficasLosa(entradaLosa(f), calculo.r)} />
      )}

      {calculo.ok && (
        <PasoAPaso>
          {() => (
            <MemoriaLosa
              m={registroPrevio("losa", {
                formulario: f,
                proyecto: f.project,
                entrada: entradaLosa(f),
                resultado: calculo.r,
              })}
            />
          )}
        </PasoAPaso>
      )}

      {calculo.ok && (
        <Section title="Cuantificación y costo">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Largo del tablero"
                unit="m"
                value={f.largo}
                onChange={set("largo")}
                placeholder="Sin cuantificar"
              />
            </div>
            <CamposObra
              valores={f}
              onChange={(k, v) => setF((p) => ({ ...p, [k]: v }))}
            />
            {obra?.ok && (
              <>
                <TablaPresupuesto p={obra.p} />
                {obra.p.total !== null && (
                  <p className="text-sm">
                    Costo por m² de losa:{" "}
                    <b>{fmt(obra.p.total / obra.area, 0)} $/m²</b> (
                    {fmt(obra.area, 1)} m²).
                  </p>
                )}
              </>
            )}
            {obra && !obra.ok && <ErrorText>{obra.error}</ErrorText>}
            <p className="text-sm text-zinc-500">
              Tablero de claro × largo (el largo va en la dirección
              perpendicular al claro). Acero abajo corrido con gancho en cada
              apoyo, bastones arriba de L/4 en cada apoyo, temperatura corrida
              en el largo y cimbra de fondo. Sin traslapes ni las vigas de
              apoyo.
            </p>
            {f.apoyo !== "voladizo" && (
              <Link
                className="enlace text-sm"
                href={urlPrellenado(
                  "/civil/viga",
                  {
                    claro: f.largo.trim() === "" ? undefined : Number(f.largo),
                    muerta:
                      (calculo.r.muertaTotal * Number(f.claro)) / 2 / 1000,
                    viva: (Number(f.viva) * Number(f.claro)) / 2 / 1000,
                  },
                  3,
                )}
              >
                Diseñar la viga de borde que recibe esta losa (media losa de
                ancho tributario) →
              </Link>
            )}
          </div>
        </Section>
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

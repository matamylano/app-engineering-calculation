"use client";

import { useMemo, useState } from "react";
import { VARILLAS } from "@/calc/concreto/ntc";
import type { Uso } from "@/calc/cargas/bajada";
import { APOYOS, disenarViga, partidasViga, problemasViga, type Apoyo, type ResultadoViga } from "@/calc/concreto/viga";
import { preciosDeFormulario, presupuesto, type Presupuesto } from "@/calc/obra/cuantificacion";
import { Check, ErrorText, Field, fmt, ResultRow, Section, Select } from "@/components/form";
import CamposObra from "@/components/obra/CamposObra";
import TablaPresupuesto from "@/components/obra/TablaPresupuesto";
import { Graficas } from "@/components/graficas/Grafica";
import PieGenerar from "@/components/PieGenerar";
import { graficasViga } from "@/lib/graficas/concreto";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import type { ProjectInfo } from "@/lib/estudios/proyecto";
import { OPCIONES_USO, vivaDeUso } from "@/lib/estudios/losa";
import { cargasTributarias, entradaViga, FORMULARIO_VIGA_INICIAL, type FormularioViga } from "@/lib/estudios/viga";

const OPCIONES_VARILLA = VARILLAS.map((v) => ({ value: String(v.numero), label: `#${v.numero} (${fmt(v.area)} cm²)` }));
const OPCIONES_APOYO = (Object.keys(APOYOS) as Apoyo[]).map((a) => ({ value: a, label: APOYOS[a].nombre }));

interface Props {
  folio?: string;
  inicial?: FormularioViga;
  creditos: number | null;
}

export default function DisenoViga({ folio, inicial, creditos }: Props) {
  // Las memorias anteriores no traen los campos nuevos: toman los valores iniciales.
  const [f, setF] = useState<FormularioViga>(inicial ? { ...FORMULARIO_VIGA_INICIAL, ...inicial } : FORMULARIO_VIGA_INICIAL);
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioViga>("viga", folio, setF);

  const setP = (k: keyof ProjectInfo) => (v: string) => setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set = (k: Exclude<keyof FormularioViga, "project" | "apoyo" | "tributaria" | "elementosFragiles" | "usoArea">) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));
  // La carga viva por m² capturada a mano deja el destino como "otro".
  const setVivaArea = (v: string) => setF((p) => ({ ...p, vivaArea: v, usoArea: "" }));
  const setUso = (u: Uso | "") => setF((p) => ({ ...p, usoArea: u, ...(u ? { vivaArea: vivaDeUso(u).viva, vivaSostenida: vivaDeUso(u).vivaSostenida } : {}) }));
  const trib = cargasTributarias(f);
  // Al apagar el área tributaria, las cargas calculadas quedan escritas en t/m.
  const setTributaria = (on: boolean) =>
    setF((p) => {
      const t = cargasTributarias(p);
      return !on && t && Number.isFinite(t.muerta)
        ? { ...p, tributaria: false, muerta: String(Number(t.muerta.toFixed(3))), viva: String(Number(t.viva.toFixed(3))) }
        : { ...p, tributaria: on };
    });

  const calculo = useMemo((): { ok: true; r: ResultadoViga } | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarViga(entradaViga(f)) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [f]);

  const obra = useMemo((): { ok: true; p: Presupuesto } | { ok: false; error: string } | null => {
    if (!calculo.ok) return null;
    try {
      const { piezas, precios } = preciosDeFormulario(f);
      return { ok: true, p: presupuesto(partidasViga(entradaViga(f), calculo.r), precios, piezas) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [calculo, f]);

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
          {!f.tributaria && (
            <>
              <Field label="Carga muerta sin peso propio" unit="t/m" value={f.muerta} onChange={set("muerta")} />
              <Field label="Carga viva" unit="t/m" value={f.viva} onChange={set("viva")} />
            </>
          )}
        </div>
        <div className="mt-4">
          <Check label="Calcular las cargas con el ancho tributario de la losa" checked={f.tributaria} onChange={setTributaria} />
        </div>
        {f.tributaria ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Ancho tributario" unit="m" value={f.anchoTributario} onChange={set("anchoTributario")} />
            <Field label="Carga muerta de la losa (con su peso)" unit="kg/m²" value={f.muertaArea} onChange={set("muertaArea")} />
            <Select label="Destino de la losa" value={f.usoArea} options={OPCIONES_USO} onChange={setUso} />
            <Field label="Carga viva de la losa" unit="kg/m²" value={f.vivaArea} onChange={setVivaArea} />
            <Field label="Muros sobre la viga" unit="t/m" value={f.muros} onChange={set("muros")} placeholder="0" />
            <div className="grid content-end gap-1 pb-1 text-sm">
              {trib && Number.isFinite(trib.muerta) ? (
                <>
                  <span>
                    Carga muerta: <b>{fmt(trib.muerta, 3)} t/m</b>
                  </span>
                  <span>
                    Carga viva: <b>{fmt(trib.viva, 3)} t/m</b>
                  </span>
                </>
              ) : (
                <ErrorText>Revisa el ancho tributario (hasta 20 m) y las cargas por m².</ErrorText>
              )}
            </div>
          </div>
        ) : null}
        <p className="mt-2 text-sm text-zinc-500">
          Carga por metro = carga por m² de la losa × ancho tributario, más muros sobre la viga. El ancho tributario es
          la mitad del claro de la losa a cada lado que descarga en la viga. La carga viva por destino es la máxima (Wm)
          de las NTC Criterios y Acciones.
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

      <Section title="3. Deflexiones">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Carga viva sostenida" unit="%" value={f.vivaSostenida} onChange={set("vivaSostenida")} placeholder="40" />
          <div className="flex items-end pb-1 lg:col-span-2">
            <Check
              label="La flecha puede dañar muros o acabados frágiles (límite L/480 + 0.3 cm)"
              checked={f.elementosFragiles}
              onChange={(elementosFragiles) => setF((p) => ({ ...p, elementosFragiles }))}
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Parte de la carga viva que actúa siempre (carga media W entre máxima Wm de las NTC: 42 % en habitación, 40 % en
          oficinas, 15 % en azoteas). Sirve para la flecha diferida; la muerta y el peso propio se toman completos.
        </p>
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
                <ErrorText>La viga no pasa: {problemasViga(calculo.r).join("; ")}.</ErrorText>
              </div>
            )}
            {calculo.r.cumple && calculo.r.deflexion && !calculo.r.deflexion.cumple && (
              <p className="text-sm text-amber-700 lg:col-span-2 dark:text-amber-400">
                La flecha calculada pasa del límite, aunque el peralte cumple el mínimo L/{APOYOS[f.apoyo].peralte} con el que
                las NTC permiten omitir el cálculo. Conviene aumentar el peralte o dar contraflecha.
              </p>
            )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && <Graficas especs={graficasViga(entradaViga(f), calculo.r)} />}

      {calculo.ok && (
        <Section title="Cuantificación y costo">
          <div className="grid gap-4">
            <CamposObra valores={f} onChange={(k, v) => setF((p) => ({ ...p, [k]: v }))} />
            {obra?.ok && <TablaPresupuesto p={obra.p} />}
            {obra && !obra.ok && <ErrorText>{obra.error}</ErrorText>}
            <p className="text-sm text-zinc-500">
              Concreto del claro libre; varillas corridas arriba y abajo con gancho de 90° en cada extremo; estribos a la
              separación de diseño en todo el claro; cimbra de fondo y dos costados. Sin traslapes.
            </p>
          </div>
        </Section>
      )}

      <PieGenerar folio={folio} creditos={creditos} pendiente={pendiente} error={aviso ?? error} onGenerar={generar} />
    </div>
  );
}

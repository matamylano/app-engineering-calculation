"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Graficas } from "@/components/graficas/Grafica";
import PieGenerar from "@/components/PieGenerar";
import PasoAPaso from "@/components/revision/PasoAPaso";
import { EjemplosPrueba } from "@/components/revision/Revision";
import { EJEMPLOS_CARGAS } from "@/lib/revision/cargas";
import { registroPrevio } from "@/lib/revision/previa";
import MemoriaCargas from "./MemoriaCargas";
import { graficasCargas } from "@/lib/graficas/suelos-cargas";
import {
  bajadaDeCargas,
  CARGAS_VIVAS,
  type ResultadoBajada,
  type Uso,
} from "@/calc/cargas/bajada";
import {
  SISTEMAS_PISO,
  TIPOS_MURO,
  type SistemaPiso,
  type TipoMuro,
} from "@/calc/cargas/catalogos";
import { urlPrellenado } from "@/lib/estudios/prellenar";
import {
  Check,
  ErrorText,
  Field,
  fmt,
  inputClass,
  Section,
  Select,
} from "@/components/form";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import {
  completarFormularioCargas,
  entradaCargas,
  FORMULARIO_CARGAS_INICIAL,
  MAX_ELEMENTOS,
  MAX_NIVELES,
  NIVEL_ENTREPISO,
  type ElementoForm,
  type FormularioCargas,
  type NivelForm,
} from "@/lib/estudios/cargas";
import type { ProjectInfo } from "@/lib/estudios/proyecto";

const USOS = (Object.keys(CARGAS_VIVAS) as Uso[]).map((u) => ({
  value: u,
  label: `${CARGAS_VIVAS[u].nombre} · Wm ${CARGAS_VIVAS[u].wm}`,
}));

const SISTEMAS = (Object.keys(SISTEMAS_PISO) as SistemaPiso[]).map((k) => {
  const d = SISTEMAS_PISO[k];
  const peso = d.peso ?? (d.espesor ? d.espesor * 24 : undefined);
  return { value: k, label: peso ? `${d.nombre} · ≈ ${peso} kg/m²` : d.nombre };
});

const MUROS = (Object.keys(TIPOS_MURO) as TipoMuro[]).map((k) => ({
  value: k,
  label: TIPOS_MURO[k].peso
    ? `${TIPOS_MURO[k].nombre} · ≈ ${TIPOS_MURO[k].peso} kg/m² de muro`
    : TIPOS_MURO[k].nombre,
}));

/** Al elegir un sistema de piso se llenan los datos de su peso propio. */
function cambioSistema(sistema: SistemaPiso): Partial<NivelForm> {
  const d = SISTEMAS_PISO[sistema];
  if (d.espesor !== undefined)
    return { sistema, espesor: String(d.espesor), pesoConcreto: "2.4" };
  if (d.peso !== undefined) return { sistema, pesoSistema: String(d.peso) };
  return { sistema };
}

const quitar = "text-sm text-zinc-500 hover:text-red-600";
const agregar =
  "rounded-md border border-dashed border-zinc-400 px-3 py-1.5 text-sm hover:border-zinc-600";

interface Props {
  folio?: string;
  inicial?: FormularioCargas;
  creditos: number | null;
}

export default function BajadaCargas({ folio, inicial, creditos }: Props) {
  const [f, setF] = useState<FormularioCargas>(
    inicial ? completarFormularioCargas(inicial) : FORMULARIO_CARGAS_INICIAL,
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioCargas>(
    "cargas",
    folio,
    (b) => setF(completarFormularioCargas(b)),
  );

  const setP = (k: keyof ProjectInfo) => (v: string) =>
    setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const setNivel = (i: number, cambio: Partial<NivelForm>) =>
    setF((p) => ({
      ...p,
      niveles: p.niveles.map((n, j) => (j === i ? { ...n, ...cambio } : n)),
    }));
  const setElemento = (i: number, cambio: Partial<ElementoForm>) =>
    setF((p) => ({
      ...p,
      elementos: p.elementos.map((e, j) => (j === i ? { ...e, ...cambio } : e)),
    }));

  const entrada = useMemo(() => entradaCargas(f), [f]);
  const calculo = useMemo(():
    | { ok: true; r: ResultadoBajada }
    | { ok: false; error: string } => {
    try {
      return { ok: true, r: bajadaDeCargas(entrada) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [entrada]);

  const generar = () => {
    setAviso(null);
    if (!calculo.ok) {
      setAviso(
        "Corrige los datos marcados en rojo antes de generar la memoria.",
      );
      return;
    }
    guardar(f);
  };

  return (
    <div className="mt-8 grid gap-6">
      <EjemplosPrueba
        ejemplos={EJEMPLOS_CARGAS}
        onUsar={(v) => setF((p) => completarFormularioCargas({ ...p, ...v }))}
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

      <Section title="1. Niveles (de la azotea hacia abajo)">
        <div className="grid gap-5">
          {f.niveles.map((n, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-3">
                <input
                  aria-label="Nombre del nivel"
                  className={`${inputClass} max-w-xs font-medium`}
                  value={n.nombre}
                  onChange={(e) => setNivel(i, { nombre: e.target.value })}
                />
                {f.niveles.length > 1 && (
                  <button
                    type="button"
                    className={quitar}
                    onClick={() =>
                      setF((p) => ({
                        ...p,
                        niveles: p.niveles.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    Quitar nivel
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-3">
                  <Select
                    label="Uso (carga viva)"
                    value={n.uso}
                    options={USOS}
                    onChange={(uso) => setNivel(i, { uso })}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Select
                    label="Sistema de piso"
                    value={n.sistema}
                    options={SISTEMAS}
                    onChange={(x) => setNivel(i, cambioSistema(x))}
                  />
                </div>
                {SISTEMAS_PISO[n.sistema].peso === undefined ? (
                  <>
                    <Field
                      label="Espesor de losa"
                      unit="cm"
                      value={n.espesor}
                      // Si cambia el espesor de un preset de losa maciza, ya es captura a mano.
                      onChange={(espesor) =>
                        setNivel(i, {
                          espesor,
                          ...(SISTEMAS_PISO[n.sistema].espesor !== undefined
                            ? { sistema: "manual" as const }
                            : {}),
                        })
                      }
                    />
                    <Field
                      label="Peso del concreto"
                      unit="t/m³"
                      value={n.pesoConcreto}
                      onChange={(pesoConcreto) => setNivel(i, { pesoConcreto })}
                    />
                  </>
                ) : (
                  <Field
                    label="Peso propio del sistema de piso"
                    unit="kg/m²"
                    value={n.pesoSistema}
                    onChange={(pesoSistema) => setNivel(i, { pesoSistema })}
                    placeholder="Dato de tu fabricante"
                  />
                )}
                <Field
                  label="Acabados e instalaciones"
                  unit="kg/m²"
                  value={n.acabados}
                  onChange={(acabados) => setNivel(i, { acabados })}
                />
                <div className="sm:col-span-2 lg:col-span-3">
                  <Select
                    label="Muros divisorios"
                    value={n.tipoMuro}
                    options={MUROS}
                    onChange={(tipoMuro) => setNivel(i, { tipoMuro })}
                  />
                </div>
                {n.tipoMuro === "manual" ? (
                  <Field
                    label="Muros divisorios repartidos"
                    unit="kg/m²"
                    value={n.muros}
                    onChange={(muros) => setNivel(i, { muros })}
                    placeholder="0"
                  />
                ) : (
                  <>
                    <Field
                      label="Altura de los muros"
                      unit="m"
                      value={n.alturaMuro}
                      onChange={(alturaMuro) => setNivel(i, { alturaMuro })}
                    />
                    <Field
                      label="Longitud total de muros"
                      unit="m"
                      value={n.longitudMuro}
                      onChange={(longitudMuro) => setNivel(i, { longitudMuro })}
                    />
                    <Field
                      label="Área del nivel"
                      unit="m²"
                      value={n.areaNivel}
                      onChange={(areaNivel) => setNivel(i, { areaNivel })}
                    />
                  </>
                )}
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <Check
                    label="Colada en el lugar (+20 kg/m²)"
                    checked={n.coladaEnSitio}
                    onChange={(coladaEnSitio) => setNivel(i, { coladaEnSitio })}
                  />
                  <Check
                    label="Con capa de mortero (+20 kg/m²)"
                    checked={n.conMortero}
                    onChange={(conMortero) => setNivel(i, { conMortero })}
                  />
                </div>
              </div>
              {calculo.ok && calculo.r.niveles[i] && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Losa ={" "}
                  <b className="font-mono">
                    {fmt(calculo.r.niveles[i].losa, 0)}
                  </b>{" "}
                  kg/m² · muros ={" "}
                  <b className="font-mono">
                    {fmt(calculo.r.niveles[i].muros, 0)}
                  </b>{" "}
                  kg/m² · CM ={" "}
                  <b className="font-mono">
                    {fmt(calculo.r.niveles[i].muerta, 0)}
                  </b>{" "}
                  kg/m² · CV ={" "}
                  <b className="font-mono">
                    {fmt(calculo.r.niveles[i].viva.wm, 0)}
                  </b>{" "}
                  kg/m² · última ={" "}
                  <b className="font-mono">
                    {fmt(calculo.r.niveles[i].ultima, 0)}
                  </b>{" "}
                  kg/m²
                </p>
              )}
            </div>
          ))}
          {f.niveles.length < MAX_NIVELES && (
            <button
              type="button"
              className={`${agregar} justify-self-start`}
              onClick={() =>
                setF((p) => ({
                  ...p,
                  niveles: [
                    ...p.niveles,
                    {
                      ...NIVEL_ENTREPISO,
                      nombre: `Nivel ${p.niveles.length + 1}`,
                    },
                  ],
                }))
              }
            >
              + Agregar nivel
            </button>
          )}
        </div>
      </Section>

      <Section title="2. Columnas y muros de carga">
        <div className="grid gap-3">
          <div className="hidden gap-3 text-sm font-medium sm:grid sm:grid-cols-[2fr_1fr_1fr_auto]">
            <span>Elemento</span>
            <span>Área tributaria por nivel (m²)</span>
            <span>Peso propio por nivel (t)</span>
            <span />
          </div>
          {f.elementos.map((e, i) => (
            <div
              key={i}
              className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-center"
            >
              <input
                aria-label="Elemento"
                className={inputClass}
                value={e.nombre}
                onChange={(x) => setElemento(i, { nombre: x.target.value })}
              />
              <input
                aria-label="Área tributaria"
                inputMode="decimal"
                type="number"
                step="any"
                className={inputClass}
                value={e.area}
                onChange={(x) => setElemento(i, { area: x.target.value })}
              />
              <input
                aria-label="Peso propio"
                inputMode="decimal"
                type="number"
                step="any"
                className={inputClass}
                value={e.pesoPropio}
                onChange={(x) => setElemento(i, { pesoPropio: x.target.value })}
              />
              {f.elementos.length > 1 ? (
                <button
                  type="button"
                  className={quitar}
                  onClick={() =>
                    setF((p) => ({
                      ...p,
                      elementos: p.elementos.filter((_, j) => j !== i),
                    }))
                  }
                >
                  Quitar
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
          {f.elementos.length < MAX_ELEMENTOS && (
            <button
              type="button"
              className={`${agregar} justify-self-start`}
              onClick={() =>
                setF((p) => ({
                  ...p,
                  elementos: [
                    ...p.elementos,
                    {
                      nombre: `C-${p.elementos.length + 1}`,
                      area: "",
                      pesoPropio: "0.4",
                    },
                  ],
                }))
              }
            >
              + Agregar elemento
            </button>
          )}
        </div>
      </Section>

      <Section title="3. Cimentación">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Capacidad admisible del suelo, qa"
            unit="t/m²"
            value={f.qa}
            onChange={(qa) => setF((p) => ({ ...p, qa }))}
            placeholder="De tu estudio de suelos"
          />
          <Field
            label="Incremento por peso de la zapata"
            unit="%"
            value={f.incremento}
            onChange={(incremento) => setF((p) => ({ ...p, incremento }))}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          ¿No tienes qa?{" "}
          <Link href="/civil/suelos" className="enlace">
            Haz el estudio de suelos
          </Link>{" "}
          o deja el campo vacío.
        </p>
      </Section>

      <Section title="Resultados">
        {calculo.ok ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="text-left text-zinc-600 dark:text-zinc-400">
                  <th className="py-1.5 pr-4 font-medium">Elemento</th>
                  <th className="py-1.5 pr-4 text-right font-medium">
                    Servicio (t)
                  </th>
                  <th className="py-1.5 pr-4 text-right font-medium">
                    Última (t)
                  </th>
                  <th className="py-1.5 pr-4 text-right font-medium">
                    Zapata cuadrada
                  </th>
                  <th className="py-1.5 text-right font-medium">Diseñar</th>
                </tr>
              </thead>
              <tbody>
                {calculo.r.elementos.map((el, i) => (
                  <tr
                    key={i}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className="py-1.5 pr-4">{el.nombre}</td>
                    <td className="py-1.5 pr-4 text-right font-mono">
                      {fmt(el.servicio)}
                    </td>
                    <td className="py-1.5 pr-4 text-right font-mono">
                      {fmt(el.ultima)}
                    </td>
                    <td className="py-1.5 pr-4 text-right font-mono">
                      {el.cimentacion
                        ? `${fmt(el.cimentacion.lado)} × ${fmt(el.cimentacion.lado)} m`
                        : "—"}
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <Link
                        href={urlPrellenado("/civil/zapata", {
                          carga: el.servicio,
                          cargaUltima: el.ultima,
                          qa: entrada.capacidadSuelo,
                        })}
                        className="enlace"
                      >
                        Zapata
                      </Link>
                      {" · "}
                      <Link
                        href={urlPrellenado("/civil/columna", {
                          carga: el.ultima,
                        })}
                        className="enlace"
                      >
                        Columna
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-sm text-zinc-500">
              «Zapata» abre el diseño de la zapata con la carga de servicio, la
              última
              {entrada.capacidadSuelo !== undefined ? " y la qa" : ""} de ese
              elemento; «Columna» abre el diseño de la columna con la carga
              última como Pu.
            </p>
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && <Graficas especs={graficasCargas(entrada, calculo.r)} />}

      {calculo.ok && (
        <PasoAPaso>
          {() => (
            <MemoriaCargas
              m={registroPrevio("cargas", {
                formulario: f,
                proyecto: f.project,
                entrada,
                resultado: calculo.r,
              })}
            />
          )}
        </PasoAPaso>
      )}

      <PieGenerar
        folio={folio}
        creditos={creditos}
        pendiente={pendiente}
        error={aviso ?? error}
        onGenerar={generar}
      />
    </div>
  );
}

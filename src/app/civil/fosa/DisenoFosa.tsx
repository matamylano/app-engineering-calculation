"use client";

import { useMemo, useState } from "react";
import { disenarFosa, type ResultadoFosa } from "@/calc/drenaje/fosa";
import {
  ANCHO_ZANJA,
  LARGO_MAXIMO_ZANJA,
  SEPARACION_POZOS,
} from "@/calc/drenaje/tablas";
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
import { EJEMPLOS_FOSA, revisionesFosa } from "@/lib/revision/fosa";
import { registroPrevio } from "@/lib/revision/previa";
import { cumpleRevision } from "@/lib/revision/tipos";
import MemoriaFosa from "./MemoriaFosa";
import { graficasFosa } from "@/lib/graficas/agua";
import { useGuardarMemoria } from "@/components/useGuardarMemoria";
import {
  entradaFosa,
  FORMULARIO_FOSA_INICIAL,
  type FormularioFosa,
} from "@/lib/estudios/fosa";
import type { ProjectInfo } from "@/lib/estudios/proyecto";

const DISPOSICIONES = [
  { value: "zanjas", label: "Zanjas de infiltración" },
  { value: "pozo", label: "Pozo de absorción" },
];
const METODOS_TRAMPA = [
  { value: "personas", label: "Por personas" },
  { value: "gasto", label: "Por gasto del fregadero" },
];
const LIMPIEZAS = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: n === 1 ? "Cada año" : `Cada ${n} años`,
}));

interface Props {
  folio?: string;
  inicial?: FormularioFosa;
  creditos: number | null;
}

export default function DisenoFosa({ folio, inicial, creditos }: Props) {
  // Las memorias anteriores no traen las opciones nuevas: se completan con los valores de omisión.
  const [f, setF] = useState<FormularioFosa>({
    ...FORMULARIO_FOSA_INICIAL,
    ...inicial,
  });
  const [aviso, setAviso] = useState<string | null>(null);
  const { guardar, pendiente, error } = useGuardarMemoria<FormularioFosa>(
    "fosa",
    folio,
    setF,
  );

  const setP = (k: keyof ProjectInfo) => (v: string) =>
    setF((p) => ({ ...p, project: { ...p.project, [k]: v } }));
  const set = (k: Exclude<keyof FormularioFosa, "project">) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const calculo = useMemo(():
    | { ok: true; r: ResultadoFosa }
    | { ok: false; error: string } => {
    try {
      return { ok: true, r: disenarFosa(entradaFosa(f)) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [f]);
  const revisiones = calculo.ok
    ? revisionesFosa(entradaFosa(f), calculo.r)
    : [];

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

  const falla = revisiones.find((r) => !cumpleRevision(r));
  const veredicto = calculo.ok
    ? {
        cumple: calculo.r.cumple,
        texto: calculo.r.cumple
          ? `Fosa de ${fmt(calculo.r.volumen, 0)} L, ${fmt(calculo.r.medidas.ancho)} × ${fmt(calculo.r.medidas.largo)} × ${f.profundidad} m; ${
              calculo.r.pozo
                ? `${calculo.r.pozo.cantidad} pozo${calculo.r.pozo.cantidad === 1 ? "" : "s"} de absorción`
                : `${fmt(calculo.r.campo.longitud, 1)} m de zanja`
            }.`
          : `No pasa: ${falla ? `${falla.nombre.toLowerCase()}, ${fmt(falla.actuante, falla.decimales ?? 2)} contra ${fmt(falla.limite, falla.decimales ?? 2)} ${falla.unidad}` : (calculo.r.problemas[0] ?? "revisa los datos")}.`,
      }
    : { cumple: false, texto: calculo.error };

  return (
    <div className="mt-8 grid gap-6">
      <EjemplosPrueba
        ejemplos={EJEMPLOS_FOSA}
        onUsar={(v) => setF((p) => ({ ...p, ...v }))}
      />

      <Section title="Datos de la obra">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            type="text"
            label="Obra"
            value={f.project.obra}
            onChange={setP("obra")}
            placeholder="Casa de campo"
          />
          <Field
            type="text"
            label="Ubicación"
            value={f.project.ubicacion}
            onChange={setP("ubicacion")}
            placeholder="Predio, municipio, estado"
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

      <Section title="1. Uso">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Habitantes"
            value={f.habitantes}
            onChange={set("habitantes")}
          />
          <Field
            label="Aportación de aguas negras"
            unit="L/hab/día"
            value={f.aportacion}
            onChange={set("aportacion")}
          />
          <Select
            label="Limpieza de lodos"
            value={f.limpieza}
            options={LIMPIEZAS}
            onChange={set("limpieza")}
          />
          <Field
            label="Temperatura media del mes más frío"
            unit="°C"
            value={f.temperatura}
            onChange={set("temperatura")}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          La aportación suele tomarse como el 80 % de la dotación de agua.
        </p>
      </Section>

      <Section title="2. Fosa y terreno">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Profundidad útil de la fosa"
            unit="m"
            value={f.profundidad}
            onChange={set("profundidad")}
          />
          <Field
            label="Tasa de aplicación del suelo"
            unit="L/m²/día"
            value={f.tasaAplicacion}
            onChange={set("tasaAplicacion")}
          />
          <Select
            label="El agua tratada va a"
            value={f.disposicion}
            options={DISPOSICIONES}
            onChange={set("disposicion")}
          />
          {f.disposicion === "pozo" && (
            <>
              <Field
                label="Diámetro del pozo"
                unit="m"
                value={f.diametroPozo}
                onChange={set("diametroPozo")}
              />
              <Field
                label="Profundidad útil máxima de cada pozo"
                unit="m"
                value={f.profundidadMaximaPozo}
                onChange={set("profundidadMaximaPozo")}
              />
            </>
          )}
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          La tasa de aplicación sale de la prueba de percolación del terreno.
          {f.disposicion === "pozo" &&
            " El pozo de absorción conviene cuando hay poco terreno o la capa permeable está honda; el fondo debe quedar lejos del nivel freático."}
        </p>
      </Section>

      <Section title="3. Trampa de grasas (opcional)">
        <Check
          label="Calcular la trampa de grasas de la cocina"
          checked={f.trampa === "si"}
          onChange={(v) => set("trampa")(v ? "si" : "")}
        />
        {f.trampa === "si" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Select
              label="Método"
              value={f.metodoTrampa}
              options={METODOS_TRAMPA}
              onChange={set("metodoTrampa")}
            />
            {f.metodoTrampa === "gasto" && (
              <>
                <Field
                  label="Gasto del fregadero"
                  unit="L/s"
                  value={f.gastoFregadero}
                  onChange={set("gastoFregadero")}
                />
                <Field
                  label="Tiempo de retención"
                  unit="min"
                  value={f.retencionTrampa}
                  onChange={set("retencionTrampa")}
                />
              </>
            )}
          </div>
        )}
        <p className="mt-2 text-sm text-zinc-500">
          Separa la grasa del agua de la cocina antes de que llegue a la fosa;
          alarga la vida del campo de infiltración.
        </p>
      </Section>

      <Section title="4. Mantenimiento (opcional)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            type="text"
            label="Mes de arranque de la fosa"
            value={f.inicio}
            onChange={set("inicio")}
            placeholder="AAAA-MM, por ejemplo 2026-10"
          />
          <Field
            label="Precio de un desazolve"
            unit="$"
            value={f.costoDesazolve}
            onChange={set("costoDesazolve")}
            placeholder="Opcional"
          />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Con el mes de arranque se fechan los siguientes desazolves; con el
          precio del servicio se calcula lo que cuesta al año.
        </p>
      </Section>

      <Section title="Resultados">
        {calculo.ok ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <table className="w-full text-sm">
              <tbody>
                <ResultRow
                  label="Contribución diaria"
                  value={`${fmt(calculo.r.contribucion, 0)} L`}
                />
                <ResultRow
                  label="Tiempo de retención"
                  value={`${fmt(calculo.r.retencion)} días`}
                />
                <ResultRow
                  label="Volumen útil"
                  value={`${fmt(calculo.r.volumen, 0)} L`}
                />
                <ResultRow
                  label="Medidas interiores"
                  value={`${fmt(calculo.r.medidas.ancho)} × ${fmt(calculo.r.medidas.largo)} × ${f.profundidad} m`}
                />
                <ResultRow
                  label="Biodigestor equivalente"
                  value={
                    calculo.r.biodigestor
                      ? `${fmt(calculo.r.biodigestor, 0)} L`
                      : "más de uno"
                  }
                />
              </tbody>
            </table>
            <table className="w-full text-sm">
              <tbody>
                <ResultRow
                  label="Área de infiltración"
                  value={`${fmt(calculo.r.campo.area, 1)} m²`}
                />
                {calculo.r.pozo ? (
                  <>
                    <ResultRow
                      label="Profundidad de pared que se necesita"
                      value={`${fmt(calculo.r.pozo.profundidadTotal)} m`}
                    />
                    <ResultRow
                      label="Pozos de absorción"
                      value={`${calculo.r.pozo.cantidad} de ${fmt(calculo.r.pozo.diametro)} m × ${fmt(calculo.r.pozo.profundidad, 1)} m útiles`}
                    />
                    <ResultRow
                      label="Separación libre entre pozos"
                      value={`${fmt(SEPARACION_POZOS * calculo.r.pozo.diametro, 1)} m o más`}
                    />
                  </>
                ) : (
                  <>
                    <ResultRow
                      label={`Zanja de ${fmt(ANCHO_ZANJA)} m de ancho`}
                      value={`${fmt(calculo.r.campo.longitud, 1)} m`}
                    />
                    <ResultRow
                      label={`Zanjas de hasta ${LARGO_MAXIMO_ZANJA} m`}
                      value={`${calculo.r.campo.zanjas}`}
                    />
                  </>
                )}
              </tbody>
            </table>
            {calculo.r.trampa && (
              <table className="w-full text-sm">
                <tbody>
                  <ResultRow
                    label="Trampa de grasas"
                    value={`${fmt(calculo.r.trampa.volumen, 0)} L`}
                  />
                  <ResultRow
                    label="Medidas interiores"
                    value={`${fmt(calculo.r.trampa.ancho)} × ${fmt(calculo.r.trampa.largo)} × ${fmt(calculo.r.trampa.tirante)} m`}
                  />
                </tbody>
              </table>
            )}
            {calculo.r.mantenimiento && (
              <table className="w-full text-sm">
                <tbody>
                  <ResultRow
                    label="Lodo al momento del desazolve"
                    value={`${fmt(calculo.r.mantenimiento.lodos, 0)} L (${fmt(calculo.r.mantenimiento.fraccion * 100, 0)} %)`}
                  />
                  <ResultRow
                    label="Desazolve"
                    value={
                      calculo.r.mantenimiento.periodo === 1
                        ? "cada año"
                        : `cada ${calculo.r.mantenimiento.periodo} años`
                    }
                  />
                  {calculo.r.mantenimiento.fechas.length > 0 && (
                    <ResultRow
                      label="Próximos desazolves"
                      value={calculo.r.mantenimiento.fechas.join(", ")}
                    />
                  )}
                  {calculo.r.mantenimiento.costoAnual !== undefined && (
                    <ResultRow
                      label="Costo anual equivalente"
                      value={`$${fmt(calculo.r.mantenimiento.costoAnual, 0)}`}
                    />
                  )}
                </tbody>
              </table>
            )}
            {!calculo.r.cumple && (
              <div className="lg:col-span-2">
                <ErrorText>
                  La fosa no pasa: {calculo.r.problemas.join("; ")}.
                </ErrorText>
              </div>
            )}
          </div>
        ) : (
          <ErrorText>{calculo.error}</ErrorText>
        )}
      </Section>

      {calculo.ok && <PanelRevision revisiones={revisiones} />}

      {calculo.ok && (
        <Graficas especs={graficasFosa(entradaFosa(f), calculo.r)} />
      )}

      {calculo.ok && (
        <PasoAPaso>
          {() => (
            <MemoriaFosa
              m={registroPrevio("fosa", {
                formulario: f,
                proyecto: f.project,
                entrada: entradaFosa(f),
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
        veredicto={veredicto}
      />
    </div>
  );
}

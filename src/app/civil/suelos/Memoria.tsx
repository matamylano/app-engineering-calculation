import { graficasSuelos } from "@/lib/graficas/suelos-cargas";
import type { SoilStudyInput, SoilStudyResult } from "@/calc/soils/study";
import { fromKNm3, fromKPa, type UnitSystem } from "@/calc/units";
import { fmt } from "@/components/form";
import { blank, H, HojaFirma, Rows, ZONA, AnexoGraficas } from "../MemoriaComun";
import type { ProjectInfo } from "@/lib/estudios/suelos";
import type { DatosSuelos, FirmaMemoria, RegistroMemoria } from "@/lib/servidor/tipos";
import TablaDisenoSuelos from "./TablaDisenoSuelos";

export interface MemoriaSnapshot {
  folio: string;
  date: string;
  project: ProjectInfo;
  units: UnitSystem;
  input: SoilStudyInput;
  result: SoilStudyResult;
  /** Firma del ingeniero de la suite, cuando ya la aprobó. */
  firma?: FirmaMemoria;
}

export const snapshotDe = (m: RegistroMemoria): MemoriaSnapshot => {
  const d = m.datos as DatosSuelos;
  return {
    folio: m.folio,
    date: m.firma?.aprobadaEn ?? m.actualizadaEn,
    project: d.proyecto,
    units: d.unidades,
    input: d.entrada,
    result: d.resultado,
    firma: m.firma,
  };
};

const SHAPE_NAME = { corrida: "corrida", cuadrada: "cuadrada", circular: "circular" } as const;

const WATER_CASE = {
  "sin-efecto": "El nivel freático está a más de Df + B y no afecta la capacidad de carga.",
  "sobre-desplante":
    "El nivel freático está sobre el desplante: q se calcula con el peso sumergido bajo el NF y el término de Nγ usa γ' = γsat − γw.",
  "bajo-desplante":
    "El nivel freático está entre Df y Df + B: el término de Nγ usa γ̄ = γ' + (Dw − Df)/B · (γ − γ').",
} as const;


export default function Memoria({ snapshot }: { snapshot: MemoriaSnapshot }) {
  const { folio, date, project, units, input, result, firma } = snapshot;
  if (!result.sucs.ok || !result.bearing.ok || !result.settlement.ok) return null;
  const sucs = result.sucs.value;
  const b = result.bearing.value;
  const s = result.settlement.value;
  const S = units.stress;
  const st = (kPa: number, d = 2) => `${fmt(fromKPa(kPa, S), d)} ${S}`;
  const wt = (kN: number) => `${fmt(fromKNm3(kN, units.unitWeight))} ${units.unitWeight}`;
  const cm = (m: number) => `${fmt(m * 100)} cm`;
  const shape = SHAPE_NAME[input.bearing.shape];
  const fecha = new Date(date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: ZONA });
  const sc = input.bearing.shape === "corrida" ? "1.0" : "1.3";
  const sg = { corrida: "0.5", cuadrada: "0.4", circular: "0.3" }[input.bearing.shape];
  // Las memorias viejas no traen la revisión del asentamiento ni la tabla de diseño.
  const revisa = s.allowable !== undefined;
  const tabla = result.designTable;
  const nConclusiones = tabla ? 6 : 5;

  return (
    <article className="memoria rounded-2xl border border-zinc-200 bg-white p-6 text-black shadow-elevada sm:p-10">
      <header className="border-b-2 border-black pb-3">
        <p className="text-xs uppercase tracking-wide">Memoria de cálculo</p>
        <h2 className="text-2xl font-semibold">Estudio de mecánica de suelos</h2>
        <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          <p>
            <b>Obra:</b> {blank(project.obra)}
          </p>
          <p>
            <b>Folio:</b> {folio}
          </p>
          <p>
            <b>Ubicación:</b> {blank(project.ubicacion)}
          </p>
          <p>
            <b>Fecha:</b> {fecha}
          </p>
          <p>
            <b>Cliente:</b> {blank(project.cliente)}
          </p>
        </div>
      </header>

      <H>1. Alcance y normas</H>
      <p className="mt-2 text-sm">
        Esta memoria clasifica el suelo de desplante, determina la capacidad de carga de la cimentación y estima
        sus asentamientos, a partir de los datos de laboratorio y de campo proporcionados por el cliente. Se
        aplican las Normas Técnicas Complementarias para Diseño y Construcción de Cimentaciones (CDMX, 2023),
        la norma ASTM D2487 (SUCS), la ecuación de capacidad de carga de Terzaghi (1943) con Nγ de Kumbhojkar
        (1993), la teoría elástica para el asentamiento inmediato y la consolidación unidimensional de Terzaghi
        con distribución de esfuerzos 2:1.
      </p>

      <H>2. Clasificación del suelo</H>
      <Rows
        rows={[
          ["Pasa la malla No. 200", `${fmt(input.sucs.passingNo200, 1)} %`],
          ["Pasa la malla No. 4", `${fmt(input.sucs.passingNo4, 1)} %`],
          [
            "Límites líquido / plástico",
            input.sucs.liquidLimit === undefined
              ? "No plástico"
              : `${fmt(input.sucs.liquidLimit, 1)} % / ${fmt(input.sucs.plasticLimit ?? 0, 1)} %`,
          ],
          ["Índice de plasticidad, IP", fmt(sucs.plasticityIndex, 1)],
          ["Grava / arena / finos", `${fmt(sucs.gravel, 1)} / ${fmt(sucs.sand, 1)} / ${fmt(sucs.fines, 1)} %`],
          ["Clasificación SUCS", `${sucs.symbol}, ${sucs.name.toLowerCase()}`],
        ]}
      />

      <H>3. Capacidad de carga</H>
      <p className="mt-2 text-sm">
        Zapata {shape}, falla por corte {input.bearing.failureMode === "local" ? "local" : "general"}:
      </p>
      <p className="mt-1 text-center font-mono text-sm">
        qu = {sc}·c·Nc + q·Nq + {sg}·γ·B·Nγ
      </p>
      <Rows
        rows={[
          ["Cohesión usada, c", st(b.cohesionUsed)],
          ["Ángulo de fricción usado, φ", `${fmt(b.frictionAngleUsed)}°`],
          ["Peso volumétrico, γ", wt(input.bearing.unitWeight)],
          ["Profundidad de desplante, Df", `${fmt(input.bearing.depth)} m`],
          [input.bearing.shape === "circular" ? "Diámetro, B" : "Ancho, B", `${fmt(input.bearing.width)} m`],
          ["Factores Nc / Nq / Nγ", `${fmt(b.factors.Nc)} / ${fmt(b.factors.Nq)} / ${fmt(b.factors.Ngamma)}`],
          ["Esfuerzo efectivo al desplante, q", st(b.surcharge)],
          ["γ usado en el término de Nγ", wt(b.unitWeightBelow)],
          ["Término de cohesión", st(b.terms.cohesion)],
          ["Término de sobrecarga", st(b.terms.surcharge)],
          ["Término de peso propio", st(b.terms.selfWeight)],
          ["Capacidad de carga última, qu", st(b.ultimate)],
          ["Factor de seguridad, FS", fmt(b.safetyFactor, 1)],
          ["Capacidad de carga admisible, qa", `${st(b.allowable)} (${fmt(fromKPa(b.allowable, "kg/cm²"))} kg/cm²)`],
        ]}
      />
      <p className="mt-2 text-sm">
        {input.bearing.waterTable
          ? `Nivel freático a ${fmt(input.bearing.waterTable.depth)} m. ${WATER_CASE[b.waterTableCase]}`
          : "No se reporta nivel freático."}
        {input.bearing.failureMode === "local" && " Por falla local se usan c' = 2/3·c y tan φ' = 2/3·tan φ."}
      </p>

      <H>4. Asentamientos</H>
      <p className="mt-2 text-sm">
        Asentamiento inmediato de cimentación rígida: Se = q·B·(1 − ν²)·Ir / Es.
        {input.bearing.shape === "corrida" && " La zapata corrida se considera rectangular con L/B = 10."}
      </p>
      <Rows
        rows={[
          ["Presión de contacto, q", st(s.pressure)],
          ["Módulo de elasticidad, Es", st(input.settlement.elasticModulus, 0)],
          ["Relación de Poisson, ν", fmt(input.settlement.poisson)],
          ["Factor de influencia, Ir", fmt(s.immediate.influence, 3)],
          ["Asentamiento inmediato", cm(s.immediate.settlement)],
          ...(s.consolidation && input.settlement.consolidation
            ? ([
                ["Estrato de arcilla", `H = ${fmt(input.settlement.consolidation.thickness)} m, ${s.consolidation.state}`],
                ["Incremento de esfuerzo (2:1), Δσ", st(s.consolidation.increment)],
                ["Esfuerzo efectivo inicial, σ'0", st(input.settlement.consolidation.initialStress)],
                ["Asentamiento por consolidación", cm(s.consolidation.settlement)],
              ] as [string, string][])
            : []),
          ["Asentamiento total estimado", cm(s.total)],
          ...(revisa
            ? ([
                ["Asentamiento total admisible", cm(s.allowable as number)],
                ["Revisión", s.meetsAllowable ? "Cumple (total ≤ admisible)" : "NO CUMPLE (total > admisible)"],
              ] as [string, string][])
            : []),
        ]}
      />
      {revisa && !s.meetsAllowable && (
        <p className="mt-2 border border-black px-3 py-2 text-sm">
          <b>Advertencia:</b> el asentamiento total estimado rebasa el admisible. Se recomienda ampliar el cimiento
          para bajar la presión de contacto, o mejorar el suelo de desplante (sustitución o compactación), y volver a
          revisar.
        </p>
      )}

      {tabla && (
        <>
          <H>5. Tabla de diseño</H>
          <p className="mt-2 text-sm">
            Capacidad de carga admisible para otros anchos y profundidades de desplante de la zapata {shape}, con los
            mismos parámetros del suelo y FS = {fmt(b.safetyFactor, 1)}. Al cambiar el ancho o el desplante deben
            revisarse de nuevo los asentamientos.
          </p>
          <TablaDisenoSuelos
            tabla={tabla}
            unidad={S}
            ancho={input.bearing.width}
            profundidad={input.bearing.depth}
            circular={input.bearing.shape === "circular"}
            papel
          />
        </>
      )}

      <H>{nConclusiones}. Conclusiones</H>
      <p className="mt-2 text-sm">
        El suelo de desplante se clasifica como {sucs.symbol} ({sucs.name.toLowerCase()}). Para una zapata {shape}{" "}
        de {fmt(input.bearing.width)} m desplantada a {fmt(input.bearing.depth)} m, se obtiene una capacidad de carga
        admisible de <b>{st(b.allowable)}</b> ({fmt(fromKPa(b.allowable, "kg/cm²"))} kg/cm²) con un factor de
        seguridad de {fmt(b.safetyFactor, 1)}, y un asentamiento total estimado de <b>{cm(s.total)}</b>
        {revisa &&
          (s.meetsAllowable
            ? `, menor o igual que el admisible de ${cm(s.allowable as number)}`
            : `, que NO CUMPLE con el admisible de ${cm(s.allowable as number)}; se recomienda ampliar el cimiento o mejorar el suelo`)}
        .
      </p>
      <p className="mt-2 text-sm">
        Los resultados dependen de que los datos proporcionados representen el subsuelo del predio. Si durante la
        excavación se encuentran condiciones distintas, el responsable debe revisar este estudio.
      </p>

      <AnexoGraficas especs={graficasSuelos(input, result, units)} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

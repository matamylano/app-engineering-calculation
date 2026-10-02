import { graficasLosa } from "@/lib/graficas/concreto";
import { CARGAS_VIVAS, INCREMENTO_COLADO, INCREMENTO_MORTERO } from "@/calc/cargas/bajada";
import { FRACCION_VIVA_SOSTENIDA } from "@/calc/concreto/deflexiones";
import { BASTON, ESPESOR_MINIMO, partidasLosa, type Armado } from "@/calc/concreto/losa";
import { preciosDeFormulario, presupuesto } from "@/calc/obra/cuantificacion";
import TablaPresupuesto from "@/components/obra/TablaPresupuesto";
import { FR_CORTANTE, FR_FLEXION } from "@/calc/concreto/ntc";
import { anclajeGancho, APOYOS, FACTOR_MUERTA, FACTOR_VIVA, PESO_CONCRETO } from "@/calc/concreto/viga";
import { fmt } from "@/components/form";
import type { DatosLosa, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";

const coef = (c: number) => (c ? `wu L² / ${fmt(c, c % 1 ? 1 : 0)}` : "sin momento");

/** Presupuesto del tablero; null en memorias viejas, sin largo o con precios no válidos. */
function presupuestoMemoria({ formulario, entrada, resultado }: DatosLosa) {
  if (formulario.piezas === undefined || !formulario.largo?.trim()) return null;
  try {
    const { piezas, precios } = preciosDeFormulario(formulario);
    const largo = Number(formulario.largo);
    return { p: presupuesto(partidasLosa(entrada, resultado, largo), precios, piezas), largo, area: entrada.claro * largo * piezas };
  } catch {
    return null;
  }
}

export default function MemoriaLosa({ m }: { m: RegistroMemoria }) {
  const datos = m.datos as DatosLosa;
  const { formulario, proyecto: project, entrada: e, resultado: r } = datos;
  // Memorias anteriores: sin destino, flechas ni cuantificación.
  const uso = formulario.uso ? CARGAS_VIVAS[formulario.uso] : undefined;
  const fl = r.deflexion;
  const obra = presupuestoMemoria(datos);
  const nConclusiones = obra ? 8 : 7;
  const { firma, folio } = m;
  const apoyo = APOYOS[e.apoyo];
  const nombre = formulario.elemento.trim();
  const armado = (a: Armado) => `#${e.varilla} @ ${fmt(a.separacion, 1)} cm (${fmt(a.areaColocada)} cm²/m)`;
  const espesorOk = e.h >= r.espesorMinimo;

  return (
    <article className="memoria rounded-2xl border border-zinc-200 bg-white p-6 text-black shadow-elevada sm:p-10">
      <header className="border-b-2 border-black pb-3">
        <p className="text-xs uppercase tracking-wide">Memoria de cálculo</p>
        <h2 className="text-2xl font-semibold">Losa maciza {nombre}</h2>
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
            <b>Fecha:</b> {fechaLarga(firma?.aprobadaEn ?? m.actualizadaEn)}
          </p>
          <p>
            <b>Cliente:</b> {blank(project.cliente)}
          </p>
        </div>
      </header>

      <H>1. Alcance y normas</H>
      <p className="mt-2 text-sm">
        Se diseña una losa maciza de concreto reforzado que trabaja en una dirección, como una franja de 1 m de ancho
        con carga uniforme. Se aplican las Normas Técnicas Complementarias sobre Criterios y Acciones (factores de
        carga {FACTOR_MUERTA} y {FACTOR_VIVA}, grupo B) y para Diseño y Construcción de Estructuras de Concreto (CDMX):
        FR = {FR_FLEXION} en flexión y {FR_CORTANTE} en cortante, acero mínimo por flexión y por cambios
        volumétricos, y separación máxima de 50 cm o 3.5 h.
      </p>

      <H>2. Datos</H>
      <Rows
        rows={[
          ["Apoyos", apoyo.nombre],
          ["Claro corto libre, L", `${fmt(e.claro)} m`],
          ["Espesor h; recubrimiento libre", `${fmt(e.h, 0)} cm; ${fmt(e.recubrimiento, 1)} cm`],
          ["Concreto f'c; acero fy", `${fmt(e.fc, 0)} kg/cm²; ${fmt(e.fy, 0)} kg/cm²`],
        ]}
      />

      <H>3. Cargas</H>
      <Rows
        rows={[
          [`Peso propio, h · ${fmt(PESO_CONCRETO, 1)} t/m³`, `${fmt(r.pesoPropio, 0)} kg/m²`],
          ...(e.incrementos
            ? [[`Incrementos por colado y mortero (NTC)`, `${INCREMENTO_COLADO + INCREMENTO_MORTERO} kg/m²`] as [string, string]]
            : []),
          ["Acabados, muros e instalaciones", `${fmt(e.muerta, 0)} kg/m²`],
          ["Carga muerta total, CM", `${fmt(r.muertaTotal, 0)} kg/m²`],
          ...(uso ? [["Destino (carga viva máxima Wm de las NTC)", uso.nombre] as [string, string]] : []),
          ["Carga viva, CV", `${fmt(e.viva, 0)} kg/m²`],
          [`Carga última, ${FACTOR_MUERTA} CM + ${FACTOR_VIVA} CV`, `${fmt(r.cargaUltima, 0)} kg/m²`],
        ]}
      />

      <H>4. Flexión</H>
      <p className="mt-2 text-sm">
        Peralte efectivo d = h − r − db / 2 = {fmt(r.d, 2)} cm. Acero mínimo {fmt(r.aceroMinimo)} cm²/m; separación
        máxima {fmt(r.separacionMaxima, 1)} cm.
      </p>
      <Rows
        rows={[
          [`Momento negativo, ${coef(apoyo.negativo)}`, `${fmt(r.negativo.momento)} t·m/m`],
          [`Momento positivo, ${coef(apoyo.positivo)}`, `${fmt(r.positivo.momento)} t·m/m`],
          ["Acero requerido arriba; abajo", `${fmt(r.negativo.requerido)}; ${fmt(r.positivo.requerido)} cm²/m`],
          ["Armado arriba (en apoyos)", armado(r.negativo)],
          ["Armado abajo", armado(r.positivo)],
          ["Acero por temperatura (dirección larga)", armado(r.temperatura)],
        ]}
      />

      <H>5. Cortante</H>
      <p className="mt-2 text-sm">
        Vu a d del apoyo = {fmt(r.cortante.actuante)} t/m; VcR = 0.5 FR √f&apos;c b d = {fmt(r.cortante.resistente)} t/m.{" "}
        <b>{r.cortante.cumple ? "Cumple" : "No cumple"}</b> sin estribos.
      </p>

      <H>6. Deflexiones</H>
      <p className="mt-2 text-sm">
        Espesor mínimo para omitir el cálculo de deflexiones: L / {ESPESOR_MINIMO[e.apoyo]} ={" "}
        {fmt(r.espesorMinimo, 1)} cm.{" "}
        {espesorOk
          ? `El espesor de ${fmt(e.h, 0)} cm lo cumple.`
          : fl
            ? `El espesor de ${fmt(e.h, 0)} cm es menor, por lo que la revisión siguiente rige.`
            : `El espesor de ${fmt(e.h, 0)} cm es menor; las deflexiones deben revisarse por separado.`}
      </p>
      {fl && (
        <>
          <p className="mt-2 text-sm">
            Franja de 1 m con cargas de servicio w = {fmt(r.muertaTotal + e.viva, 0)} kg/m², Ec = 14 000 √f&apos;c ={" "}
            {fmt(fl.ec, 0)} kg/cm² y n = {fmt(fl.n)}. Inercia efectiva de Branson, Ie = (Mag / Ma)³ Ig + [1 − (Mag /
            Ma)³] Iag ≤ Ig, con Mag = 2 √f&apos;c Ig / (h / 2) e Iag de la sección agrietada con el acero de tensión
            {apoyo.negativo && apoyo.positivo ? "; en tramos continuos se promedia (Ie1 + Ie2 + 2 Iec) / 4, tomando en el extremo discontinuo la del centro" : ""}
            . Flecha inmediata{" "}
            {e.apoyo === "voladizo"
              ? "en la punta w L⁴ / (8 Ec Ie)"
              : "al centro 5 L² / (48 Ec Ie) · [Mc − 0.1 (M1 + M2)], con los momentos de servicio de los mismos coeficientes"}
            . La diferida es la inmediata bajo carga sostenida (carga muerta total y{" "}
            {fmt(100 * (e.vivaSostenida ?? FRACCION_VIVA_SOSTENIDA), 0)} % de la viva) por 2 / (1 + 50 p&apos;), con p&apos; = 0.
            Límite de las NTC Criterios y Acciones:{" "}
            {e.elementosFragiles ? "L / 480 + 0.3 cm (hay elementos no estructurales que se dañan)" : "L / 240 + 0.5 cm"}
            {e.apoyo === "voladizo" ? ", duplicado por ser voladizo" : ""}.
          </p>
          <Rows
            rows={[
              ["Ig; Mag", `${fmt(fl.ig, 0)} cm⁴/m; ${fmt(fl.mag)} t·m/m`],
              ["Iag al centro; en el apoyo", `${fmt(fl.iagCentro, 0)} cm⁴/m; ${fmt(fl.iagApoyo, 0)} cm⁴/m`],
              ["Ie usada", `${fmt(fl.ie, 0)} cm⁴/m`],
              ["Flecha inmediata", `${fmt(fl.inmediata)} cm`],
              [`Flecha diferida, ${fmt(fl.factorDiferido)} × ${fmt(fl.inmediataSostenida)} cm`, `${fmt(fl.diferida)} cm`],
              ["Flecha total; límite", `${fmt(fl.total)} cm; ${fmt(fl.limite)} cm`],
            ]}
          />
          <p className="mt-1 text-sm">
            <b>{fl.cumple ? "Cumple" : "No cumple"}</b>
            {!fl.cumple && espesorOk
              ? ". Como el espesor cumple el mínimo, las NTC permiten omitir esta revisión; se recomienda aumentar el espesor."
              : "."}
          </p>
        </>
      )}

      {obra && (
        <>
          <H>7. Cuantificación y costo</H>
          <p className="mt-2 text-sm">
            Tablero de {fmt(e.claro)} × {fmt(obra.largo)} m (claro × largo){obra.p.piezas > 1 ? `, ${obra.p.piezas} tableros iguales` : ""}.
            Acero abajo corrido con gancho de 90° en cada apoyo (Ldh = 0.076 db fy / √f&apos;c, mínimo 8 db y 15 cm, más 12
            db: {fmt(anclajeGancho(e.varilla, e.fy, e.fc), 0)} cm por extremo);{" "}
            {e.apoyo === "voladizo"
              ? "acero arriba en todo el voladizo con gancho en el apoyo"
              : `bastones arriba en los dos apoyos de L / ${fmt(1 / BASTON, 0)} dentro del tablero más el gancho`}
            ; acero por temperatura corrido en el largo; cimbra de fondo. No incluye traslapes ni las vigas de apoyo.
          </p>
          <TablaPresupuesto p={obra.p} papel />
          {obra.p.total !== null && (
            <p className="mt-2 text-sm">
              Costo estimado por m² de losa: <b>{fmt(obra.p.total / obra.area, 0)} $/m²</b> ({fmt(obra.area, 1)} m²).
            </p>
          )}
        </>
      )}

      <H>{nConclusiones}. Conclusiones</H>
      <p className="mt-2 text-sm">
        La losa {nombre} se construye de <b>{fmt(e.h, 0)} cm</b> de espesor con concreto f&apos;c = {fmt(e.fc, 0)}{" "}
        kg/cm², <b>{armado(r.positivo)} abajo</b> en la dirección corta, <b>{armado(r.negativo)} arriba</b> en los
        apoyos y <b>{armado(r.temperatura)}</b> en la dirección larga, con {fmt(e.recubrimiento, 1)} cm de
        recubrimiento libre.
      </p>

      <AnexoGraficas especs={graficasLosa(e, r)} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

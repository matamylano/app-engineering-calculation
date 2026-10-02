import { graficasViga } from "@/lib/graficas/concreto";
import { FR_CORTANTE, FR_FLEXION } from "@/calc/concreto/ntc";
import { FRACCION_VIVA_SOSTENIDA } from "@/calc/concreto/deflexiones";
import { anclajeGancho, APOYOS, FACTOR_MUERTA, FACTOR_VIVA, partidasViga, PESO_CONCRETO } from "@/calc/concreto/viga";
import { preciosDeFormulario, presupuesto } from "@/calc/obra/cuantificacion";
import { fmt } from "@/components/form";
import TablaPresupuesto from "@/components/obra/TablaPresupuesto";
import { cargasTributarias } from "@/lib/estudios/viga";
import type { DatosViga, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";

const coef = (c: number) => (c ? `wu L² / ${fmt(c, c % 1 ? 1 : 0)}` : "sin momento");

/** Presupuesto de la memoria; null en memorias viejas (sin campos de obra) o si los precios no son válidos. */
function presupuestoMemoria({ formulario, entrada, resultado }: DatosViga) {
  if (formulario.piezas === undefined) return null;
  try {
    const { piezas, precios } = preciosDeFormulario(formulario);
    return presupuesto(partidasViga(entrada, resultado), precios, piezas);
  } catch {
    return null;
  }
}

export default function MemoriaViga({ m }: { m: RegistroMemoria }) {
  const datos = m.datos as DatosViga;
  const { formulario, proyecto: project, entrada: e, resultado: r } = datos;
  // Memorias anteriores: sin área tributaria, flechas ni cuantificación.
  const trib = cargasTributarias(formulario);
  const fl = r.deflexion;
  const obra = presupuestoMemoria(datos);
  const nObra = 7;
  const nConclusiones = obra ? 8 : 7;
  const { firma, folio } = m;
  const apoyo = APOYOS[e.apoyo];
  const nombre = formulario.elemento.trim();
  const armado = (l: typeof r.superior) => `${l.cantidad} varillas #${e.varilla} (${fmt(l.areaColocada)} cm²)`;
  const peralteOk = e.h >= r.peralteMinimo;

  return (
    <article className="memoria rounded-2xl border border-zinc-200 bg-white p-6 text-black shadow-elevada sm:p-10">
      <header className="border-b-2 border-black pb-3">
        <p className="text-xs uppercase tracking-wide">Memoria de cálculo</p>
        <h2 className="text-2xl font-semibold">Viga de concreto {nombre}</h2>
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
        Se diseña una viga rectangular de concreto reforzado con carga uniforme, con las cargas y la geometría que
        proporciona el cliente. Se aplican las Normas Técnicas Complementarias sobre Criterios y Acciones (factores
        de carga {FACTOR_MUERTA} y {FACTOR_VIVA}, grupo B) y para Diseño y Construcción de Estructuras de Concreto
        (CDMX): FR = {FR_FLEXION} en flexión y {FR_CORTANTE} en cortante, f&apos;&apos;c = 0.85 f&apos;c, acero
        mínimo 0.7 √f&apos;c / fy · b d y máximo 75 % del balanceado. Los momentos y cortantes se obtienen con
        coeficientes para vigas con carga uniforme según sus apoyos.
      </p>

      <H>2. Datos</H>
      <Rows
        rows={[
          ["Apoyos", apoyo.nombre],
          ["Claro libre, L", `${fmt(e.claro)} m`],
          ["Carga muerta (sin peso propio); viva", `${fmt(e.muerta)} t/m; ${fmt(e.viva)} t/m`],
          ["Sección b × h; recubrimiento libre", `${fmt(e.b, 0)} × ${fmt(e.h, 0)} cm; ${fmt(e.recubrimiento, 1)} cm`],
          ["Concreto f'c; acero fy", `${fmt(e.fc, 0)} kg/cm²; ${fmt(e.fy, 0)} kg/cm²`],
        ]}
      />

      <H>3. Cargas</H>
      {trib && (
        <p className="mt-2 text-sm">
          Las cargas por metro se obtienen del ancho tributario de la losa, a = {fmt(Number(formulario.anchoTributario))} m:
          carga muerta = a · {fmt(Number(formulario.muertaArea), 0)} kg/m²
          {Number(formulario.muros) > 0 ? ` + ${fmt(Number(formulario.muros))} t/m de muros` : ""} = {fmt(trib.muerta, 3)} t/m;
          carga viva = a · {fmt(Number(formulario.vivaArea), 0)} kg/m² = {fmt(trib.viva, 3)} t/m (carga viva máxima Wm de
          las NTC Criterios y Acciones para el destino de la losa).
        </p>
      )}
      <p className="mt-2 text-sm">
        Peso propio = b · h · {fmt(PESO_CONCRETO, 1)} t/m³ = {fmt(r.pesoPropio, 3)} t/m. Carga última wu ={" "}
        {FACTOR_MUERTA} ({fmt(e.muerta)} + {fmt(r.pesoPropio, 3)}) + {FACTOR_VIVA} · {fmt(e.viva)} ={" "}
        <b>{fmt(r.cargaUltima)} t/m</b>. Peralte efectivo d = h − r − d estribo − db / 2 = {fmt(r.d, 1)} cm.
      </p>

      <H>4. Flexión</H>
      <Rows
        rows={[
          [`Momento negativo, ${coef(apoyo.negativo)}`, `${fmt(r.superior.momento)} t·m`],
          [`Momento positivo, ${coef(apoyo.positivo)}`, `${fmt(r.inferior.momento)} t·m`],
          ["Acero mínimo; máximo", `${fmt(r.aceroMinimo)} cm²; ${fmt(r.aceroMaximo)} cm²`],
          ["Acero requerido arriba; abajo", `${fmt(r.superior.requerido)} cm²; ${fmt(r.inferior.requerido)} cm²`],
          ["Armado arriba (en apoyos)", armado(r.superior)],
          ["Armado abajo (al centro del claro)", armado(r.inferior)],
        ]}
      />
      <p className="mt-1 text-xs">
        As = (f&apos;&apos;c b d / fy) (1 − √(1 − 2 Mu / (FR f&apos;&apos;c b d²))). Las varillas caben en una capa
        con separación libre de al menos 2.5 cm.
      </p>

      <H>5. Cortante</H>
      <p className="mt-2 text-sm">
        Cortante último a d de la cara del apoyo: Vu = {fmt(apoyo.cortante)} wu L / 2 − wu d ={" "}
        {fmt(r.cortante.actuante)} t. Resiste el concreto VcR = 0.5 FR √f&apos;c b d = {fmt(r.cortante.concreto)} t.
        Estribos de dos ramas #{e.estribo}: s = FR Av fy d / (Vu − VcR), sin pasar de{" "}
        {fmt(r.cortante.separacionMaxima, 1)} cm ni del estribo mínimo (Av ≥ 0.3 √f&apos;c b s / fy). Se colocan{" "}
        <b>
          @ {fmt(r.cortante.separacion, 1)} cm
        </b>
        .
      </p>

      <H>6. Deflexiones</H>
      <p className="mt-2 text-sm">
        Peralte mínimo para omitir el cálculo de deflexiones: L / {fmt(apoyo.peralte, 1)} ={" "}
        {fmt(r.peralteMinimo, 1)} cm.{" "}
        {peralteOk
          ? `El peralte de ${fmt(e.h, 0)} cm lo cumple.`
          : fl
            ? `El peralte de ${fmt(e.h, 0)} cm es menor, por lo que la revisión siguiente rige.`
            : `El peralte de ${fmt(e.h, 0)} cm es menor; las deflexiones deben revisarse por separado.`}
      </p>
      {fl && (
        <>
          <p className="mt-2 text-sm">
            Con cargas de servicio w = {fmt(e.muerta + r.pesoPropio + e.viva)} t/m, Ec = 14 000 √f&apos;c ={" "}
            {fmt(fl.ec, 0)} kg/cm² y n = Es / Ec = {fmt(fl.n)}. Inercia efectiva de Branson, Ie = (Mag / Ma)³ Ig + [1 −
            (Mag / Ma)³] Iag ≤ Ig, con Mag = 2 √f&apos;c Ig / (h / 2) e Iag de la sección agrietada transformada
            {apoyo.negativo && apoyo.positivo ? "; en tramos continuos se promedia (Ie1 + Ie2 + 2 Iec) / 4, tomando en el extremo discontinuo la del centro" : ""}
            . Flecha inmediata{" "}
            {e.apoyo === "voladizo"
              ? "en la punta w L⁴ / (8 Ec Ie)"
              : "al centro 5 L² / (48 Ec Ie) · [Mc − 0.1 (M1 + M2)], con los momentos de servicio de los mismos coeficientes"}
            . La diferida es la inmediata bajo carga sostenida (muerta, peso propio y{" "}
            {fmt(100 * (e.vivaSostenida ?? FRACCION_VIVA_SOSTENIDA), 0)} % de la viva) por 2 / (1 + 50 p&apos;). Límite de
            las NTC Criterios y Acciones:{" "}
            {e.elementosFragiles ? "L / 480 + 0.3 cm (hay elementos no estructurales que se dañan)" : "L / 240 + 0.5 cm"}
            {e.apoyo === "voladizo" ? ", duplicado por ser voladizo" : ""}.
          </p>
          <Rows
            rows={[
              ["Ig; Mag", `${fmt(fl.ig, 0)} cm⁴; ${fmt(fl.mag)} t·m`],
              ["Iag al centro; en el apoyo", `${fmt(fl.iagCentro, 0)} cm⁴; ${fmt(fl.iagApoyo, 0)} cm⁴`],
              ["Ie usada", `${fmt(fl.ie, 0)} cm⁴`],
              ["Flecha inmediata", `${fmt(fl.inmediata)} cm`],
              [`Flecha diferida, ${fmt(fl.factorDiferido)} × ${fmt(fl.inmediataSostenida)} cm`, `${fmt(fl.diferida)} cm`],
              ["Flecha total; límite", `${fmt(fl.total)} cm; ${fmt(fl.limite)} cm`],
            ]}
          />
          <p className="mt-1 text-sm">
            <b>{fl.cumple ? "Cumple" : "No cumple"}</b>
            {!fl.cumple && peralteOk
              ? ". Como el peralte cumple el mínimo, las NTC permiten omitir esta revisión; se recomienda aumentar el peralte o dar contraflecha."
              : "."}
          </p>
        </>
      )}

      {obra && (
        <>
          <H>{nObra}. Cuantificación y costo</H>
          <p className="mt-2 text-sm">
            Concreto del claro libre; varillas longitudinales corridas arriba y abajo con gancho de 90° en cada extremo
            (Ldh = 0.076 db fy / √f&apos;c, mínimo 8 db y 15 cm, más 12 db: {fmt(anclajeGancho(e.varilla, e.fy, e.fc), 0)} cm por
            extremo); estribos de dos ramas @ {fmt(r.cortante.separacion, 1)} cm en todo el claro, con ganchos de 135°;
            cimbra de fondo y dos costados de altura h. No incluye traslapes ni nudos.
          </p>
          <TablaPresupuesto p={obra} papel />
        </>
      )}

      <H>{nConclusiones}. Conclusiones</H>
      <p className="mt-2 text-sm">
        La viga {nombre} se construye de{" "}
        <b>
          {fmt(e.b, 0)} × {fmt(e.h, 0)} cm
        </b>{" "}
        con concreto f&apos;c = {fmt(e.fc, 0)} kg/cm², <b>{armado(r.superior)} arriba</b>,{" "}
        <b>{armado(r.inferior)} abajo</b> y{" "}
        <b>
          estribos #{e.estribo} @ {fmt(r.cortante.separacion, 1)} cm
        </b>
        , con {fmt(e.recubrimiento, 1)} cm de recubrimiento libre. Cumple por flexión y cortante{fl?.cumple ? " y por deflexiones" : ""}.
      </p>

      <AnexoGraficas especs={graficasViga(e, r)} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

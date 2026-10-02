import { graficasColumnaCompletas } from "@/lib/graficas/columna";
import {
  cuantificarColumna,
  GANCHO_ESTRIBO_DB,
  TRASLAPE_COLUMNA_DB,
} from "@/calc/concreto/columna";
import { preciosDeFormulario, presupuesto } from "@/calc/obra/cuantificacion";
import TablaPresupuesto from "@/components/obra/TablaPresupuesto";
import { CUANTIA_MAX_COLUMNA, CUANTIA_MIN_COLUMNA, FR_COMPRESION } from "@/calc/concreto/ntc";
import { fmt } from "@/components/form";
import type { DatosColumna, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";

/** Presupuesto de la memoria; null en memorias viejas (sin campos de obra) o si los precios no son válidos. */
function presupuestoMemoria({ formulario, entrada, resultado }: DatosColumna) {
  if (formulario.piezas === undefined) return null;
  try {
    const { piezas, precios } = preciosDeFormulario(formulario);
    return presupuesto(cuantificarColumna(entrada, resultado), precios, piezas);
  } catch {
    return null;
  }
}

export default function MemoriaColumna({ m }: { m: RegistroMemoria }) {
  const datos = m.datos as DatosColumna;
  const { formulario, proyecto: project, entrada: e, resultado: r } = datos;
  const { firma, folio } = m;
  const nombre = formulario.elemento.trim();
  // Las memorias viejas no tienen `biaxial` ni `caras`: se pintan como siempre.
  const bx = r.biaxial ?? null;
  const obra = presupuestoMemoria(datos);
  const armado =
    r.armado.caras === 4
      ? `${r.armado.cantidad} varillas #${r.armado.varilla} en las cuatro caras (${r.armado.porCaraB} en cada cara de ancho b y ${r.armado.porCaraH} en cada cara de ancho h, con las esquinas)`
      : `${r.armado.cantidad} varillas #${r.armado.varilla} (${r.armado.cantidad / 2} por cara)`;
  const estribos = `estribos #${r.estribos.varilla} @ ${fmt(r.estribos.separacion, 1)} cm`;

  return (
    <article className="memoria rounded-2xl border border-zinc-200 bg-white p-6 text-black shadow-elevada sm:p-10">
      <header className="border-b-2 border-black pb-3">
        <p className="text-xs uppercase tracking-wide">Memoria de cálculo</p>
        <h2 className="text-2xl font-semibold">Columna de concreto {nombre}</h2>
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
        Se diseña una columna rectangular de concreto reforzado con estribos, en un marco sin desplazamiento lateral,
        sujeta a carga axial y momento en {bx ? "las dos direcciones (flexión biaxial)" : "una dirección"}. Se aplican las Normas Técnicas Complementarias para Diseño y
        Construcción de Estructuras de Concreto (CDMX): FR = {FR_COMPRESION} en flexocompresión, bloque de esfuerzos
        con f&apos;&apos;c = 0.85 f&apos;c y deformación última del concreto de 0.003, excentricidad mínima de 0.05 h
        o 2 cm, amplificación de momentos por esbeltez y cuantía entre {fmt(CUANTIA_MIN_COLUMNA * 100, 0)} y{" "}
        {fmt(CUANTIA_MAX_COLUMNA * 100, 0)} %.{" "}
        {bx
          ? "El acero se reparte en las cuatro caras y la flexión biaxial se revisa con la fórmula de Bresler (carga recíproca)."
          : "El acero se reparte en las dos caras perpendiculares al momento."}
      </p>

      <H>2. Datos</H>
      <Rows
        rows={[
          ["Carga axial última, Pu", `${fmt(e.carga)} t`],
          [bx ? "Momento último mayor en la dirección de h, Mux" : "Momento último mayor, Mu", `${fmt(e.momento)} t·m`],
          ...(bx ? ([["Momento último mayor en la dirección de b, Muy", `${fmt(e.momentoB ?? 0)} t·m`]] as [string, string][]) : []),
          ["Altura libre", `${fmt(e.altura)} m`],
          ["Sección b × h; recubrimiento libre", `${fmt(e.b, 0)} × ${fmt(e.h, 0)} cm; ${fmt(e.recubrimiento, 1)} cm`],
          ["Concreto f'c; acero fy", `${fmt(e.fc, 0)} kg/cm²; ${fmt(e.fy, 0)} kg/cm²`],
        ]}
      />

      <H>3. Momento de diseño</H>
      <p className="mt-2 text-sm">
        Excentricidad mínima {fmt(r.excentricidadMinima, 1)} cm: Pu · e = {fmt(r.momentoMinimo)} t·m. Esbeltez kL/r ={" "}
        {fmt(r.esbeltez, 1)} con k = 1 y r = 0.3 h. Carga crítica Pc = π² EI / (kL)² = {fmt(r.cargaCritica, 1)} t, con
        EI = 0.4 Ec Ig / (1 + βd), Ec = 14 000 √f&apos;c y βd = 0.6. Factor de amplificación δ = Cm / (1 − Pu / 0.75 Pc) ={" "}
        {fmt(r.amplificacion, 3)}, con Cm = 1. Momento de diseño Mc = δ · máx(Mu, Pu · e) ={" "}
        <b>{fmt(r.momentoDiseno)} t·m</b>
        {bx ? " en la dirección de h" : ""}.
      </p>
      {bx && (
        <p className="mt-2 text-sm">
          En la dirección de b, con el momento de inercia h b³ / 12: excentricidad mínima {fmt(bx.excentricidadMinima, 1)}{" "}
          cm, Pc = {fmt(bx.cargaCritica, 1)} t, δ = {fmt(bx.amplificacion, 3)} y momento de diseño{" "}
          <b>{fmt(bx.momentoDiseno)} t·m</b>. La excentricidad mínima se aplica en las dos direcciones a la vez.
        </p>
      )}

      <H>4. Flexocompresión</H>
      <Rows
        rows={[
          ["Acero longitudinal", `${armado}, ${fmt(r.armado.area)} cm²`],
          ["Cuantía", `${fmt(r.armado.cuantia * 100)} %`],
          ["Carga axial resistente, 0.8 FR Po", `${fmt(r.cargaResistente, 1)} t ≥ ${fmt(e.carga)} t`],
          ...(bx
            ? ([
                ["Momentos resistentes con Pu, en h y en b", `${fmt(r.momentoResistente)} y ${fmt(bx.momentoResistente)} t·m`],
                ["PRx: carga resistente con la excentricidad en h", `${fmt(bx.cargaX, 1)} t`],
                ["PRy: carga resistente con la excentricidad en b", `${fmt(bx.cargaY, 1)} t`],
                ["PR0 = FR Po, sin excentricidad", `${fmt(bx.carga0, 1)} t`],
                bx.metodo === "bresler"
                  ? ["Bresler: 1/PR = 1/PRx + 1/PRy − 1/PR0", `PR = ${fmt(bx.cargaBresler, 1)} t ≥ ${fmt(e.carga)} t`]
                  : ["Pu < 0.1 PR0: Mx/MRx + My/MRy ≤ 1", fmt(bx.indice, 3)],
              ] as [string, string][])
            : ([
                ["Momento resistente con Pu (compatibilidad de deformaciones)", `${fmt(r.momentoResistente)} t·m ≥ ${fmt(r.momentoDiseno)} t·m`],
              ] as [string, string][])),
        ]}
      />

      <H>5. Estribos</H>
      <p className="mt-2 text-sm">
        Separación máxima: la menor de 850 db / √fy, 48 veces el diámetro del estribo y la mitad del lado menor. Se
        colocan <b>{estribos}</b>.
        {bx &&
          " Con acero en las cuatro caras, las varillas intermedias que queden a más de 15 cm libres de una varilla sujeta en esquina se sujetan con grapas."}
      </p>

      {obra && (
        <>
          <H>6. Cuantificación y costo</H>
          <p className="mt-2 text-sm">
            Concreto y cimbra de cuatro caras en la altura libre (el nudo se cuantifica con la losa o la trabe); acero
            longitudinal con un traslape de {TRASLAPE_COLUMNA_DB} diámetros por tramo; estribos a la separación de
            diseño, medidos por fuera con dos ganchos a 135° de {GANCHO_ESTRIBO_DB} diámetros
            {bx ? "; no incluye grapas de las varillas intermedias" : ""}.
          </p>
          <div className="mt-2">
            <TablaPresupuesto p={obra} papel />
          </div>
        </>
      )}

      <H>{obra ? 7 : 6}. Conclusiones</H>
      <p className="mt-2 text-sm">
        La columna {nombre} se construye de{" "}
        <b>
          {fmt(e.b, 0)} × {fmt(e.h, 0)} cm
        </b>{" "}
        con concreto f&apos;c = {fmt(e.fc, 0)} kg/cm², <b>{armado}</b> y <b>{estribos}</b>, con{" "}
        {fmt(e.recubrimiento, 1)} cm de recubrimiento libre. Resiste la carga axial y {bx ? "los momentos de diseño en las dos direcciones" : "el momento de diseño"}.
      </p>

      <AnexoGraficas especs={graficasColumnaCompletas(e, r)} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

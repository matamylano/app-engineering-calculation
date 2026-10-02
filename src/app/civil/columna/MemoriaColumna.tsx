import { graficasColumna } from "@/lib/graficas/concreto";
import { CUANTIA_MAX_COLUMNA, CUANTIA_MIN_COLUMNA, FR_COMPRESION } from "@/calc/concreto/ntc";
import { fmt } from "@/components/form";
import type { DatosColumna, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";

export default function MemoriaColumna({ m }: { m: RegistroMemoria }) {
  const { formulario, proyecto: project, entrada: e, resultado: r } = m.datos as DatosColumna;
  const { firma, folio } = m;
  const nombre = formulario.elemento.trim();
  const armado = `${r.armado.cantidad} varillas #${r.armado.varilla} (${r.armado.cantidad / 2} por cara)`;
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
        sujeta a carga axial y momento en una dirección. Se aplican las Normas Técnicas Complementarias para Diseño y
        Construcción de Estructuras de Concreto (CDMX): FR = {FR_COMPRESION} en flexocompresión, bloque de esfuerzos
        con f&apos;&apos;c = 0.85 f&apos;c y deformación última del concreto de 0.003, excentricidad mínima de 0.05 h
        o 2 cm, amplificación de momentos por esbeltez y cuantía entre {fmt(CUANTIA_MIN_COLUMNA * 100, 0)} y{" "}
        {fmt(CUANTIA_MAX_COLUMNA * 100, 0)} %. El acero se reparte en las dos caras perpendiculares al momento.
      </p>

      <H>2. Datos</H>
      <Rows
        rows={[
          ["Carga axial última, Pu", `${fmt(e.carga)} t`],
          ["Momento último mayor, Mu", `${fmt(e.momento)} t·m`],
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
        <b>{fmt(r.momentoDiseno)} t·m</b>.
      </p>

      <H>4. Flexocompresión</H>
      <Rows
        rows={[
          ["Acero longitudinal", `${armado}, ${fmt(r.armado.area)} cm²`],
          ["Cuantía", `${fmt(r.armado.cuantia * 100)} %`],
          ["Carga axial resistente, 0.8 FR Po", `${fmt(r.cargaResistente, 1)} t ≥ ${fmt(e.carga)} t`],
          ["Momento resistente con Pu (compatibilidad de deformaciones)", `${fmt(r.momentoResistente)} t·m ≥ ${fmt(r.momentoDiseno)} t·m`],
        ]}
      />

      <H>5. Estribos</H>
      <p className="mt-2 text-sm">
        Separación máxima: la menor de 850 db / √fy, 48 veces el diámetro del estribo y la mitad del lado menor. Se
        colocan <b>{estribos}</b>.
      </p>

      <H>6. Conclusiones</H>
      <p className="mt-2 text-sm">
        La columna {nombre} se construye de{" "}
        <b>
          {fmt(e.b, 0)} × {fmt(e.h, 0)} cm
        </b>{" "}
        con concreto f&apos;c = {fmt(e.fc, 0)} kg/cm², <b>{armado}</b> y <b>{estribos}</b>, con{" "}
        {fmt(e.recubrimiento, 1)} cm de recubrimiento libre. Resiste la carga axial y el momento de diseño.
      </p>

      <AnexoGraficas especs={graficasColumna(e, r)} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

import { graficasLosa } from "@/lib/graficas/concreto";
import { INCREMENTO_COLADO, INCREMENTO_MORTERO } from "@/calc/cargas/bajada";
import { ESPESOR_MINIMO, type Armado } from "@/calc/concreto/losa";
import { FR_CORTANTE, FR_FLEXION } from "@/calc/concreto/ntc";
import { APOYOS, FACTOR_MUERTA, FACTOR_VIVA, PESO_CONCRETO } from "@/calc/concreto/viga";
import { fmt } from "@/components/form";
import type { DatosLosa, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";

const coef = (c: number) => (c ? `wu L² / ${fmt(c, c % 1 ? 1 : 0)}` : "sin momento");

export default function MemoriaLosa({ m }: { m: RegistroMemoria }) {
  const { formulario, proyecto: project, entrada: e, resultado: r } = m.datos as DatosLosa;
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
          : `El espesor de ${fmt(e.h, 0)} cm es menor; las deflexiones deben revisarse por separado.`}
      </p>

      <H>7. Conclusiones</H>
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

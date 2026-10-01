import { FR_CORTANTE, FR_FLEXION } from "@/calc/concreto/ntc";
import { APOYOS, FACTOR_MUERTA, FACTOR_VIVA, PESO_CONCRETO } from "@/calc/concreto/viga";
import { fmt } from "@/components/form";
import type { DatosViga, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows } from "../MemoriaComun";

const coef = (c: number) => (c ? `wu L² / ${fmt(c, c % 1 ? 1 : 0)}` : "sin momento");

export default function MemoriaViga({ m }: { m: RegistroMemoria }) {
  const { formulario, proyecto: project, entrada: e, resultado: r } = m.datos as DatosViga;
  const { firma, folio } = m;
  const apoyo = APOYOS[e.apoyo];
  const nombre = formulario.elemento.trim();
  const armado = (l: typeof r.superior) => `${l.cantidad} varillas #${e.varilla} (${fmt(l.areaColocada)} cm²)`;
  const peralteOk = e.h >= r.peralteMinimo;

  return (
    <article className="memoria rounded-lg border border-zinc-300 bg-white p-8 text-black shadow-sm">
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
          : `El peralte de ${fmt(e.h, 0)} cm es menor; las deflexiones deben revisarse por separado.`}
      </p>

      <H>7. Conclusiones</H>
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
        , con {fmt(e.recubrimiento, 1)} cm de recubrimiento libre. Cumple por flexión y cortante.
      </p>

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

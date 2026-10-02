import { graficasZapata } from "@/lib/graficas/concreto";
import {
  FR_CORTANTE,
  FR_FLEXION,
  separacionMaxima,
  varilla,
} from "@/calc/concreto/ntc";
import { fmt } from "@/components/form";
import type { DatosZapata, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";

const cumple = (ok: boolean) => (ok ? "Cumple" : "No cumple");

export default function MemoriaZapata({ m }: { m: RegistroMemoria }) {
  const {
    formulario,
    proyecto: project,
    entrada: e,
    resultado: r,
  } = m.datos as DatosZapata;
  const { firma, folio } = m;
  const v = varilla(e.varilla)!;
  const volado = (r.lado * 100 - Math.min(e.c1, e.c2)) / 2;

  return (
    <article className="memoria rounded-2xl border border-zinc-200 bg-white p-6 text-black shadow-elevada sm:p-10">
      <header className="border-b-2 border-black pb-3">
        <p className="text-xs uppercase tracking-wide">Memoria de cálculo</p>
        <h2 className="text-2xl font-semibold">
          Zapata aislada {formulario.elemento.trim()}
        </h2>
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
        Se diseña una zapata aislada cuadrada de concreto reforzado, concéntrica
        con su columna, con las cargas y la capacidad del suelo que proporciona
        el cliente. Se aplican las Normas Técnicas Complementarias para Diseño y
        Construcción de Estructuras de Concreto (CDMX): factores de resistencia
        FR = {FR_FLEXION} en flexión y {FR_CORTANTE} en cortante, f&apos;&apos;c
        = 0.85 f&apos;c, y revisión de penetración, cortante como viga ancha y
        flexión en la cara de la columna.
      </p>

      <H>2. Datos</H>
      <Rows
        rows={[
          ["Carga de servicio, P", `${fmt(e.carga)} t`],
          ["Carga última, Pu", `${fmt(e.cargaUltima)} t`],
          ["Capacidad admisible del suelo, qa", `${fmt(e.qa)} t/m²`],
          [
            "Incremento por peso de la zapata y el relleno",
            `${fmt(e.incremento * 100, 0)} %`,
          ],
          ["Columna", `${fmt(e.c1, 0)} × ${fmt(e.c2, 0)} cm`],
          [
            "Peralte total, h; recubrimiento libre",
            `${fmt(e.h, 0)} cm; ${fmt(e.recubrimiento, 1)} cm`,
          ],
          [
            "Concreto f'c; acero fy",
            `${fmt(e.fc, 0)} kg/cm²; ${fmt(e.fy, 0)} kg/cm²`,
          ],
        ]}
      />

      <H>3. Dimensiones</H>
      <p className="mt-2 text-sm">
        B ≥ √(P·(1 + i) / qa) = √({fmt(e.carga)} · {fmt(1 + e.incremento)} /{" "}
        {fmt(e.qa)}) → {fmt(r.ladoMinimo)} m. Se usa B = <b>{fmt(r.lado)} m</b>,
        con presión de servicio de {fmt(r.presionServicio)} t/m² ≤ qa. Para
        diseño, la presión neta última es qu = Pu / B² = {fmt(r.presionUltima)}{" "}
        t/m². Peralte efectivo al lecho superior: d = h − r − 1.5 db ={" "}
        {fmt(r.d, 1)} cm.
      </p>

      <H>4. Cortante por penetración</H>
      <p className="mt-2 text-sm">
        Sección crítica a d/2 de la columna, perímetro bo ={" "}
        {fmt(r.penetracion.perimetro, 1)} cm. Esfuerzo actuante vu = Vu / (bo·d)
        = {fmt(r.penetracion.actuante)} kg/cm². Resistente vcR = FR (0.5 + γ)
        √f&apos;c ≤ FR √f&apos;c, con γ = {fmt(r.penetracion.gamma)}:{" "}
        {fmt(r.penetracion.resistente)} kg/cm².{" "}
        <b>{cumple(r.penetracion.cumple)}</b>.
      </p>

      <H>5. Cortante como viga ancha</H>
      <p className="mt-2 text-sm">
        Sección crítica a d de la cara de la columna (volado de {fmt(volado, 1)}{" "}
        cm). Vu = {fmt(r.vigaAncha.actuante)} t; VcR = 0.5 FR √f&apos;c · B · d
        = {fmt(r.vigaAncha.resistente)} t. <b>{cumple(r.vigaAncha.cumple)}</b>.
      </p>

      <H>6. Flexión y armado</H>
      <p className="mt-2 text-sm">
        Momento último en la cara de la columna, en todo el ancho: Mu = qu · B ·
        volado² / 2 = {fmt(r.momento)} t·m. Acero por flexión{" "}
        {fmt(r.aceroFlexion)} cm²; acero mínimo (por flexión y por cambios
        volumétricos) {fmt(r.aceroMinimo)} cm²; se diseña con{" "}
        {fmt(r.aceroDiseno)} cm². Separación máxima{" "}
        {fmt(separacionMaxima(e.h), 0)} cm.
      </p>
      <Rows
        rows={[
          [
            "Armado en cada dirección",
            `${r.armado.cantidad} varillas #${r.armado.varilla} @ ${fmt(r.armado.separacion, 1)} cm`,
          ],
          [
            "Área colocada",
            `${fmt(r.armado.areaColocada)} cm² (varilla de ${fmt(v.area)} cm²)`,
          ],
        ]}
      />

      <H>7. Conclusiones</H>
      <p className="mt-2 text-sm">
        La zapata {formulario.elemento.trim()} se construye de{" "}
        <b>
          {fmt(r.lado)} × {fmt(r.lado)} m y {fmt(e.h, 0)} cm de peralte
        </b>
        , con concreto f&apos;c = {fmt(e.fc, 0)} kg/cm² y una parrilla de{" "}
        <b>
          {r.armado.cantidad} varillas #{r.armado.varilla} @{" "}
          {fmt(r.armado.separacion, 1)} cm en ambas direcciones
        </b>
        , con {fmt(e.recubrimiento, 1)} cm de recubrimiento libre. Cumple por
        penetración, cortante y flexión. Se recomienda colar sobre una plantilla
        de concreto pobre de 5 cm.
      </p>

      <AnexoGraficas especs={graficasZapata(e, r)} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

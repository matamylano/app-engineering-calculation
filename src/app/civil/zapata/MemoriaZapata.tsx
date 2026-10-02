import { graficasZapataCompletas, zapataExtendida } from "@/lib/graficas/zapata";
import {
  cuantificarZapata,
  GANCHO_ZAPATA_DB,
  type DireccionZapata,
} from "@/calc/concreto/zapata";
import {
  FR_CORTANTE,
  FR_FLEXION,
  separacionMaxima,
  varilla,
} from "@/calc/concreto/ntc";
import { preciosDeFormulario, presupuesto } from "@/calc/obra/cuantificacion";
import TablaPresupuesto from "@/components/obra/TablaPresupuesto";
import { fmt } from "@/components/form";
import type { DatosZapata, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows, AnexoGraficas } from "../MemoriaComun";

const cumple = (ok: boolean) => (ok ? "Cumple" : "No cumple");

/** Presupuesto de la memoria; null en memorias viejas (sin campos de obra) o si los precios no son válidos. */
function presupuestoMemoria({ formulario, entrada, resultado }: DatosZapata) {
  if (formulario.piezas === undefined || resultado.direcciones === undefined) return null;
  try {
    const { piezas, precios } = preciosDeFormulario(formulario);
    const partidas = cuantificarZapata(entrada, resultado, { cimbra: formulario.cimbra === "perimetral" });
    return presupuesto(partidas, precios, piezas);
  } catch {
    return null;
  }
}

export default function MemoriaZapata({ m }: { m: RegistroMemoria }) {
  const datos = m.datos as DatosZapata;
  const { formulario, proyecto: project, entrada: e, resultado: r } = datos;
  const { firma, folio } = m;
  const v = varilla(e.varilla)!;
  const volado = (r.lado * 100 - Math.min(e.c1, e.c2)) / 2;
  // Las memorias viejas no tienen direcciones ni presiones: se pintan como siempre.
  const extendida = zapataExtendida(e) && r.direcciones !== undefined;
  const obra = presupuestoMemoria(datos);
  const nConclusiones = obra ? 8 : 7;

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
      {extendida ? (
        <p className="mt-2 text-sm">
          Se diseña una zapata aislada {r.cuadrada ? "cuadrada" : "rectangular"} de concreto reforzado
          {r.presiones ? ", con carga axial y momento en la base en la dirección del largo L," : ", concéntrica con su columna,"}{" "}
          con las cargas y la capacidad del suelo que proporciona el cliente. Se aplican las Normas Técnicas
          Complementarias para Diseño y Construcción de Estructuras de Concreto (CDMX): factores de resistencia FR ={" "}
          {FR_FLEXION} en flexión y {FR_CORTANTE} en cortante, f&apos;&apos;c = 0.85 f&apos;c, y revisión de
          penetración, cortante como viga ancha y flexión en la cara de la columna en las dos direcciones.
          {r.presiones &&
            " La presión sobre el suelo se supone lineal (zapata rígida); se pide que la presión máxima de servicio no pase de qa y que no haya tensión (e ≤ L/6)."}
        </p>
      ) : (
        <p className="mt-2 text-sm">
          Se diseña una zapata aislada cuadrada de concreto reforzado, concéntrica
          con su columna, con las cargas y la capacidad del suelo que proporciona
          el cliente. Se aplican las Normas Técnicas Complementarias para Diseño y
          Construcción de Estructuras de Concreto (CDMX): factores de resistencia
          FR = {FR_FLEXION} en flexión y {FR_CORTANTE} en cortante, f&apos;&apos;c
          = 0.85 f&apos;c, y revisión de penetración, cortante como viga ancha y
          flexión en la cara de la columna.
        </p>
      )}

      <H>2. Datos</H>
      <Rows
        rows={[
          ["Carga de servicio, P", `${fmt(e.carga)} t`],
          ["Carga última, Pu", `${fmt(e.cargaUltima)} t`],
          ...(extendida && r.presiones
            ? ([["Momento de servicio en la base, M (dirección de L)", `${fmt(e.momento ?? 0)} t·m`]] as [string, string][])
            : []),
          ["Capacidad admisible del suelo, qa", `${fmt(e.qa)} t/m²`],
          [
            "Incremento por peso de la zapata y el relleno",
            `${fmt(e.incremento * 100, 0)} %`,
          ],
          [
            extendida ? "Columna, c1 (paralelo a B) × c2 (paralelo a L)" : "Columna",
            `${fmt(e.c1, 0)} × ${fmt(e.c2, 0)} cm`,
          ],
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

      {extendida ? (
        <SeccionesExtendidas datos={datos} />
      ) : (
        <>
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
        </>
      )}

      {obra && (
        <>
          <H>7. Cuantificación y costo</H>
          <p className="mt-2 text-sm">
            Concreto de la zapata, plantilla de concreto pobre de 5 cm del tamaño de la zapata (valuada con el
            precio del concreto), acero de la parrilla con varillas del lado menos dos recubrimientos y un gancho
            a 90° de {GANCHO_ZAPATA_DB} diámetros en cada extremo
            {formulario.cimbra === "perimetral" ? ", y cimbra en el perímetro" : "; la zapata se cuela contra el terreno, sin cimbra"}.
          </p>
          <div className="mt-2">
            <TablaPresupuesto p={obra} papel />
          </div>
        </>
      )}

      <H>{nConclusiones}. Conclusiones</H>
      {extendida ? (
        <p className="mt-2 text-sm">
          La zapata {formulario.elemento.trim()} se construye de{" "}
          <b>
            {fmt(r.lado)} m de ancho (B) × {fmt(r.largo)} m de largo (L) y {fmt(e.h, 0)} cm de peralte
          </b>
          , con concreto f&apos;c = {fmt(e.fc, 0)} kg/cm² y una parrilla de{" "}
          <b>
            {armadoTexto(r.direcciones.largo)} paralelas a L y {armadoTexto(r.direcciones.ancho)} paralelas a B
          </b>
          , con {fmt(e.recubrimiento, 1)} cm de recubrimiento libre.
          {r.presiones &&
            ` La presión de servicio va de ${fmt(r.presiones.minima)} a ${fmt(r.presiones.maxima)} t/m², sin tensión y sin pasar de qa.`}{" "}
          Cumple por penetración, cortante y flexión. Se recomienda colar sobre una plantilla de concreto pobre de 5
          cm.
        </p>
      ) : (
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
      )}

      <AnexoGraficas especs={graficasZapataCompletas(e, r)} />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

const armadoTexto = (x: DireccionZapata) =>
  `${x.armado.cantidad} varillas #${x.armado.varilla} @ ${fmt(x.armado.separacion, 1)} cm`;

/** Secciones 3 a 6 de la zapata rectangular o con momento. */
function SeccionesExtendidas({ datos }: { datos: DatosZapata }) {
  const { entrada: e, resultado: r } = datos;
  const p = r.presiones;
  const pServ = e.carga * (1 + e.incremento);
  const { largo: dl, ancho: da } = r.direcciones;
  const fila = (nombre: string, x: DireccionZapata): [string, string][] => [
    [`${nombre}: volado; ancho que trabaja`, `${fmt(x.volado, 1)} cm; ${fmt(x.ancho)} m`],
    [`${nombre}: presión última en la cara y en el borde`, `${fmt(x.presionCara)} y ${fmt(x.presionBorde)} t/m²`],
    [`${nombre}: Mu = b a² (q cara + 2 q borde) / 6`, `${fmt(x.momento)} t·m`],
    [
      `${nombre}: acero por flexión; mínimo; diseño`,
      `${fmt(x.aceroFlexion)}; ${fmt(x.aceroMinimo)}; ${fmt(x.aceroDiseno)} cm²`,
    ],
    ...(x.factorFranja > 1
      ? ([[`${nombre}: factor por franja central, 2β/(β + 1)`, fmt(x.factorFranja, 3)]] as [string, string][])
      : []),
    [`${nombre}: armado`, `${armadoTexto(x)} (${fmt(x.armado.areaColocada)} cm²)`],
  ];

  return (
    <>
      <H>3. Dimensiones y presiones sobre el suelo</H>
      {r.cuadrada ? (
        <p className="mt-2 text-sm">
          Zapata cuadrada de lado B. Lado mínimo para que la presión máxima no pase de qa
          {p ? " y que no haya tensión" : ""}: {fmt(r.ladoMinimo)} m. Se usa B = L = <b>{fmt(r.lado)} m</b>.
        </p>
      ) : (
        <p className="mt-2 text-sm">
          Con L = {fmt(r.largo)} m, B ≥ (P (1 + i) / L {p ? "+ 6 M / L²" : ""}) / qa = ({fmt(pServ)} / {fmt(r.largo)}
          {p ? ` + 6 · ${fmt(e.momento ?? 0)} / ${fmt(r.largo)}²` : ""}) / {fmt(e.qa)} → {fmt(r.ladoMinimo)} m. Se usa{" "}
          <b>
            B = {fmt(r.lado)} m × L = {fmt(r.largo)} m
          </b>
          .
        </p>
      )}
      {p ? (
        <>
          <p className="mt-2 text-sm">
            Excentricidad e = M / (P (1 + i)) = {fmt(e.momento ?? 0)} / {fmt(pServ)} = {fmt(p.excentricidad, 3)} m ≤
            L/6 = {fmt(p.limite, 3)} m: <b>{cumple(p.excentricidad <= p.limite + 1e-9)}</b> (sin tensión bajo la
            zapata). Presiones de servicio q = P (1 + i) / (B L) ± 6 M / (B L²):
          </p>
          <Rows
            rows={[
              ["Presión media de servicio", `${fmt(r.presionServicio)} t/m²`],
              ["Presión máxima de servicio, qmáx ≤ qa", `${fmt(p.maxima)} t/m² ≤ ${fmt(e.qa)} t/m² · ${cumple(p.maxima <= e.qa + 1e-9)}`],
              ["Presión mínima de servicio, qmín ≥ 0", `${fmt(p.minima)} t/m²`],
              ["Momento último, Mu = M · Pu / P", `${fmt(p.momentoUltimo)} t·m`],
              ["Presión neta última media, máxima y mínima", `${fmt(r.presionUltima)}; ${fmt(p.maximaUltima)}; ${fmt(p.minimaUltima)} t/m²`],
            ]}
          />
        </>
      ) : (
        <p className="mt-2 text-sm">
          Presión de servicio P (1 + i) / (B L) = {fmt(r.presionServicio)} t/m² ≤ qa. Presión neta última qu = Pu /
          (B L) = {fmt(r.presionUltima)} t/m².
        </p>
      )}
      <p className="mt-2 text-sm">
        Peralte efectivo al lecho superior: d = h − r − 1.5 db = {fmt(r.d, 1)} cm (se usa en las dos direcciones).
      </p>

      <H>4. Cortante por penetración</H>
      <p className="mt-2 text-sm">
        Sección crítica a d/2 de la columna, perímetro bo = {fmt(r.penetracion.perimetro, 1)} cm. Esfuerzo por la
        carga vu = Vu / (bo·d) = {fmt(r.penetracion.directo)} kg/cm²
        {p ? (
          <>
            {" "}
            más el del momento que se transmite por cortante excéntrico, α Mu c / Jc, con α = 1 − 1 / (1 + 0.67 √((c2 +
            d)/(c1 + d))) = {fmt(r.penetracion.alfa, 3)} y todo Mu (conservador): {fmt(r.penetracion.porMomento)}{" "}
            kg/cm². Total {fmt(r.penetracion.actuante)} kg/cm²
          </>
        ) : null}
        . Resistente vcR = FR (0.5 + γ) √f&apos;c ≤ FR √f&apos;c, con γ = {fmt(r.penetracion.gamma)}:{" "}
        {fmt(r.penetracion.resistente)} kg/cm². <b>{cumple(r.penetracion.cumple)}</b>.
      </p>

      <H>5. Cortante como viga ancha</H>
      <p className="mt-2 text-sm">
        Sección crítica a d de la cara de la columna, en cada dirección, con la presión trapecial entre la cara y el
        borde; VcR = 0.5 FR √f&apos;c · b · d.
        {r.cuadrada && " En la zapata cuadrada se toma el volado mayor en las dos direcciones."}
      </p>
      <Rows
        rows={[
          [
            "Varillas paralelas a L (volado en la dirección de L)",
            `${fmt(dl.vigaAncha.actuante)} ≤ ${fmt(dl.vigaAncha.resistente)} t · ${cumple(dl.vigaAncha.cumple)}`,
          ],
          [
            "Varillas paralelas a B (volado en la dirección de B)",
            `${fmt(da.vigaAncha.actuante)} ≤ ${fmt(da.vigaAncha.resistente)} t · ${cumple(da.vigaAncha.cumple)}`,
          ],
        ]}
      />

      <H>6. Flexión y armado</H>
      <p className="mt-2 text-sm">
        Momento en la cara de la columna de la presión trapecial del volado. Acero mínimo por flexión y por cambios
        volumétricos; separación máxima {fmt(separacionMaxima(e.h), 0)} cm.
        {(dl.factorFranja > 1 || da.factorFranja > 1) &&
          " En la zapata rectangular, las varillas paralelas al lado corto llevan 2/(β + 1) de su acero en una franja central igual al lado corto (β = lado largo / lado corto); se reparten uniformes con esa densidad en todo el largo."}
      </p>
      <Rows rows={[...fila("Paralelas a L", dl), ...fila("Paralelas a B", da)]} />
    </>
  );
}

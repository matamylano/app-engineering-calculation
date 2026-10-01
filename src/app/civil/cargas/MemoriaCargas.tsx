import { FACTOR_MUERTA, FACTOR_VIVA, INCREMENTO_COLADO, INCREMENTO_MORTERO } from "@/calc/cargas/bajada";
import { fmt } from "@/components/form";
import type { DatosCargas, RegistroMemoria } from "@/lib/servidor/tipos";
import { blank, fechaLarga, H, HojaFirma, Rows } from "../MemoriaComun";

const t = (x: number) => `${fmt(x)} t`;
const kg = (x: number) => `${fmt(x, 0)} kg/m²`;

function Tabla({ cabeza, filas }: { cabeza: string[]; filas: (string | number)[][] }) {
  return (
    <table className="mt-2 w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-400 text-left">
          {cabeza.map((c, i) => (
            <th key={c} className={`py-1 pr-2 font-semibold ${i > 0 ? "text-right" : ""}`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={i} className="border-b border-zinc-200">
            {f.map((c, j) => (
              <td key={j} className={`py-1 pr-2 ${j > 0 ? "text-right font-mono" : ""}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function MemoriaCargas({ m }: { m: RegistroMemoria }) {
  const { proyecto: project, entrada, resultado } = m.datos as DatosCargas;
  const { firma, folio } = m;
  const conCimentacion = entrada.capacidadSuelo !== undefined;
  const mayor = resultado.elementos.reduce((a, b) => (b.servicio > a.servicio ? b : a));

  return (
    <article className="memoria rounded-lg border border-zinc-300 bg-white p-8 text-black shadow-sm">
      <header className="border-b-2 border-black pb-3">
        <p className="text-xs uppercase tracking-wide">Memoria de cálculo</p>
        <h2 className="text-2xl font-semibold">Bajada de cargas</h2>
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
        Se determinan las cargas muertas y vivas por nivel y la carga que baja por cada columna o muro hasta la
        cimentación, a partir de la geometría y los materiales que proporciona el cliente. Se aplican las Normas
        Técnicas Complementarias sobre Criterios y Acciones para el Diseño Estructural de las Edificaciones (CDMX):
        cargas vivas unitarias de la tabla 6.1.1, incremento de {INCREMENTO_COLADO} kg/m² a losas coladas en el
        lugar y de {INCREMENTO_MORTERO} kg/m² a su capa de mortero, y factores de carga de {FACTOR_MUERTA} para carga
        muerta y {FACTOR_VIVA} para carga viva (estructura del grupo B). Para diseño por cargas gravitacionales se
        usa la carga viva máxima, Wm.
      </p>

      <H>2. Cargas por nivel</H>
      <Tabla
        cabeza={["Nivel", "Losa", "Increm.", "Acabados", "Muros", "CM", "CV (Wm)", "CM + CV", "Última"]}
        filas={resultado.niveles.map((n, i) => [
          `${n.nombre} (${n.viva.nombre.split(" (")[0].toLowerCase()}, losa de ${fmt(entrada.niveles[i].espesorLosa * 100, 0)} cm)`,
          fmt(n.losa, 0),
          fmt(n.incremento, 0),
          fmt(n.acabados, 0),
          fmt(n.muros, 0),
          fmt(n.muerta, 0),
          fmt(n.viva.wm, 0),
          fmt(n.servicio, 0),
          fmt(n.ultima, 0),
        ])}
      />
      <p className="mt-1 text-xs">
        Valores en kg/m². Carga última = {FACTOR_MUERTA}·CM + {FACTOR_VIVA}·CV. Peso volumétrico del concreto:{" "}
        {[...new Set(entrada.niveles.map((n) => fmt(n.pesoConcreto)))].join(", ")} t/m³.
      </p>

      <H>3. Carga por elemento</H>
      {resultado.elementos.map((el, i) => (
        <div key={el.nombre + i} className="mt-3">
          <p className="text-sm font-semibold">
            {el.nombre}: área tributaria de {fmt(entrada.elementos[i].areaTributaria)} m² por nivel, peso propio de{" "}
            {t(entrada.elementos[i].pesoPropio)} por nivel
          </p>
          <Tabla
            cabeza={["Nivel", "CM", "CV", "Servicio acumulada", "Última acumulada"]}
            filas={el.niveles.map((n) => [n.nivel, t(n.muerta), t(n.viva), t(n.servicioAcumulada), t(n.ultimaAcumulada)])}
          />
        </div>
      ))}

      {conCimentacion && (
        <>
          <H>4. Área de cimentación</H>
          <p className="mt-2 text-sm">
            Con capacidad de carga admisible qa = {fmt(entrada.capacidadSuelo!)} t/m² y un incremento de{" "}
            {fmt(entrada.incrementoCimentacion * 100, 0)} % por el peso de la zapata y el relleno: A = P·(1 + i) / qa.
          </p>
          <Tabla
            cabeza={["Elemento", "P servicio", "P con cimentación", "Área requerida", "Zapata cuadrada"]}
            filas={resultado.elementos.map((el) => [
              el.nombre,
              t(el.servicio),
              t(el.cimentacion!.carga),
              `${fmt(el.cimentacion!.area)} m²`,
              `${fmt(el.cimentacion!.lado)} × ${fmt(el.cimentacion!.lado)} m`,
            ])}
          />
        </>
      )}

      <H>{conCimentacion ? "5" : "4"}. Conclusiones</H>
      <p className="mt-2 text-sm">
        El elemento más cargado es <b>{mayor.nombre}</b>, con <b>{t(mayor.servicio)}</b> de carga de servicio y{" "}
        <b>{t(mayor.ultima)}</b> de carga última en la base
        {mayor.cimentacion && (
          <>
            ; requiere una zapata de al menos{" "}
            <b>
              {fmt(mayor.cimentacion.lado)} × {fmt(mayor.cimentacion.lado)} m
            </b>
          </>
        )}
        . Estas cargas sirven para diseñar columnas, muros y zapatas; el armado de cada elemento se revisa en su propia
        memoria.
      </p>
      <Rows
        rows={[
          ["Carga muerta máxima por m²", kg(Math.max(...resultado.niveles.map((n) => n.muerta)))],
          ["Carga última máxima por m²", kg(Math.max(...resultado.niveles.map((n) => n.ultima)))],
        ]}
      />

      <HojaFirma folio={folio} project={project} firma={firma} />
    </article>
  );
}

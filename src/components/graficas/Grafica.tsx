import { marcasLineales, marcasLog, numeroEje } from "@/lib/graficas/escalas";
import type { EspecBarras, EspecGrafica, EspecXY } from "@/lib/graficas/tipos";

/**
 * Gráfica en SVG, sin JavaScript en el navegador: sirve igual en la pantalla
 * del estudio que en la memoria impresa. Con `papel` usa siempre los colores
 * claros (la memoria es una hoja blanca aunque la pantalla esté en oscuro).
 */

const ANCHO = 640;
const ALTO = 300;
const M = { izq: 60, der: 18, arr: 14, aba: 46 };
const AREA = { x0: M.izq, x1: ANCHO - M.der, y0: M.arr, y1: ALTO - M.aba };

const color = (c?: number) => `var(--g-s${c ?? 1})`;

function Leyenda({ items }: { items: { nombre: string; color: string; punteada?: boolean; punto?: boolean }[] }) {
  if (items.length < 2) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--g-texto)]">
      {items.map((i) => (
        <li key={i.nombre} className="flex items-center gap-1.5">
          <svg width="18" height="10" aria-hidden>
            {i.punto ? (
              <circle cx="9" cy="5" r="4" fill={i.color} />
            ) : (
              <line
                x1="1"
                x2="17"
                y1="5"
                y2="5"
                stroke={i.color}
                strokeWidth="2"
                strokeDasharray={i.punteada ? "4 3" : undefined}
                strokeLinecap="round"
              />
            )}
          </svg>
          {i.nombre}
        </li>
      ))}
    </ul>
  );
}

function Ejes({
  marcasX,
  marcasY,
  px,
  py,
  etiquetaX,
  etiquetaY,
  ceroY,
}: {
  marcasX: { v: number; texto: string }[];
  marcasY: number[];
  px: (v: number) => number;
  py: (v: number) => number;
  etiquetaX: string;
  etiquetaY: string;
  ceroY?: number;
}) {
  return (
    <g fontSize="12" fill="var(--g-texto)">
      {marcasY.map((v) => (
        <g key={`y${v}`}>
          <line x1={AREA.x0} x2={AREA.x1} y1={py(v)} y2={py(v)} stroke="var(--g-rejilla)" strokeWidth="1" />
          <text x={AREA.x0 - 8} y={py(v)} dy="0.32em" textAnchor="end" className="tabular-nums">
            {numeroEje(v)}
          </text>
        </g>
      ))}
      {marcasX.map((m) => (
        <g key={`x${m.v}`}>
          <line x1={px(m.v)} x2={px(m.v)} y1={AREA.y0} y2={AREA.y1} stroke="var(--g-rejilla)" strokeWidth="1" />
          <text x={px(m.v)} y={AREA.y1 + 16} textAnchor="middle" className="tabular-nums">
            {m.texto}
          </text>
        </g>
      ))}
      {ceroY !== undefined && (
        <line x1={AREA.x0} x2={AREA.x1} y1={ceroY} y2={ceroY} stroke="var(--g-eje)" strokeWidth="1" />
      )}
      <line x1={AREA.x0} x2={AREA.x0} y1={AREA.y0} y2={AREA.y1} stroke="var(--g-eje)" strokeWidth="1" />
      <text
        x={(AREA.x0 + AREA.x1) / 2}
        y={ALTO - 6}
        textAnchor="middle"
        fill="var(--g-tinta)"
        fontSize="12.5"
        fontWeight="500"
      >
        {etiquetaX}
      </text>
      <text
        transform={`translate(14 ${(AREA.y0 + AREA.y1) / 2}) rotate(-90)`}
        textAnchor="middle"
        fill="var(--g-tinta)"
        fontSize="12.5"
        fontWeight="500"
      >
        {etiquetaY}
      </text>
    </g>
  );
}

function GraficaXY({ e }: { e: EspecXY }) {
  const pts = e.series.flatMap((s) => s.puntos).concat((e.notas ?? []).map((n) => [n.x, n.y] as [number, number]));
  const xs = pts.map((p) => p[0]).filter(Number.isFinite);
  const ys = pts.map((p) => p[1]).filter(Number.isFinite);
  if (xs.length === 0) return null;

  const xMin = e.x.min ?? Math.min(...xs);
  const xMax = e.x.max ?? Math.max(...xs);
  const ex = e.x.log ? marcasLog(Math.max(xMin, 1e-9), xMax) : marcasLineales(xMin, xMax);
  if (e.x.log && e.x.max === undefined) {
    // Sin estirar hasta la década siguiente: un poco de aire después del último dato.
    ex.max = Math.min(ex.max, xMax * 1.25);
    ex.marcas = ex.marcas.filter((v) => v <= ex.max);
  }
  const ey = marcasLineales(e.y.min ?? Math.min(0, ...ys), e.y.max ?? Math.max(0, ...ys));

  const tx = (v: number) => (e.x.log ? Math.log10(v) : v);
  const px = (v: number) => AREA.x0 + ((tx(v) - tx(ex.min)) / (tx(ex.max) - tx(ex.min))) * (AREA.x1 - AREA.x0);
  const py = (v: number) => {
    const f = (v - ey.min) / (ey.max - ey.min);
    return e.y.invertido ? AREA.y0 + f * (AREA.y1 - AREA.y0) : AREA.y1 - f * (AREA.y1 - AREA.y0);
  };
  const camino = (p: [number, number][]) =>
    p.map(([x, y], i) => `${i ? "L" : "M"}${px(x).toFixed(1)} ${py(y).toFixed(1)}`).join("");
  const base = py(Math.min(Math.max(0, ey.min), ey.max));

  const marcasX = (
    e.x.log ? ex.marcas.filter((v) => /^[15]/.test(String(v / 10 ** Math.floor(Math.log10(v) + 1e-9)))) : ex.marcas
  ).map((v) => ({
    v,
    texto: numeroEje(v),
  }));

  return (
    <>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="block w-full min-w-[460px]" role="img" aria-label={e.titulo}>
          <Ejes
            marcasX={marcasX}
            marcasY={ey.marcas}
            px={px}
            py={py}
            etiquetaX={e.x.etiqueta}
            etiquetaY={e.y.etiqueta}
            ceroY={ey.min < 0 && ey.max > 0 ? py(0) : undefined}
          />
          {e.series.map((s) => {
            const c = s.estilo === "limite" ? "var(--g-limite)" : color(s.color);
            if (s.estilo === "puntos")
              return (
                <g key={s.nombre}>
                  {s.puntos.map(([x, y], i) => (
                    <circle key={i} cx={px(x)} cy={py(y)} r="4.5" fill={c} stroke="var(--g-fondo)" strokeWidth="2">
                      <title>{`${s.nombre}: ${numeroEje(x)}, ${numeroEje(y)}`}</title>
                    </circle>
                  ))}
                </g>
              );
            const d = camino(s.puntos);
            return (
              <g key={s.nombre}>
                {s.estilo === "area" && s.puntos.length > 1 && (
                  <path
                    d={`${d}L${px(s.puntos.at(-1)![0]).toFixed(1)} ${base}L${px(s.puntos[0][0]).toFixed(1)} ${base}Z`}
                    fill={c}
                    opacity="0.12"
                  />
                )}
                <path
                  d={d}
                  fill="none"
                  stroke={c}
                  strokeWidth={s.estilo === "limite" ? 1.5 : 2}
                  strokeDasharray={s.estilo === "limite" ? "6 4" : undefined}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
          {(e.notas ?? []).map((n) => {
            const x = px(n.x);
            const y = py(n.y);
            const derecha = x > (AREA.x0 + AREA.x1) / 2;
            return (
              <g key={n.texto}>
                <circle cx={x} cy={y} r="5.5" fill={color(n.color ?? 2)} stroke="var(--g-fondo)" strokeWidth="2">
                  <title>{n.texto}</title>
                </circle>
                <text
                  x={x + (derecha ? -10 : 10)}
                  y={y - 10}
                  textAnchor={derecha ? "end" : "start"}
                  fontSize="11.5"
                  fontWeight="600"
                  fill="var(--g-tinta)"
                  stroke="var(--g-fondo)"
                  strokeWidth="4"
                  paintOrder="stroke"
                >
                  {n.texto}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <Leyenda
        items={e.series
          .filter((s) => !s.sinLeyenda)
          .map((s) => ({
            nombre: s.nombre,
            color: s.estilo === "limite" ? "var(--g-limite)" : color(s.color),
            punteada: s.estilo === "limite",
            punto: s.estilo === "puntos",
          }))}
      />
    </>
  );
}

/** Columna con la punta redondeada (4) y la base recta. */
function columna(x: number, ancho: number, yTop: number, yBase: number) {
  const r = Math.min(4, ancho / 2, Math.abs(yBase - yTop));
  return `M${x} ${yBase}V${yTop + r}Q${x} ${yTop} ${x + r} ${yTop}H${x + ancho - r}Q${x + ancho} ${yTop} ${x + ancho} ${yTop + r}V${yBase}Z`;
}

function GraficaBarras({ e }: { e: EspecBarras }) {
  const valores = e.series.flatMap((s) => s.valores).concat(e.referencia ? [e.referencia.valor] : []);
  const ey = marcasLineales(0, e.y.max ?? Math.max(...valores) * 1.08);
  const py = (v: number) => AREA.y1 - ((v - ey.min) / (ey.max - ey.min)) * (AREA.y1 - AREA.y0);
  const banda = (AREA.x1 - AREA.x0) / e.categorias.length;
  const ancho = Math.min(24, (banda * 0.7) / e.series.length - 2);
  const grupo = e.series.length * ancho + (e.series.length - 1) * 2;
  const unaSerie = e.series.length === 1;

  return (
    <>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="block w-full min-w-[460px]" role="img" aria-label={e.titulo}>
          <Ejes marcasX={[]} marcasY={ey.marcas} px={() => 0} py={py} etiquetaX="" etiquetaY={e.y.etiqueta} />
          <line x1={AREA.x0} x2={AREA.x1} y1={AREA.y1} y2={AREA.y1} stroke="var(--g-eje)" strokeWidth="1" />
          {e.categorias.map((cat, i) => {
            const x0 = AREA.x0 + banda * i + (banda - grupo) / 2;
            return (
              <g key={cat}>
                {e.series.map((s, j) => {
                  const v = s.valores[i];
                  const x = x0 + j * (ancho + 2);
                  return (
                    <g key={s.nombre}>
                      <path d={columna(x, ancho, py(v), AREA.y1)} fill={color(s.color)}>
                        <title>{`${cat} · ${s.nombre}: ${numeroEje(v)}`}</title>
                      </path>
                      {unaSerie && (
                        <text
                          x={x + ancho / 2}
                          y={py(v) - 6}
                          textAnchor="middle"
                          fontSize="11.5"
                          fill="var(--g-texto)"
                          className="tabular-nums"
                        >
                          {numeroEje(v)}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text
                  x={AREA.x0 + banda * (i + 0.5)}
                  y={AREA.y1 + 16}
                  textAnchor="middle"
                  fontSize="12"
                  fill="var(--g-texto)"
                >
                  {cat}
                </text>
              </g>
            );
          })}
          {e.referencia && (
            <g>
              <line
                x1={AREA.x0}
                x2={AREA.x1}
                y1={py(e.referencia.valor)}
                y2={py(e.referencia.valor)}
                stroke="var(--g-limite)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
            </g>
          )}
        </svg>
      </div>
      <Leyenda
        items={[
          ...e.series.map((s) => ({ nombre: s.nombre, color: color(s.color), punto: true })),
          ...(e.referencia ? [{ nombre: e.referencia.texto, color: "var(--g-limite)", punteada: true }] : []),
        ]}
      />
    </>
  );
}

export default function Grafica({ e, papel }: { e: EspecGrafica; papel?: boolean }) {
  return (
    <figure className={`grafica ${papel ? "grafica-papel" : ""}`}>
      <figcaption>
        <span className="block text-sm font-semibold text-[var(--g-tinta)]">{e.titulo}</span>
        {e.subtitulo && <span className="mt-0.5 block text-xs text-[var(--g-texto)]">{e.subtitulo}</span>}
      </figcaption>
      <div className="mt-3">{e.tipo === "xy" ? <GraficaXY e={e} /> : <GraficaBarras e={e} />}</div>
    </figure>
  );
}

/** Varias gráficas en rejilla (pantalla) o una debajo de otra (memoria). */
export function Graficas({ especs, papel }: { especs: EspecGrafica[]; papel?: boolean }) {
  if (especs.length === 0) return null;
  return (
    <div className={papel ? "mt-3 grid gap-6" : especs.length > 1 ? "grid gap-6 lg:grid-cols-2" : "grid max-w-3xl"}>
      {especs.map((e) => (
        <div key={e.titulo} className={papel ? "" : "tarjeta p-5"}>
          <Grafica e={e} papel={papel} />
        </div>
      ))}
    </div>
  );
}

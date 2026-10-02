import { describe, expect, it } from "vitest";
import { disenarColumna } from "@/calc/concreto/columna";
import { disenarViga } from "@/calc/concreto/viga";
import { disenarPozo } from "@/calc/pozos/pozo";
import { entradaColumna, FORMULARIO_COLUMNA_INICIAL } from "@/lib/estudios/columna";
import { entradaPozo, FORMULARIO_POZO_INICIAL } from "@/lib/estudios/pozo";
import { entradaViga, FORMULARIO_VIGA_INICIAL } from "@/lib/estudios/viga";
import { curvaInteraccion, diagramas, graficasViga } from "./concreto";
import { graficasPozo } from "./agua";
import { marcasLineales, marcasLog, pasoRedondo } from "./escalas";

const extremo = (p: [number, number][], f: (a: number, b: number) => boolean) =>
  p.reduce((a, b) => (f(b[1], a[1]) ? b : a))[1];

describe("escalas", () => {
  it("pasos redondos", () => {
    expect(pasoRedondo(10)).toBe(2);
    expect(pasoRedondo(9.4)).toBe(2);
    expect(pasoRedondo(330)).toBe(100);
  });
  it("marcas que cubren el rango", () => {
    expect(marcasLineales(0, 9.41)).toEqual({ min: 0, max: 10, marcas: [0, 2, 4, 6, 8, 10] });
    expect(marcasLineales(-7.5, 7.5).marcas).toContain(0);
    expect(marcasLog(1, 1440)).toMatchObject({ min: 1, max: 10000 });
  });
});

describe("diagramas de la viga", () => {
  it("simplemente apoyada: wL²/8 al centro y wL/2 en los apoyos", () => {
    const d = diagramas("simple", 5, 0, (3 * 25) / 8, 3);
    expect(extremo(d.momento, (a, b) => a > b)).toBeCloseTo(9.375, 3);
    expect(d.momento[0][1]).toBeCloseTo(0, 9);
    expect(d.cortante[0][1]).toBeCloseTo(7.5, 3);
    expect(d.cortante.at(-1)![1]).toBeCloseTo(-7.5, 3);
  });

  it("claro interior: negativos en los dos apoyos y el positivo de diseño", () => {
    const w = 2;
    const L = 6;
    const d = diagramas("ambos-continuos", L, (w * L * L) / 11, (w * L * L) / 16, w);
    expect(d.momento[0][1]).toBeCloseTo(-(w * L * L) / 11, 6);
    expect(d.momento.at(-1)![1]).toBeCloseTo(-(w * L * L) / 11, 6);
    expect(extremo(d.momento, (a, b) => a > b)).toBeCloseTo((w * L * L) / 16, 3);
  });

  it("voladizo: −wL²/2 en el empotramiento", () => {
    const d = diagramas("voladizo", 2, 4, 0, 2);
    expect(d.momento[0][1]).toBeCloseTo(-4, 9);
    expect(d.cortante[0][1]).toBeCloseTo(4, 9);
  });

  it("la gráfica coincide con los momentos de la memoria", () => {
    const e = entradaViga(FORMULARIO_VIGA_INICIAL);
    const r = disenarViga(e);
    const [momento] = graficasViga(e, r);
    if (momento.tipo !== "xy") throw new Error();
    expect(extremo(momento.series[0].puntos, (a, b) => a > b)).toBeCloseTo(r.inferior.momento, 2);
  });
});

describe("diagrama de interacción", () => {
  it("el punto de diseño queda dentro y el tope es la carga resistente", () => {
    const e = entradaColumna(FORMULARIO_COLUMNA_INICIAL);
    const r = disenarColumna(e);
    const curva = curvaInteraccion(e, r);
    expect(Math.max(...curva.map((p) => p[1]))).toBeCloseTo(r.cargaResistente, 6);
    // Momento resistente de la curva a la carga de diseño (interpolado).
    const i = curva.findIndex((p, k) => k > 0 && p[1] >= e.carga && curva[k - 1][1] < e.carga);
    const [m0, p0] = curva[i - 1];
    const [m1, p1] = curva[i];
    const m = m0 + ((m1 - m0) * (e.carga - p0)) / (p1 - p0);
    expect(m).toBeCloseTo(r.momentoResistente, 1);
    expect(r.momentoDiseno).toBeLessThan(m);
  });
});

describe("prueba de bombeo", () => {
  it("separa las lecturas usadas de las que no", () => {
    const e = entradaPozo(FORMULARIO_POZO_INICIAL);
    const [g] = graficasPozo(e, disenarPozo(e));
    if (g.tipo !== "xy") throw new Error();
    const usadas = g.series.find((s) => s.nombre === "Lecturas en el tramo recto")!.puntos.length;
    const fuera = g.series.find((s) => s.nombre === "Lecturas sin usar")?.puntos.length ?? 0;
    expect(usadas + fuera).toBe(e.lecturas.length);
    expect(g.x.log).toBe(true);
  });
});

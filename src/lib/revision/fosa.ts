import type { EntradaFosa, ResultadoFosa } from "@/calc/drenaje/fosa";
import { LARGO_MAXIMO_ZANJA, LODO_FRESCO } from "@/calc/drenaje/tablas";
import type { FormularioFosa } from "@/lib/estudios/fosa";
import type { Ejemplo, Revision } from "./tipos";

/**
 * Las revisiones de la fosa séptica, con los mismos criterios de
 * `disenarFosa`: todas pasan exactamente cuando `r.cumple` (lo comprueban
 * las pruebas). La profundidad útil la escoge el usuario y puede fallar; las
 * medidas, el pozo, las zanjas y la trampa las dimensiona el programa, así
 * que siempre pasan y se muestran para ver con qué holgura.
 */
export function revisionesFosa(e: EntradaFosa, r: ResultadoFosa): Revision[] {
  const lodo = e.habitantes * r.acumulacion * LODO_FRESCO;
  const vc = r.medidas.volumenConstruido;
  const rev: Revision[] = [
    {
      nombre: "Profundidad útil mínima",
      actuante: e.profundidad,
      limite: r.profundidades.minima,
      unidad: "m",
      tipo: "minimo",
      nota: `Para ${(r.volumen / 1000).toFixed(2)} m³ la NBR 7229 pide de ${r.profundidades.minima} a ${r.profundidades.maxima} m. Si no pasa, haz la fosa más honda (la planta se achica sola).`,
    },
    {
      nombre: "Profundidad útil máxima",
      actuante: e.profundidad,
      limite: r.profundidades.maxima,
      unidad: "m",
      tipo: "maximo",
      nota: "Más honda no sedimenta bien ni se desazolva fácil. Si no pasa, baja la profundidad (la planta crece sola).",
    },
    {
      nombre: `Volumen útil de ${r.medidas.ancho.toFixed(2)} × ${r.medidas.largo.toFixed(2)} m`,
      actuante: vc,
      limite: r.volumen,
      unidad: "L",
      tipo: "minimo",
      decimales: 0,
      nota: "V = 1 000 + N (C T + K Lf). Ancho y largo los da el programa con el largo cerca del doble del ancho.",
    },
    {
      nombre: "Tiempo de retención con la fosa construida",
      actuante: (vc - 1000 - lodo) / r.contribucion,
      limite: r.retencion,
      unidad: "días",
      tipo: "minimo",
      nota: `Lo que queda libre de lodo entre la contribución de ${r.contribucion.toFixed(0)} L/día, contra T de la tabla.`,
    },
  ];
  if (r.pozo)
    rev.push({
      nombre: `Área de paredes de ${r.pozo.cantidad} pozo${r.pozo.cantidad === 1 ? "" : "s"} de absorción`,
      actuante: r.pozo.areaConstruida,
      limite: r.campo.area,
      unidad: "m²",
      tipo: "minimo",
      decimales: 1,
      nota: `π D h contra la contribución entre la tasa de aplicación del suelo; ${r.pozo.cantidad} de ${r.pozo.diametro} m × ${r.pozo.profundidad.toFixed(1)} m.`,
    });
  else
    rev.push({
      nombre:
        r.campo.zanjas === 1
          ? "Largo de la zanja"
          : `Largo de cada una de las ${r.campo.zanjas} zanjas`,
      actuante: r.campo.longitud / r.campo.zanjas,
      limite: LARGO_MAXIMO_ZANJA,
      unidad: "m",
      tipo: "maximo",
      decimales: 1,
      nota: `${r.campo.area.toFixed(1)} m² de infiltración repartidos en zanjas de hasta ${LARGO_MAXIMO_ZANJA} m.`,
    });
  if (r.trampa)
    rev.push({
      nombre: "Volumen de la trampa de grasas",
      actuante: r.trampa.volumenConstruido,
      limite: r.trampa.volumen,
      unidad: "L",
      tipo: "minimo",
      decimales: 0,
      nota: `${r.trampa.ancho.toFixed(2)} × ${r.trampa.largo.toFixed(2)} m con ${r.trampa.tirante} m de tirante.`,
    });
  return rev;
}

const BASE = {
  inicio: "",
  costoDesazolve: "",
} satisfies Partial<FormularioFosa>;

export const EJEMPLOS_FOSA: Ejemplo<FormularioFosa>[] = [
  {
    nombre: "Casa de 6 personas",
    descripcion:
      "Clima templado, limpieza cada año, 1.5 m de profundidad y zanjas de infiltración.",
    cumple: true,
    valores: {
      ...BASE,
      habitantes: "6",
      aportacion: "120",
      limpieza: "1",
      temperatura: "18",
      profundidad: "1.5",
      tasaAplicacion: "40",
      disposicion: "zanjas",
      trampa: "",
    },
  },
  {
    nombre: "Casa de campo en clima cálido",
    descripcion:
      "8 personas, limpieza cada 2 años, pozo de absorción de 1.5 m y trampa de grasas en la cocina.",
    cumple: true,
    valores: {
      ...BASE,
      habitantes: "8",
      aportacion: "150",
      limpieza: "2",
      temperatura: "24",
      profundidad: "1.8",
      tasaAplicacion: "30",
      disposicion: "pozo",
      diametroPozo: "1.5",
      profundidadMaximaPozo: "4",
      trampa: "si",
      metodoTrampa: "personas",
    },
  },
  {
    nombre: "Fosa demasiado honda",
    descripcion:
      "6 personas en un terreno chico con 2.6 m de profundidad: para ese volumen el máximo es 2.2 m. Baja la profundidad útil y deja que la planta crezca.",
    cumple: false,
    valores: {
      ...BASE,
      habitantes: "6",
      aportacion: "120",
      limpieza: "1",
      temperatura: "16",
      profundidad: "2.6",
      tasaAplicacion: "40",
      disposicion: "zanjas",
      trampa: "",
    },
  },
];

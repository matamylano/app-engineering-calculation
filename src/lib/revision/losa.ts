import {
  ESPESOR_MINIMO,
  type EntradaLosa,
  type ResultadoLosa,
} from "@/calc/concreto/losa";
import type { FormularioLosa } from "@/lib/estudios/losa";
import type { Ejemplo, Revision } from "./tipos";

/**
 * Las revisiones de la losa, con los mismos criterios de `disenarLosa`: todas
 * pasan exactamente cuando `r.cumple` (lo comprueban las pruebas).
 */
export function revisionesLosa(e: EntradaLosa, r: ResultadoLosa): Revision[] {
  const rev: Revision[] = [
    {
      nombre: "Cortante en la franja de 1 m",
      actuante: r.cortante.actuante,
      limite: r.cortante.resistente,
      unidad: "t/m",
      tipo: "maximo",
      nota: "Vu a d del apoyo contra lo que resiste el concreto (la losa no lleva estribos). Si no pasa, aumenta el espesor.",
    },
  ];
  const fl = r.deflexion;
  if (e.h >= r.espesorMinimo - 1e-9 || !fl) {
    rev.push({
      nombre: "Espesor mínimo para omitir flechas",
      actuante: e.h,
      limite: r.espesorMinimo,
      unidad: "cm",
      tipo: "minimo",
      decimales: 1,
      nota: fl
        ? `L / ${ESPESOR_MINIMO[e.apoyo]}. Flecha calculada ${fl.total.toFixed(2)} cm contra ${fl.limite.toFixed(2)} cm, como referencia.`
        : `L / ${ESPESOR_MINIMO[e.apoyo]}.`,
    });
  } else {
    rev.push({
      nombre: "Flecha total contra el límite",
      actuante: fl.total,
      limite: fl.limite,
      unidad: "cm",
      tipo: "maximo",
      nota: `El espesor es menor que L / ${ESPESOR_MINIMO[e.apoyo]} (${r.espesorMinimo.toFixed(1)} cm), así que la flecha calculada rige. Si no pasa, aumenta el espesor.`,
    });
  }
  return rev;
}

export const EJEMPLOS_LOSA: Ejemplo<FormularioLosa>[] = [
  {
    nombre: "Entrepiso de casa",
    descripcion:
      "Claro de 3 m simplemente apoyado, 12 cm de espesor, vivienda.",
    cumple: true,
    valores: {
      apoyo: "simple",
      claro: "3",
      h: "12",
      recubrimiento: "2",
      muerta: "150",
      viva: "190",
      uso: "habitacion",
      vivaSostenida: "42",
      incrementos: true,
      varilla: "3",
      elementosFragiles: false,
    },
  },
  {
    nombre: "Losa continua de oficinas",
    descripcion: "4 m con ambos extremos continuos, 14 cm, más acabados.",
    cumple: true,
    valores: {
      apoyo: "ambos-continuos",
      claro: "4",
      h: "14",
      recubrimiento: "2",
      muerta: "250",
      viva: "250",
      uso: "",
      vivaSostenida: "40",
      incrementos: true,
      varilla: "4",
      elementosFragiles: false,
    },
  },
  {
    nombre: "Losa muy delgada",
    descripcion:
      "4.5 m simplemente apoyada con 10 cm: la flecha no pasa. Sube el espesor hasta que cumpla.",
    cumple: false,
    valores: {
      apoyo: "simple",
      claro: "4.5",
      h: "10",
      recubrimiento: "2",
      muerta: "150",
      viva: "190",
      uso: "habitacion",
      vivaSostenida: "42",
      incrementos: true,
      varilla: "4",
      elementosFragiles: false,
    },
  },
];

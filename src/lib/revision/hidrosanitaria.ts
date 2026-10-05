import type { EntradaCasa, ResultadoCasa } from "@/calc/hidrosanitaria/casa";
import {
  BOMBAS_HP,
  PRESION_MINIMA,
  UD_COLECTOR_100,
  VELOCIDAD_MAXIMA,
} from "@/calc/hidrosanitaria/tablas";
import type { FormularioHidrosanitaria } from "@/lib/estudios/hidrosanitaria";
import type { Ejemplo, Revision } from "./tipos";

const BOMBA_MAXIMA = BOMBAS_HP[BOMBAS_HP.length - 1];
const colocado = (x: { comercial: number; piezas: number }) =>
  x.comercial * x.piezas;

/**
 * Las revisiones de la instalación, con los mismos criterios de
 * `disenarCasa`: todas pasan exactamente cuando `r.cumple` (lo comprueban
 * las pruebas). Las de capacidad (cisterna, tinaco, calentador) siempre
 * pasan porque el cálculo escoge la pieza comercial; se muestran para ver
 * cuánto sobra.
 */
export function revisionesHidrosanitaria(
  e: EntradaCasa,
  r: ResultadoCasa,
): Revision[] {
  const rev: Revision[] = [
    {
      nombre: "Presión en la salida más desfavorable",
      actuante: r.alimentacion.presionDisponible,
      limite: PRESION_MINIMA,
      unidad: "m",
      tipo: "minimo",
      nota: `Altura del tinaco (${e.alturaTinaco} m) menos la fricción en ${e.longitudTinaco} m de tubo con accesorios. Si no pasa, sube el tinaco, acorta el recorrido o usa una bomba presurizadora.`,
    },
    {
      nombre: "Velocidad en la alimentación del tinaco",
      actuante: r.alimentacion.velocidad,
      limite: VELOCIDAD_MAXIMA,
      unidad: "m/s",
      tipo: "maximo",
      nota: `Gasto probable de ${r.gastoProbable.toFixed(2)} L/s en tubo de ${r.alimentacion.nominal}.`,
    },
    {
      nombre: "Velocidad en la línea de bombeo",
      actuante: r.bomba.velocidad,
      limite: VELOCIDAD_MAXIMA,
      unidad: "m/s",
      tipo: "maximo",
      nota: `${r.bomba.gasto.toFixed(2)} L/s para llenar el tinaco en ${e.tiempoLlenado} min, en tubo de ${r.bomba.nominal}. Si no pasa, da más tiempo de llenado.`,
    },
    {
      nombre: "Potencia de la bomba",
      actuante: r.bomba.potencia,
      limite: BOMBA_MAXIMA,
      unidad: "HP",
      tipo: "maximo",
      nota: `Q · H / (76 η) con ${r.bomba.carga.toFixed(1)} m de carga; la tabla de bombas para casa llega a ${BOMBA_MAXIMA} HP. Si no pasa, da más tiempo de llenado o baja el desnivel.`,
    },
    {
      nombre: "Descargas en el colector de 100 mm",
      actuante: r.drenaje.unidadesDescarga,
      limite: UD_COLECTOR_100,
      unidad: "UD",
      tipo: "maximo",
      decimales: 0,
      nota: "Unidades de descarga que lleva un colector de 100 mm al 2 %. Si no pasa, divide el drenaje en dos colectores.",
    },
    {
      nombre: "Capacidad de la cisterna",
      actuante: colocado(r.cisterna),
      limite: r.cisterna.requerido,
      unidad: "L",
      tipo: "minimo",
      decimales: 0,
      nota: `Demanda de ${Math.round(r.demandaDiaria)} L/día por ${e.diasCisterna} días de reserva.`,
    },
    {
      nombre: "Capacidad del tinaco",
      actuante: colocado(r.tinaco),
      limite: r.tinaco.requerido,
      unidad: "L",
      tipo: "minimo",
      decimales: 0,
      nota: `Demanda de ${Math.round(r.demandaDiaria)} L/día por ${e.diasTinaco} días de reserva.`,
    },
  ];
  const c = r.calentador;
  if (c)
    rev.push({
      nombre: "Capacidad del calentador",
      actuante: colocado(c),
      limite: c.requerido,
      unidad: c.unidad,
      tipo: "minimo",
      decimales: c.unidad === "L" ? 0 : 1,
      nota:
        c.tipo === "paso"
          ? `${c.regaderas} regaderas a la vez, llevadas a la capacidad comercial con 25 °C de aumento.`
          : c.tipo === "deposito"
            ? "Baño de la hora pico convertido a agua de 60 °C entre la fracción útil del depósito."
            : "Agua caliente de todo el día.",
    });
  return rev;
}

const MUEBLES_CASA = {
  excusado: "2",
  lavabo: "2",
  regadera: "2",
  tina: "0",
  fregadero: "1",
  lavavajillas: "0",
  lavadero: "1",
  lavadora: "1",
  llaveJardin: "1",
};

export const EJEMPLOS_HIDROSANITARIA: Ejemplo<FormularioHidrosanitaria>[] = [
  {
    nombre: "Casa de 2 niveles",
    descripcion:
      "5 habitantes, 2 baños, tinaco 4 m arriba de la regadera y calentador de paso.",
    cumple: true,
    valores: {
      habitantes: "5",
      dotacion: "150",
      diasCisterna: "2",
      diasTinaco: "1",
      muebles: MUEBLES_CASA,
      alturaTinaco: "4",
      longitudTinaco: "15",
      alturaBombeo: "7",
      longitudBombeo: "10",
      tiempoLlenado: "30",
      calentador: "paso",
      regaderasSimultaneas: "",
      consumoCaliente: "",
      temperaturaFria: "",
      longitudDrenaje: "12",
    },
  },
  {
    nombre: "Casa con tandeo y solar",
    descripcion:
      "6 habitantes, 3 baños, 5 días de cisterna por tandeo y calentador solar.",
    cumple: true,
    valores: {
      habitantes: "6",
      dotacion: "200",
      diasCisterna: "5",
      diasTinaco: "1",
      muebles: { ...MUEBLES_CASA, excusado: "3", lavabo: "3", regadera: "3" },
      alturaTinaco: "5",
      longitudTinaco: "20",
      alturaBombeo: "9",
      longitudBombeo: "14",
      tiempoLlenado: "40",
      calentador: "solar",
      regaderasSimultaneas: "",
      consumoCaliente: "",
      temperaturaFria: "",
      longitudDrenaje: "18",
    },
  },
  {
    nombre: "Tinaco muy bajo",
    descripcion:
      "El tinaco queda a 1.5 m de la regadera, con 25 m de tubo: no da presión. Súbelo o acorta el recorrido.",
    cumple: false,
    valores: {
      habitantes: "4",
      dotacion: "150",
      diasCisterna: "2",
      diasTinaco: "1",
      muebles: MUEBLES_CASA,
      alturaTinaco: "1.5",
      longitudTinaco: "25",
      alturaBombeo: "6",
      longitudBombeo: "10",
      tiempoLlenado: "30",
      calentador: "deposito",
      regaderasSimultaneas: "",
      consumoCaliente: "",
      temperaturaFria: "",
      longitudDrenaje: "",
    },
  },
];

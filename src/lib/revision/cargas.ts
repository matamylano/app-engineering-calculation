import {
  NIVEL_AZOTEA,
  NIVEL_ENTREPISO,
  type FormularioCargas,
} from "@/lib/estudios/cargas";
import type { Ejemplo } from "./tipos";

/**
 * Ejemplos de la bajada de cargas. Es un cálculo de cargas sin cumple o no
 * cumple (la zapata se dimensiona con qa, no se revisa), así que todos
 * calculan y se marcan como `cumple`.
 */
export const EJEMPLOS_CARGAS: Ejemplo<FormularioCargas>[] = [
  {
    nombre: "Casa de 1 nivel",
    descripcion:
      "Azotea de losa maciza de 10 cm sobre muros de tabique; tres columnas típicas y qa = 10 t/m².",
    cumple: true,
    valores: {
      niveles: [{ ...NIVEL_AZOTEA }],
      elementos: [
        { nombre: "C-1 (esquina)", area: "4", pesoPropio: "0.3" },
        { nombre: "C-2 (borde)", area: "8", pesoPropio: "0.3" },
        { nombre: "C-3 (central)", area: "14", pesoPropio: "0.3" },
      ],
      qa: "10",
      incremento: "10",
    },
  },
  {
    nombre: "Casa de 2 niveles",
    descripcion:
      "Azotea y entrepiso de 12 cm con muros divisorios de tabique; columnas de esquina, borde y centro.",
    cumple: true,
    valores: {
      niveles: [
        { ...NIVEL_AZOTEA, sistema: "maciza-12", espesor: "12" },
        {
          ...NIVEL_ENTREPISO,
          sistema: "maciza-12",
          espesor: "12",
          tipoMuro: "tabique-rojo",
          alturaMuro: "2.5",
          longitudMuro: "18",
          areaNivel: "60",
        },
      ],
      elementos: [
        { nombre: "C-1 (esquina)", area: "5", pesoPropio: "0.4" },
        { nombre: "C-2 (borde)", area: "10", pesoPropio: "0.4" },
        { nombre: "C-3 (central)", area: "18", pesoPropio: "0.4" },
      ],
      qa: "12",
      incremento: "10",
    },
  },
  {
    nombre: "Local comercial",
    descripcion:
      "Planta baja comercial con vigueta y bovedilla y azotea; claros de 6 m y suelo de qa = 8 t/m².",
    cumple: true,
    valores: {
      niveles: [
        {
          ...NIVEL_AZOTEA,
          sistema: "vigueta-bovedilla-concreto",
          pesoSistema: "270",
        },
        {
          ...NIVEL_ENTREPISO,
          nombre: "Entrepiso (local)",
          uso: "comercio",
          sistema: "vigueta-bovedilla-concreto",
          pesoSistema: "270",
          acabados: "150",
          tipoMuro: "block-concreto",
          alturaMuro: "3",
          longitudMuro: "12",
          areaNivel: "108",
        },
      ],
      elementos: [
        { nombre: "C-1 (esquina)", area: "9", pesoPropio: "0.5" },
        { nombre: "C-2 (borde)", area: "18", pesoPropio: "0.5" },
        { nombre: "C-3 (central)", area: "36", pesoPropio: "0.5" },
      ],
      qa: "8",
      incremento: "10",
    },
  },
];

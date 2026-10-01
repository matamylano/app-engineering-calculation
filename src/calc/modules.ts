/** Catálogo de módulos de cálculo. Agrega aquí cada módulo nuevo. */
export interface CalcModule {
  slug: string;
  title: string;
  area: string;
  description: string;
  href: string;
}

export const CALC_MODULES: CalcModule[] = [
  {
    slug: "capacidad-de-carga",
    title: "Capacidad de carga de suelos",
    area: "Cimentaciones",
    description:
      "Capacidad última y admisible de cimentaciones superficiales (corrida, cuadrada o circular) con la ecuación de Terzaghi.",
    href: "/cimentaciones/capacidad-de-carga",
  },
];

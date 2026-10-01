/** Catálogo de la suite: paquetes y los estudios de cada uno. */

export type Availability = "disponible" | "proximamente";

export interface Study {
  slug: string;
  title: string;
  description: string;
  status: Availability;
  href?: string;
}

export interface Package {
  slug: string;
  title: string;
  description: string;
  status: Availability;
  href?: string;
  studies: Study[];
}

export const PACKAGES: Package[] = [
  {
    slug: "civil",
    title: "Ingeniería civil",
    description: "Estudios de suelos, cálculo estructural, pozos y drenaje, con memoria lista para firma.",
    status: "disponible",
    href: "/civil",
    studies: [
      {
        slug: "suelos",
        title: "Estudio de mecánica de suelos",
        description: "Clasificación SUCS, capacidad de carga y asentamientos.",
        status: "disponible",
        href: "/civil/suelos",
      },
      {
        slug: "estructuras",
        title: "Cálculo estructural de casa habitación",
        description: "Bajada de cargas, losa, viga, columna y zapata.",
        status: "proximamente",
      },
      {
        slug: "hidrosanitaria",
        title: "Instalación hidráulica y sanitaria",
        description: "Gastos, diámetros, cisterna, tinaco y bomba.",
        status: "proximamente",
      },
      {
        slug: "pozos",
        title: "Pozos y tuberías",
        description: "Ademe y rejilla, columna y bomba, prueba de bombeo.",
        status: "proximamente",
      },
      {
        slug: "drenaje",
        title: "Drenaje pluvial y fosa séptica",
        description: "Gasto pluvial, pozos de absorción y fosas sépticas.",
        status: "proximamente",
      },
    ],
  },
  {
    slug: "paquete-2",
    title: "Paquete 2",
    description: "Próximamente.",
    status: "proximamente",
    studies: [],
  },
  {
    slug: "paquete-3",
    title: "Paquete 3",
    description: "Próximamente.",
    status: "proximamente",
    studies: [],
  },
];

export const getPackage = (slug: string) => PACKAGES.find((p) => p.slug === slug);

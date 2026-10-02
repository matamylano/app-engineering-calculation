"use client";

import { botonPrimario } from "./ui";

export default function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className={botonPrimario}>
      Descargar PDF
    </button>
  );
}

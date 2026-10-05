import { Field } from "@/components/form";
import type { FormularioObra } from "@/calc/obra/cuantificacion";

/** Piezas iguales y precios unitarios para la cuantificación. */
export default function CamposObra({
  valores,
  onChange,
  materiales = ["concreto", "acero", "cimbra"],
}: {
  valores: FormularioObra;
  onChange: (k: keyof FormularioObra, v: string) => void;
  materiales?: ("concreto" | "acero" | "cimbra")[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Piezas iguales" value={valores.piezas} onChange={(v) => onChange("piezas", v)} />
      {materiales.includes("concreto") && (
        <Field label="Precio del concreto" unit="$/m³" value={valores.precioConcreto} onChange={(v) => onChange("precioConcreto", v)} placeholder="Sin precio" />
      )}
      {materiales.includes("acero") && (
        <Field label="Precio del acero" unit="$/kg" value={valores.precioAcero} onChange={(v) => onChange("precioAcero", v)} placeholder="Sin precio" />
      )}
      {materiales.includes("cimbra") && (
        <Field label="Precio de la cimbra" unit="$/m²" value={valores.precioCimbra} onChange={(v) => onChange("precioCimbra", v)} placeholder="Sin precio" />
      )}
    </div>
  );
}

/** Íconos de línea (24×24, trazo de 1.75) para los paquetes y estudios. */
const TRAZOS: Record<string, string[]> = {
  civil: ["M3 21h18", "M5 21V10l7-5 7 5v11", "M9 21v-6h6v6", "M9 10h.01M15 10h.01"],
  suelos: ["M3 7h18", "M3 12h18", "M3 17h18", "M7 7v5M15 12v5M11 17v4M18 7V3"],
  cargas: ["M12 3v12", "M7 10l5 5 5-5", "M4 19h16", "M6 19v2M18 19v2"],
  zapata: ["M10 3h4v9h-4z", "M4 12h16v5H4z", "M2 21h20"],
  viga: ["M3 9h18v5H3z", "M3 18l2-4M21 18l-2-4", "M8 5l1 3M12 4v4M16 5l-1 3"],
  losa: ["M3 10h18v4H3z", "M5 14v6M19 14v6", "M7 6l1 3M12 5v4M17 6l-1 3"],
  columna: ["M8 3h8v18H8z", "M8 7h8M8 11h8M8 15h8", "M5 21h14"],
  estructuras: ["M3 8h18v8H3z", "M3 12h18M12 8v8"],
  hidrosanitaria: ["M12 3s-5 6-5 10a5 5 0 0 0 10 0c0-4-5-10-5-10z", "M10 14a2 2 0 0 0 2 2"],
  pozo: ["M6 3h12", "M8 3v18M16 3v18", "M8 13h8", "M12 7v4M10 9l2 2 2-2", "M8 17h8"],
  pluvial: ["M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 15", "M8 18l-1 2M12 18l-1 2M16 18l-1 2"],
  fosa: ["M3 8h18", "M5 8v11h14V8", "M10 8v7M14 8v4", "M7 4h3M14 4h3"],
  paquete: ["M4 7l8-4 8 4-8 4z", "M4 7v10l8 4 8-4V7", "M12 11v10"],
  flecha: ["M5 12h14", "M13 6l6 6-6 6"],
  documento: ["M7 3h7l5 5v13H7z", "M14 3v5h5", "M10 13h6M10 17h6"],
  firma: ["M3 17c3-1 5-6 7-6s0 6 2 6 3-4 5-4 2 2 4 2", "M3 21h18"],
  credito: ["M3 7h18v10H3z", "M3 11h18", "M7 15h3"],
  regla: ["M3 17L17 3l4 4L7 21z", "M7 13l2 2M10 10l2 2M13 7l2 2"],
};

export default function Icono({ nombre, className = "size-5" }: { nombre: string; className?: string }) {
  const trazos = TRAZOS[nombre] ?? TRAZOS.paquete;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {trazos.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

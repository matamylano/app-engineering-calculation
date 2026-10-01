import MemoriaCargas from "@/app/civil/cargas/MemoriaCargas";
import Memoria, { snapshotDe } from "@/app/civil/suelos/Memoria";
import MemoriaColumna from "@/app/civil/columna/MemoriaColumna";
import MemoriaLosa from "@/app/civil/losa/MemoriaLosa";
import MemoriaViga from "@/app/civil/viga/MemoriaViga";
import MemoriaZapata from "@/app/civil/zapata/MemoriaZapata";
import type { RegistroMemoria } from "@/lib/servidor/tipos";

/** La memoria de cualquier estudio, según su tipo. */
export default function MemoriaDeRegistro({ m }: { m: RegistroMemoria }) {
  switch (m.estudio) {
    case "cargas":
      return <MemoriaCargas m={m} />;
    case "columna":
      return <MemoriaColumna m={m} />;
    case "losa":
      return <MemoriaLosa m={m} />;
    case "viga":
      return <MemoriaViga m={m} />;
    case "zapata":
      return <MemoriaZapata m={m} />;
    default:
      return <Memoria snapshot={snapshotDe(m)} />;
  }
}

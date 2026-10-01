import MemoriaCargas from "@/app/civil/cargas/MemoriaCargas";
import Memoria, { snapshotDe } from "@/app/civil/suelos/Memoria";
import MemoriaZapata from "@/app/civil/zapata/MemoriaZapata";
import type { RegistroMemoria } from "@/lib/servidor/tipos";

/** La memoria de cualquier estudio, según su tipo. */
export default function MemoriaDeRegistro({ m }: { m: RegistroMemoria }) {
  switch (m.estudio) {
    case "cargas":
      return <MemoriaCargas m={m} />;
    case "zapata":
      return <MemoriaZapata m={m} />;
    default:
      return <Memoria snapshot={snapshotDe(m)} />;
  }
}

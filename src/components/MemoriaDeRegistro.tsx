import MemoriaCargas from "@/app/civil/cargas/MemoriaCargas";
import Memoria, { snapshotDe } from "@/app/civil/suelos/Memoria";
import type { RegistroMemoria } from "@/lib/servidor/tipos";

/** La memoria de cualquier estudio, según su tipo. */
export default function MemoriaDeRegistro({ m }: { m: RegistroMemoria }) {
  return m.estudio === "cargas" ? <MemoriaCargas m={m} /> : <Memoria snapshot={snapshotDe(m)} />;
}

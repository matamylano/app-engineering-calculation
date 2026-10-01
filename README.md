# Suite de Ingeniería

Suite web de estudios de ingeniería con memoria de cálculo lista para firma. Hecha con Next.js y TypeScript, lista para desplegar en Vercel.

## Paquetes

| Paquete | Estudio | Estado |
| --- | --- | --- |
| Ingeniería civil | Mecánica de suelos: clasificación SUCS, capacidad de carga (Terzaghi, con nivel freático), asentamientos inmediatos y por consolidación | Disponible |
| Ingeniería civil | Bajada de cargas: cargas por nivel (NTC Criterios y Acciones), carga por columna o muro y tamaño de zapata | Disponible |
| Ingeniería civil | Zapata aislada (NTC Concreto): tamaño, penetración, cortante como viga ancha, flexión y armado | Disponible |
| Ingeniería civil | Viga de concreto: momentos y cortante por tipo de apoyo, acero arriba y abajo, estribos y peralte mínimo | Disponible |
| Ingeniería civil | Losa maciza en una dirección: acero por metro arriba y abajo, temperatura, cortante y espesor mínimo | Disponible |
| Ingeniería civil | Columna de concreto: flexocompresión por compatibilidad de deformaciones, excentricidad mínima, esbeltez, acero longitudinal y estribos | Disponible |
| Ingeniería civil | Losa en dos direcciones, instalación hidrosanitaria, pozos, drenaje | Próximamente |
| Paquetes 2 y 3 | Por definir | Próximamente |

Normas: NTC-CDMX 2023 (Cimentaciones, Criterios y Acciones, Concreto), ASTM D2487. Mientras el ingeniero responsable no valide las fórmulas de un estudio, `enValidacion` en `src/lib/estudios/registro.ts` y `src/calc/suite.ts` muestra el aviso «En validación». Unidades de obra (t/m², t/m³, kg/cm²) o SI; el motor calcula en SI.

## Estructura

- `src/calc/`: motor de cálculo. Funciones puras, sin interfaz, cada una con pruebas (`*.test.ts`).
  - `soils/`: SUCS, Terzaghi, asentamientos y el estudio completo (`study.ts`).
  - `cargas/`: bajada de cargas (en kg/m² y t, como se usa en obra).
  - `concreto/`: diseño de elementos de concreto reforzado; `ntc.ts` junta las constantes de las NTC de Concreto para que el ingeniero responsable las revise.
  - `units.ts`: conversión entre SI y unidades de obra.
  - `suite.ts`: catálogo de paquetes y estudios que muestra la página inicial.
- `src/app/`: páginas. `/` (paquetes), `/civil` (estudios del paquete civil), `/civil/suelos` (estudio), `/entrar`, `/cuenta` (créditos y memorias), `/memorias/[folio]`, `/firma` (panel del ingeniero).
- `src/lib/estudios/`: formulario de cada estudio y su registro (`registro.ts`: prefijo de folio, ruta y cálculo en el servidor).
- `src/lib/servidor/`: cuentas, créditos, memorias y pagos (solo servidor). Ver [docs/cuentas-pagos-y-firma.md](docs/cuentas-pagos-y-firma.md).
- `supabase/migrations/`: tablas y funciones de Supabase.
- `src/lib/whatsapp/` y `src/lib/ventas/`: conexión con el Hub de WhatsApp y el agente de ventas. Ver [docs/whatsapp-y-ventas.md](docs/whatsapp-y-ventas.md).

## Desarrollo

Sin variables de entorno la app corre en **modo demostración**: entras con cualquier correo y el código `123456`, los pagos se simulan y `firmante@demo.mx` abre el panel de firma.

```bash
npm install
npm run dev        # http://localhost:3000
npm test
npm run lint
npm run typecheck
npm run build
```

## Validación

Ningún estudio se publica hasta que el ingeniero responsable reproduzca sus casos de validación. Nc y Nq usan las expresiones cerradas de Terzaghi; Nγ se interpola en la tabla de Kumbhojkar (1993).

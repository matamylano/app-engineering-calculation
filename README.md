# Suite de Ingeniería

Suite web de estudios de ingeniería con memoria de cálculo lista para firma. Hecha con Next.js y TypeScript, lista para desplegar en Vercel.

## Paquetes

| Paquete | Estudio | Estado |
| --- | --- | --- |
| Ingeniería civil | Mecánica de suelos: clasificación SUCS, capacidad de carga (Terzaghi, con nivel freático), asentamientos inmediatos y por consolidación | Disponible |
| Ingeniería civil | Estructuras, instalación hidrosanitaria, pozos, drenaje | Próximamente |
| Paquetes 2 y 3 | Por definir | Próximamente |

Normas: NTC-CDMX 2023 (Cimentaciones), ASTM D2487. Unidades de obra (t/m², t/m³, kg/cm²) o SI; el motor calcula en SI.

## Estructura

- `src/calc/`: motor de cálculo. Funciones puras, sin interfaz, cada una con pruebas (`*.test.ts`).
  - `soils/`: SUCS, Terzaghi, asentamientos y el estudio completo (`study.ts`).
  - `units.ts`: conversión entre SI y unidades de obra.
  - `suite.ts`: catálogo de paquetes y estudios que muestra la página inicial.
- `src/app/`: páginas. `/` (paquetes), `/civil` (estudios del paquete civil), `/civil/suelos` (estudio y memoria).
- `src/lib/credits.ts`: créditos de cálculo. **Provisional**: se guardan en el navegador (5 gratis) y no hay cobro.

## Desarrollo

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

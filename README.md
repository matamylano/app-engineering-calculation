# Cálculos de ingeniería civil

App web con calculadoras de ingeniería civil. Hecha con Next.js y TypeScript, lista para desplegar en Vercel.

## Módulos

| Área | Módulo | Método |
| --- | --- | --- |
| Cimentaciones | Capacidad de carga de suelos | Terzaghi (corrida, cuadrada, circular; falla general o local) |

## Estructura

- `src/calc/`: motor de cálculo. Funciones puras, sin interfaz, cada una con sus pruebas (`*.test.ts`). Todo en unidades SI.
- `src/calc/modules.ts`: catálogo de módulos que muestra la página de inicio.
- `src/app/`: páginas. Cada módulo vive en `src/app/<área>/<módulo>/`.

Para agregar un módulo: escribe la función y sus pruebas en `src/calc/<módulo>/`, crea la página en `src/app/` y regístrala en `src/calc/modules.ts`.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pruebas del motor de cálculo
npm run lint
npm run typecheck
npm run build
```

## Validación

Los resultados deben compararse contra casos reales o ejemplos resueltos antes de usarse en proyectos. Nc y Nq coinciden con la tabla de Terzaghi; Nγ usa la aproximación de Coduto (2001), que da alrededor de 5 % más que la tabla de Kumbhojkar para φ entre 30° y 40°.

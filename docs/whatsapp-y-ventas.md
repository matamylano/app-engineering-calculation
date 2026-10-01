# WhatsApp (Hub) y agente de ventas

La suite se conecta a dos apps propias:

- **Hub** (`matamylano/hub`): manda y recibe WhatsApp por Zernio, Meta directo o simulado, y monitorea la salud de cada app. Se habla con él por el Protocolo Hub v1.
- **Agente de ventas** (`matamylano/agentsales`): recibe prospectos y los atiende por WhatsApp a través del Hub.

Sin variables de entorno, todo funciona en **modo simulado**: nada sale a WhatsApp ni al agente, y solo se registra en los logs.

## Qué hay hoy

| Qué | Dónde |
| --- | --- |
| SDK del Hub (copia, no se edita aquí) | `src/lib/whatsapp/hub-cliente.ts`, `src/lib/whatsapp/whatsapp-conector.ts` |
| Conector según `WHATSAPP_MODO` | `src/lib/whatsapp/index.ts` |
| Salud para el monitoreo del Hub | `GET /api/hub/salud` |
| Eventos firmados del Hub (se verifican y se registran) | `POST /api/hub/webhook` |
| Envío de prospectos al agente | `src/lib/ventas/agentsales.ts` → `POST {AGENTSALES_URL}/api/leads` |
| Formulario «quiero que me contacten» | `POST /api/ventas/lead`, componente `ContactoVentas` |

El formulario aparece en el estudio de suelos en dos momentos: al generar la memoria («¿No tienes quién firme?», interés `firma`) y cuando se acaban los créditos (interés `creditos`). El prospecto llega al agente con `fuente: "suite-ingenieria"`, `especialidad` = el estudio y `datos_extra.interes`.

## Variables

| Variable | Para qué |
| --- | --- |
| `WHATSAPP_MODO` | `simulado` (por defecto), `directo` o `hub` |
| `HUB_URL`, `HUB_API_KEY` | Mandar mensajes por el Hub |
| `HUB_WEBHOOK_SECRETO` | Verificar los eventos que manda el Hub |
| `AGENTSALES_URL` | URL del agente de ventas, por ejemplo `https://agentsales.vercel.app` |
| `AGENTSALES_API_KEY` | El `ADMIN_API_KEY` del agente |
| `AGENTSALES_TENANT_ID` | Tenant del agente que vende la suite |

## Conectar en producción

1. En el dashboard del Hub: Conexiones → Conectar nueva app, con la URL de la suite y el webhook `…/api/hub/webhook`. Capacidades: `whatsapp`.
2. En Vercel de la suite: `HUB_URL`, `HUB_API_KEY`, `HUB_WEBHOOK_SECRETO` y `WHATSAPP_MODO=hub`.
3. En agentsales: crear un tenant para la suite y un `config_modo` de venta de estudios de ingeniería (prompt, criterios y objeciones). Poner `AGENTSALES_URL`, `AGENTSALES_API_KEY` y `AGENTSALES_TENANT_ID` en la suite.
4. En el Hub, enrutar el número de WhatsApp de ventas al agente (capacidad `agente-ventas`).

## Lo que sigue

Cuando existan cuentas y pagos, la suite mandará avisos propios por el Hub: memoria lista, memoria firmada por el ingeniero, pago recibido y créditos por acabarse. Esos avisos usan plantillas aprobadas y una `clave` por memoria para no duplicar.

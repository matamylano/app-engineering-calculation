# Correr la suite en Docker

Necesitas Docker Desktop (o Docker Engine con Compose).

```bash
git clone https://github.com/matamylano/app-engineering-calculation.git
cd app-engineering-calculation
docker compose up --build
```

Abre http://localhost:3000. La primera vez tarda unos minutos en construir.

## Modo demostración (sin configurar nada)

Sin archivo `.env` la app corre completa con datos en memoria:

- **Entrar:** cualquier correo y el código `123456`. Recibes 5 créditos.
- **Comprar créditos:** «Mi cuenta» te lleva a `/pagos/demo`, donde confirmas el pago simulado.
- **Firmar:** entra con `firmante@demo.mx` para ver el panel `/firma`, subir firma y sello, y aprobar o pedir cambios.
- **WhatsApp:** los avisos se simulan y solo se registran en la consola (`docker compose logs -f`).

Todo se borra al detener el contenedor.

## Con servicios reales

Copia `.env.example` a `.env`, llena lo que quieras probar y vuelve a correr `docker compose up`. No hace falta reconstruir para cambiar variables.

- **Supabase:** las tres variables `SUPABASE_*` y `SESION_SECRETO` activan cuentas y base de datos reales. Los pasos para crear el proyecto están en [cuentas-pagos-y-firma.md](cuentas-pagos-y-firma.md).
- **Stripe en modo prueba:** usa la llave `sk_test_...`. Para que el webhook llegue a tu máquina, corre `stripe listen --forward-to localhost:3000/api/pagos/stripe` y pon el `whsec_...` que imprime en `STRIPE_WEBHOOK_SECRET`.
- **WhatsApp por el Hub:** `WHATSAPP_MODO=hub`, `HUB_URL` y `HUB_API_KEY`.

`GET http://localhost:3000/api/hub/salud` dice qué quedó configurado.

## Comandos útiles

```bash
docker compose up --build -d   # en segundo plano
docker compose logs -f         # ver la consola
docker compose down            # detener
```

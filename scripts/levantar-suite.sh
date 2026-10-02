#!/usr/bin/env bash
# Levanta la suite de ingeniería en Docker (Mac o Linux).
# Uso: bash levantar-suite.sh
set -e

REPO="https://github.com/matamylano/app-engineering-calculation.git"
RAMA="claude/project-thread-pkufzc"
CARPETA="$HOME/app-engineering-calculation"

command -v git >/dev/null || { echo "Falta git. En Mac instálalo con: xcode-select --install"; exit 1; }
command -v docker >/dev/null || { echo "Falta Docker. Instala Docker Desktop: https://www.docker.com/products/docker-desktop/"; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker no está corriendo. Abre Docker Desktop, espera a que diga 'running' y vuelve a correr este archivo."; exit 1; }

if [ ! -d "$CARPETA/.git" ]; then
  echo "Descargando el proyecto en $CARPETA ..."
  git clone "$REPO" "$CARPETA"
fi

cd "$CARPETA"
echo "Actualizando a la última versión ..."
git fetch origin "$RAMA"
git checkout "$RAMA"
git pull --ff-only origin "$RAMA"

echo
echo "Construyendo y levantando. La primera vez tarda unos minutos."
echo "Cuando veas 'Ready', abre http://localhost:3000"
echo "Entra con cualquier correo y el código 123456. Para detener: Ctrl+C"
echo
docker compose up --build

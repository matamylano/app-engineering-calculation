# Levanta la suite de ingeniería en Docker (Windows).
# Uso: clic derecho > "Ejecutar con PowerShell"
$ErrorActionPreference = "Stop"

$Repo = "https://github.com/matamylano/app-engineering-calculation.git"
$Rama = "claude/project-thread-pkufzc"
$Carpeta = Join-Path $HOME "app-engineering-calculation"

function Salir($msg) { Write-Host $msg -ForegroundColor Red; Read-Host "Presiona Enter para cerrar"; exit 1 }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Salir "Falta git. Instálalo de https://git-scm.com/download/win" }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Salir "Falta Docker. Instala Docker Desktop: https://www.docker.com/products/docker-desktop/" }
docker info *> $null
if ($LASTEXITCODE -ne 0) { Salir "Docker no está corriendo. Abre Docker Desktop, espera a que diga 'running' y vuelve a correr este archivo." }

$ErrorActionPreference = "Continue"
if (-not (Test-Path (Join-Path $Carpeta ".git"))) {
  Write-Host "Descargando el proyecto en $Carpeta ..."
  git clone $Repo $Carpeta
  if ($LASTEXITCODE -ne 0) { Salir "No se pudo descargar. Revisa tu usuario y token de GitHub." }
}

Set-Location $Carpeta
Write-Host "Actualizando a la última versión ..."
git fetch origin $Rama
git checkout $Rama
git pull --ff-only origin $Rama

Write-Host ""
Write-Host "Construyendo y levantando. La primera vez tarda unos minutos."
Write-Host "Cuando veas 'Ready', abre http://localhost:3000"
Write-Host "Entra con cualquier correo y el código 123456. Para detener: Ctrl+C"
Write-Host ""
docker compose up --build
Read-Host "Presiona Enter para cerrar"

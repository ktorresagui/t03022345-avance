#!/bin/bash
set -e

echo "======================================"
echo "  Volaris – Sistema de Reservas       "
echo "======================================"

if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker no está instalado."
  exit 1
fi

if [ -n "$1" ]; then
  echo "Clonando repositorio: $1"
  git clone "$1" volaris-app
  cd volaris-app
fi

echo "Construyendo contenedores..."
docker compose build --no-cache

echo "Iniciando servicios..."
docker compose up -d

echo ""
echo "Aplicación disponible en: http://localhost:8080"
echo "Para ver logs: docker compose logs -f"

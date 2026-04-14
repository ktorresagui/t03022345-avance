#!/bin/bash
# =============================================================================
# start_app.sh – Inicia la aplicación Volaris
# =============================================================================
# Programar con cron para encender automáticamente:
#
#   crontab -e
#
#   Encender todos los días a las 6:00 AM:
#   0 6 * * *    /ruta/volaris/start_app.sh >> /var/log/volaris.log 2>&1
#
#   Encender lunes a sábado a las 7:00 AM:
#   0 7 * * 1-6  /ruta/volaris/start_app.sh >> /var/log/volaris.log 2>&1
# =============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${PURPLE}[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando Volaris...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${RED} Docker no encontrado.${NC}"
  exit 1
fi

docker compose up -d

if [ $? -eq 0 ]; then
  echo -e "${GREEN} Volaris iniciada correctamente${NC}"
  echo -e "Accede en: http://localhost:8080"
else
  echo -e "${RED} Error al iniciar los contenedores${NC}"
  exit 1
fi
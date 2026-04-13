#!/bin/bash
# backup.sh – Respaldo de base de datos y logs de Volaris
#
# Uso:
#   ./backup.sh              → backup local
#   ./backup.sh --s3 bucket  → backup + subir a S3
#
# Cron diario a las 3:00 AM:
#   0 3 * * * /ruta/volaris/backup.sh >> /var/log/volaris-backup.log 2>&1

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DIR="./backups"
mkdir -p "$DIR"

echo "=== Backup Volaris - $TIMESTAMP ==="

# Backup MongoDB
if docker ps | grep -q volaris-mongodb; then
  docker exec volaris-mongodb mongodump --db=volaris --archive --gzip > "$DIR/db_$TIMESTAMP.gz"
  echo "BD guardada: $DIR/db_$TIMESTAMP.gz"
else
  echo "Contenedor MongoDB no activo, omitiendo backup de BD."
fi

# Backup logs
VOL=$(docker volume ls --format '{{.Name}}' | grep app_logs | head -1)
if [ -n "$VOL" ]; then
  docker run --rm -v "$VOL:/logs" -v "$(pwd)/backups:/out" alpine \
    tar czf "/out/logs_$TIMESTAMP.tar.gz" -C /logs .
  echo "Logs guardados: $DIR/logs_$TIMESTAMP.tar.gz"
fi

# Subir a S3
if [ "$1" = "--s3" ] && [ -n "$2" ]; then
  aws s3 cp "$DIR/db_$TIMESTAMP.gz"   "s3://$2/backups/db/"   2>/dev/null && echo "BD subida a S3"
  aws s3 cp "$DIR/logs_$TIMESTAMP.tar.gz" "s3://$2/backups/logs/" 2>/dev/null && echo "Logs subidos a S3"
fi

# Limpiar backups viejos (+7 días)
find "$DIR" -name "*.gz" -mtime +7 -delete
echo "=== Backup completado ==="

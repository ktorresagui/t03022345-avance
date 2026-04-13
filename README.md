# Volaris – Sistema de Reservas de Vuelos

Aplicación web fullstack para búsqueda y reserva de vuelos nacionales con tarifas por tipo (Básica, Clásica, Flexible).

---

## Descripción

Sistema que permite a los usuarios:
- Buscar vuelos por origen, destino y fecha
- Comparar tarifas (Básica / Clásica / Flexible) con diferente equipaje incluido
- Registrar reservas con nombre y correo del pasajero
- Consultar el historial de reservas

---

## Arquitectura

```
Usuario → Navegador
             ↓ :8080
        Frontend (nginx)
             ↓ /api/*
        Backend (Express :3000)
             ↓
        MongoDB (:27017)
```

| Servicio          | Tecnología      | Puerto     |
|-------------------|-----------------|-----------|
| volaris-frontend  | nginx + HTML/Vue CDN | 8080  |
| volaris-backend   | Node.js + Express   | 3000 (interno) |
| volaris-mongodb   | MongoDB 6           | 27017 (interno) |

---

## Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript, Vue.js 3 (CDN), nginx
- **Backend:** Node.js, Express, Winston (logs)
- **Base de datos:** MongoDB 6
- **Contenedores:** Docker, Docker Compose
- **Nube:** AWS CloudFormation (EC2 + S3)
- **Automatización:** Bash

---

## Ejecución local (Docker)

```bash
# 1. Clonar repositorio
git clone <URL_DEL_REPO>
cd volaris

# 2. Permisos a scripts
chmod +x start.sh stop.sh backup.sh

# 3. Levantar
./start.sh

# 4. Abrir en navegador
http://localhost:8080
```

O directamente con Docker Compose:

```bash
docker compose up -d --build
docker compose logs -f
docker compose down
```

---

## Despliegue en EC2

### 1. Crear infraestructura

```bash
aws cloudformation create-stack \
  --stack-name volaris-stack \
  --template-body file://cloudformation/template.yaml \
  --parameters \
    ParameterKey=KeyPairName,ParameterValue=mi-key \
    ParameterKey=BucketName,ParameterValue=mi-bucket-volaris
```

### 2. Conectarse

```bash
ssh -i mi-key.pem ec2-user@<IP_EC2>
```

### 3. Desplegar

```bash
git clone <URL_DEL_REPO>
cd volaris
chmod +x start.sh
./start.sh
# Disponible en http://<IP_EC2>:8080
```

---

## Puertos

| Puerto | Servicio          |
|--------|-------------------|
| 8080   | Frontend (público) |
| 3000   | Backend (interno)  |
| 27017  | MongoDB (interno)  |

---

## Endpoints API

| Método | Ruta        | Descripción                         |
|--------|-------------|--------------------------------------|
| GET    | /flights    | Buscar vuelos (origen, destino, fecha) |
| POST   | /book       | Registrar una reserva                |
| GET    | /reservas   | Listar reservas guardadas            |
| GET    | /health     | Estado del servidor                  |

---

## Scripts Bash

```bash
./start.sh [URL_REPO]       # Inicia la app
./stop.sh                   # Detiene contenedores
./backup.sh                 # Backup local
./backup.sh --s3 <bucket>   # Backup + subir a S3
```

### Cron automático

```bash
crontab -e
# Backup diario a las 3:00 AM
0 3 * * * /home/ec2-user/volaris/backup.sh >> /var/log/volaris-backup.log 2>&1
```

---

## Logs

Generados en `/app/logs/app.log` dentro del contenedor backend.

```
[2026-04-09 10:00:00] INFO: Servidor corriendo en puerto 3000
[2026-04-09 10:01:05] INFO: GET /flights - ::ffff:172.18.0.1
[2026-04-09 10:01:05] INFO: Búsqueda: Ciudad de México a Cancún | 2026-04-15
[2026-04-09 10:01:05] INFO: Resultados encontrados: 9
[2026-04-09 10:02:30] INFO: Reserva guardada: 663b... | V001 | María López
```

```bash
docker compose logs -f backend
```

---

## S3

El bucket almacena:
- `backups/db/`  dumps de MongoDB
- `backups/logs/`  logs comprimidos

```bash
aws s3 ls s3://mi-bucket-volaris/backups/
```

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/volaris';

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

mongoose.connect(MONGO_URI)
  .then(() => logger.info('Conexión a MongoDB'))
  .catch(err => logger.error(`Error enMongoDB: ${err.message}`));

// Schema
const reservaSchema = new mongoose.Schema({
  codigoVuelo: String,
  origen: String,
  destino: String,
  fecha: String,
  tarifa: String,
  precio: Number,
  pasajero: { nombre: String, correo: String },
  asientos: Number,
  creadoEn: { type: Date, default: Date.now }
});

const Reserva = mongoose.model('Reserva', reservaSchema);

// Rutas y vuelos disponibles
const VUELOS_BASE = [
  { origen: 'Ciudad de México', codigoOrigen: 'MEX', destino: 'Cancún',        codigoDestino: 'CUN', duracion: '2h 05m', precioBase: 899  },
  { origen: 'Ciudad de México', codigoOrigen: 'MEX', destino: 'Tijuana',       codigoDestino: 'TIJ', duracion: '3h 30m', precioBase: 1199 },
  { origen: 'Ciudad de México', codigoOrigen: 'MEX', destino: 'Guadalajara',   codigoDestino: 'GDL', duracion: '1h 10m', precioBase: 699  },
  { origen: 'Ciudad de México', codigoOrigen: 'MEX', destino: 'Monterrey',     codigoDestino: 'MTY', duracion: '1h 25m', precioBase: 749  },
  { origen: 'Ciudad de México', codigoOrigen: 'MEX', destino: 'Los Cabos',     codigoDestino: 'SJD', duracion: '2h 40m', precioBase: 1099 },
  { origen: 'Guadalajara',      codigoOrigen: 'GDL', destino: 'Cancún',        codigoDestino: 'CUN', duracion: '2h 55m', precioBase: 1049 },
  { origen: 'Guadalajara',      codigoOrigen: 'GDL', destino: 'Ciudad de México', codigoDestino: 'MEX', duracion: '1h 10m', precioBase: 699 },
  { origen: 'Monterrey',        codigoOrigen: 'MTY', destino: 'Cancún',        codigoDestino: 'CUN', duracion: '2h 45m', precioBase: 999  },
  { origen: 'Monterrey',        codigoOrigen: 'MTY', destino: 'Ciudad de México', codigoDestino: 'MEX', duracion: '1h 25m', precioBase: 749 },
  { origen: 'Cancún',           codigoOrigen: 'CUN', destino: 'Ciudad de México', codigoDestino: 'MEX', duracion: '2h 05m', precioBase: 899 },
  { origen: 'Tijuana',          codigoOrigen: 'TIJ', destino: 'Ciudad de México', codigoDestino: 'MEX', duracion: '3h 30m', precioBase: 1199 },
];

const HORARIOS = ['05:30', '07:00', '08:45', '10:30', '12:00', '14:15', '16:00', '18:30', '20:00', '22:15'];

const TARIFAS = [
  { nombre: 'Básica',   multiplicador: 1.0,  equipaje: 'Solo equipaje de mano' },
  { nombre: 'Clásica',  multiplicador: 1.35, equipaje: '1 maleta documentada' },
  { nombre: 'Flexible', multiplicador: 1.7,  equipaje: '2 maletas + cambios gratis' },
];

function calcularHoraLlegada(salida, duracion) {
  const [h, m] = salida.split(':').map(Number);
  const partes = duracion.match(/(\d+)h\s*(\d+)m/);
  const durH = parseInt(partes[1]);
  const durM = parseInt(partes[2]);
  const total = h * 60 + m + durH * 60 + durM;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

// GET /flights
app.get('/api/flights', (req, res) => {
  const { origen, destino, fecha } = req.query;

  logger.info(`Búsqueda: ${origen || '*'} → ${destino || '*'} | ${fecha || 'sin fecha'}`);

  let rutas = VUELOS_BASE;

  if (origen) rutas = rutas.filter(r =>
    r.origen.toLowerCase().includes(origen.toLowerCase()) ||
    r.codigoOrigen.toLowerCase() === origen.toLowerCase()
  );
  if (destino) rutas = rutas.filter(r =>
    r.destino.toLowerCase().includes(destino.toLowerCase()) ||
    r.codigoDestino.toLowerCase() === destino.toLowerCase()
  );

  if (rutas.length === 0) {
    logger.warn(`Sin resultados: ${origen} → ${destino}`);
    return res.json({ vuelos: [], mensaje: 'No hay vuelos disponibles para esa ruta.' });
  }

  const vuelos = [];
  rutas.forEach((ruta, i) => {
    TARIFAS.forEach((tarifa, t) => {
      const horaSalida = HORARIOS[(i * 3 + t * 4) % HORARIOS.length];
      const horaLlegada = calcularHoraLlegada(horaSalida, ruta.duracion);
      const precio = Math.round(ruta.precioBase * tarifa.multiplicador);

      vuelos.push({
        id: `V${String(i * 3 + t + 1).padStart(3, '0')}`,
        origen: ruta.origen,
        codigoOrigen: ruta.codigoOrigen,
        destino: ruta.destino,
        codigoDestino: ruta.codigoDestino,
        salida: horaSalida,
        llegada: horaLlegada,
        duracion: ruta.duracion,
        fecha: fecha || new Date().toISOString().split('T')[0],
        tarifa: tarifa.nombre,
        equipaje: tarifa.equipaje,
        precio,
        asientosDisponibles: Math.floor(Math.random() * 80) + 10
      });
    });
  });

  vuelos.sort((a, b) => a.precio - b.precio);
  logger.info(`Resultados encontrados: ${vuelos.length}`);
  res.json({ vuelos });
});

// POST /book
app.post('/api/book', async (req, res) => {
  const { codigoVuelo, origen, destino, fecha, tarifa, precio, pasajero, asientos } = req.body;

  if (!codigoVuelo || !pasajero?.nombre || !pasajero?.correo) {
    logger.warn(`Reserva incompleta: ${JSON.stringify(req.body)}`);
    return res.status(400).json({ error: 'Datos incompletos. Se requiere código de vuelo y datos del pasajero.' });
  }

  try {
    const reserva = new Reserva({ codigoVuelo, origen, destino, fecha, tarifa, precio, pasajero, asientos });
    await reserva.save();
    logger.info(`Reserva guardada: ${reserva._id} | ${codigoVuelo} | ${pasajero.nombre} | ${origen} → ${destino}`);
    res.status(201).json({
      ok: true,
      mensaje: '¡Reserva registrada con éxito!',
      reserva: {
        id: reserva._id,
        codigoVuelo, origen, destino, fecha, tarifa, precio, pasajero,
        creadoEn: reserva.creadoEn
      }
    });
  } catch (err) {
    logger.error(`Error al guardar reserva: ${err.message}`);
    res.status(500).json({ error: 'Error interno al guardar la reserva.' });
  }
});

// GET /reservas
app.get('/api/reservas', async (req, res) => {
  try {
    const reservas = await Reserva.find().sort({ creadoEn: -1 }).limit(50);
    logger.info(`Reservas consultadas: ${reservas.length}`);
    res.json({ reservas });
  } catch (err) {
    logger.error(`Error consultando reservas: ${err.message}`);
    res.status(500).json({ error: 'Error al consultar reservas.' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => logger.info(`Servidor corriendo en puerto ${PORT}`));

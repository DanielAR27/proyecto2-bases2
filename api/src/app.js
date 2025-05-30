// src/app.js

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger/swaggerConfig');
const cors = require('cors');
const restaurantRoutes = require('./routes/restaurantRoutes')
const menuRoutes = require('./routes/menuRoutes')
const reservationRoutes = require('./routes/reservationRoutes')
const productRoutes = require('./routes/productRoutes')
const pedidoRoutes = require('./routes/pedidoRoutes');
const cleanRoutes = require('./routes/cleanRoutes');

require('dotenv').config();

// Seleccionar base de datos
const dbType = process.env.DB_TYPE || 'postgres';
if (dbType === 'postgres') {
  require('./db/db_postgres');
} else if (dbType === 'mongo') {
  require('./db/db_mongo');
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas
app.use('/restaurants', restaurantRoutes);
app.use('/menus', menuRoutes);
app.use('/reservations', reservationRoutes);
app.use('/products', productRoutes);
app.use('/orders', pedidoRoutes);

if (process.env.DB_TYPE === 'mongo') {
  app.use('/clean', cleanRoutes);
}

// Catch-all para 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

module.exports = app;

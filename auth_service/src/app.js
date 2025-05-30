// src/app.js
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger/swaggerConfig');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

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
app.use('/auth', authRoutes);
app.use('/users', userRoutes);

// Catch-all para 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

module.exports = app;

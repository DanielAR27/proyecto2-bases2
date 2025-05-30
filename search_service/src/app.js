// src/app.js
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger/swaggerConfig');
const cors = require('cors');
const searchRoutes = require('./routes/searchRoutes');
const { initializeElasticSearch } = require('./config/elastic');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar ElasticSearch
initializeElasticSearch().catch(console.error);

console.log('SwaggerSpec cargado:', Object.keys(swaggerSpec.paths || {}));

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas
app.use('/search', searchRoutes);

// Manejo de errores
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

module.exports = app;
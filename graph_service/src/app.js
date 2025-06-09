const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger/swaggerConfig');
const cors = require('cors');
const routingRoutes = require('./routes/routingRoutes');
const queryingRoutes = require('./routes/queryingRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas
app.use('/routing', routingRoutes);
app.use('/querying', queryingRoutes);

// Catch-all para 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

module.exports = app;
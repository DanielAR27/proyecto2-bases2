const swaggerJSDoc = require('swagger-jsdoc');

const PORT = process.env.AUTH_PORT;

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Documentación del Servicio de Autenticación',
    version: '1.0.0',
    description: 'Esta documentación cubre únicamente las rutas relacionadas con el sistema de autenticación y la gestión de usuarios del sistema.',
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Servidor local de desarrollo',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'], // Asegúrate de que aquí estén solo las rutas auth/user
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;

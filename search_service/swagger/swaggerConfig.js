// src/docs/swagger.js
const swaggerJSDoc = require("swagger-jsdoc");

const PORT = process.env.SEARCH_PORT;

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "API de Búsqueda de Productos",
    version: "1.0.0",
    description: "Documentación de la API para la búsqueda e indexación de productos con Elasticsearch y Redis.",
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: "Servidor local",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.js"]
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
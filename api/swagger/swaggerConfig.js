const swaggerJSDoc = require("swagger-jsdoc");

const PORT = process.env.API_PORT;

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "API de Gestión de Restaurantes",
    version: "1.0.0",
    description: "Documentación de la API para la gestión de restaurantes, menús, reservas y pedidos.",
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
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;

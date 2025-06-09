const swaggerJSDoc = require("swagger-jsdoc");

const PORT = process.env.GRAPH_PORT;

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Graph Service API",
    version: "1.0.0",
    description: "Documentación de la API para análisis de grafos Neo4J y optimización de rutas.",
  },
  servers: [
    {
      url: `http://localhost/graph`,
      description: "Servidor local con load balancer",
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
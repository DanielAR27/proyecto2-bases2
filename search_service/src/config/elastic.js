// src/config/elastic.js
const { Client } = require('@elastic/elasticsearch');

const elasticClient = new Client({
  node: process.env.ELASTIC_NODE,
  auth: {
    username: process.env.ELASTIC_USER,
    password: process.env.ELASTIC_PASSWORD
  }
});

// Índice para productos
const PRODUCT_INDEX = 'products';

// Verificar conexión e inicializar índices
const initializeElasticSearch = async () => {
  try {
    // Verificar conexión
    await elasticClient.ping();
    console.log('ElasticSearch conectado correctamente');
    
    // Verificar si el índice existe
    const indexExists = await elasticClient.indices.exists({ index: PRODUCT_INDEX });
    
    if (!indexExists) {
      await createProductIndex();
    }
  } catch (error) {
    console.error('Error inicializando ElasticSearch:', error);
    throw error;
  }
};

// Crear índice de productos con mapeo optimizado para búsqueda
const createProductIndex = async () => {
  try {
    await elasticClient.indices.create({
      index: PRODUCT_INDEX,
      body: {
        settings: {
          analysis: {
            analyzer: {
              spanish_analyzer: {
                type: 'spanish'
              }
            }
          },
          number_of_shards: 1,
          number_of_replicas: 1
        },
        mappings: {
          properties: {
            id_producto: { type: 'keyword' },
            nombre: { 
              type: 'text',
              analyzer: 'spanish_analyzer',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            categoria: { 
              type: 'text',
              analyzer: 'spanish_analyzer',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            descripcion: { 
              type: 'text',
              analyzer: 'spanish_analyzer' 
            },
            precio: { type: 'float' },
            id_menu: { type: 'keyword' }
          }
        }
      }
    });
    console.log(`Índice ${PRODUCT_INDEX} creado correctamente`);
  } catch (error) {
    console.error('Error creando índice:', error);
    throw error;
  }
};

module.exports = {
  elasticClient,
  PRODUCT_INDEX,
  initializeElasticSearch,
  createProductIndex
};
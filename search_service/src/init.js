// src/init.js
const elasticService = require('./services/elasticService');
const axios = require('axios');

async function initializeIndex() {
  try {
    console.log('Verificando índice de productos...');
    
    // Verificar si el índice ya tiene datos
    const count = await elasticService.getProductCount();
    
    if (count > 0) {
      console.log(`Índice ya inicializado con ${count} productos.`);
      return;
    }
    
    console.log('Cargando productos desde API...');
    
    // Si no hay datos, cargar desde API
    const apiUrl = process.env.API_URL;
    const productsResponse = await axios.get(`${apiUrl}/products`);
    const products = productsResponse.data;
    
    console.log(`Indexando ${products.length} productos...`);
    
    await elasticService.reindexAllProducts(products);
    
    console.log('Índice inicializado correctamente.');
  } catch (error) {
    console.error('Error inicializando índice:', error);
  }
}

module.exports = { initializeIndex };
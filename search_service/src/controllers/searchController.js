// src/controllers/searchController.js
const elasticService = require('../services/elasticService');
const axios = require('axios');
const redisClient = require('../config/redis');

const searchController = {
  // Búsqueda textual en productos
  async searchProducts(req, res) {
    try {
      const { q } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const from = (page - 1) * limit;
      
      if (!q) {
        return res.status(400).json({ error: 'Parámetro de búsqueda "q" es requerido' });
      }
      
      // Verificar si hay resultados en caché
      const cacheKey = `search:${q}:${page}:${limit}`;
      const cachedResults = await redisClient.get(cacheKey);
      
      if (cachedResults) {
        return res.json(JSON.parse(cachedResults));
      }
      
      // Realizar búsqueda
      const results = await elasticService.searchProducts(q, from, limit);
      
      // Guardar resultados en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(results), {
        EX: 300 // 5 minutos
      });
      
      res.json(results);
    } catch (error) { 
      /* istanbul ignore next */
      console.error('Error en búsqueda de productos:', error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al realizar la búsqueda' });
    }
  },

  // Filtrar productos por categoría
  async searchProductsByCategory(req, res) {
    try {
      const { categoria } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const from = (page - 1) * limit;
      
      // Verificar si hay resultados en caché
      const cacheKey = `search:category:${categoria}:${page}:${limit}`;
      const cachedResults = await redisClient.get(cacheKey);
      
      if (cachedResults) {
        return res.json(JSON.parse(cachedResults));
      }
      
      // Realizar búsqueda por categoría
      const results = await elasticService.searchProductsByCategory(categoria, from, limit);
      
      // Guardar resultados en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(results), {
        EX: 300 // 5 minutos
      });
      
      res.json(results);
    } catch (error) { 
      /* istanbul ignore next */
      console.error('Error en búsqueda por categoría:', error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al realizar la búsqueda por categoría' });
    }
  },

  // Reindexar productos manualmente
  async reindexProducts(req, res) {
    try {
      // Verificar que el usuario sea administrador
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden reindexar productos.' });
      }
      
      // Obtener todos los productos de la API
      const apiUrl = process.env.API_URL;
      const productsResponse = await axios.get(`${apiUrl}/products`);
      const products = productsResponse.data;
      
      // Reindexar productos
      await elasticService.reindexAllProducts(products);
      
      // Invalidar caché de búsqueda
      await redisClient.flushDb();
      
      res.json({
        message: 'Productos reindexados correctamente',
        count: products.length
      });
    } catch (error) {  
      /* istanbul ignore next */
      console.error('Error reindexando productos:', error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al reindexar productos' });
    }
  },

  // Indexar un producto individual

   /* istanbul ignore next */
  async indexProduct(req, res) {
    try {
      // Verificar que sea administrador o sistema
      // Verificar que el usuario sea administrador
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden reindexar productos.' });
      }

      const producto = req.body;
      
      if (!producto.id_producto || !producto.nombre || !producto.categoria) {
        return res.status(400).json({ error: 'Datos de producto incompletos' });
      }

      await elasticService.indexProduct(producto);
      
      res.status(201).json({ message: 'Producto indexado correctamente' });
    } catch (error) {
      console.error('Error indexando producto:', error);
      res.status(500).json({ error: 'Error al indexar producto' });
    }
  },

  // Actualizar un producto en el índice

   /* istanbul ignore next */
  async updateProduct(req, res) {
    try {
      // Verificar que el usuario sea administrador
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden reindexar productos.' });
      }

      const { id } = req.params;
      const producto = req.body;
      
      if (!producto.nombre || !producto.categoria) {
        return res.status(400).json({ error: 'Datos de producto incompletos' });
      }

      // En ElasticSearch, indexar con el mismo ID actualiza el documento
      await elasticService.indexProduct({
        ...producto,
        id_producto: id
      });
      
      // Invalidar caché de búsquedas relacionadas
      const patrones = [
        `search:*${producto.nombre}*`,
        `search:*${producto.categoria}*`,
        `search:category:${producto.categoria}*`
      ];
      
      for (const patron of patrones) {
        try {
          const keys = await redisClient.keys(patron);
          if (keys.length > 0) {
            await redisClient.del(keys);
          }
        } catch (err) {
          console.error(`Error limpiando caché con patrón ${patron}:`, err);
        }
      }
      
      res.json({ message: 'Producto actualizado en índice correctamente' });
    } catch (error) {
      console.error('Error actualizando producto en índice:', error);
      res.status(500).json({ error: 'Error al actualizar producto en índice' });
    }
  },

  // Eliminar un producto del índice

   /* istanbul ignore next */
  async deleteProduct(req, res) {
    try {
      // Verificar que sea administrador o sistema
      if (req.usuario && req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'No autorizado para eliminar productos' });
      }

      const { id } = req.params;
      
      await elasticService.deleteProduct(id);
      
      // Invalidar caché relevante
      try {
        const keys = await redisClient.keys('search:*');
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } catch (err) {
        console.error('Error limpiando caché:', err);
      }
      
      res.json({ message: 'Producto eliminado del índice correctamente' });
    } catch (error) {
      console.error('Error eliminando producto del índice:', error);
      res.status(500).json({ error: 'Error al eliminar producto del índice' });
    }
  }

};

module.exports = searchController;
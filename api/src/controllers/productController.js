const ProductDAO = require('../dao/productDAO');
const axios = require('axios');
const redisClient = require('../config/redis');

const productController = {
  // Crear producto (solo administrador)
  async createProduct(req, res) {
    try {
      const { nombre, categoria, descripcion, precio, id_menu } = req.body;

      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo administradores pueden crear productos.' });
      }

      if (!nombre || !categoria || precio == null || !id_menu) {
        return res.status(400).json({ error: 'Faltan campos requeridos.' });
      }

      const nuevoProducto = await ProductDAO.createProduct({ nombre, categoria, descripcion, precio, id_menu });

      // Notificar al servicio de búsqueda (asíncrono)
      try {
        await axios.post(`${process.env.SEARCH_SERVICE_URL}/search/product`, nuevoProducto,
          {headers: {
            Authorization: req.headers.authorization // Pasando el mismo token del usuario
          }
        });
      } catch (error) {
        console.error('Error al indexar producto en búsqueda:', error.message);
        // No detener el flujo por error en servicio de búsqueda
      }

      // Invalidar caché de productos
      await redisClient.del('products:all');
      
      res.status(201).json({ message: 'Producto creado.', producto: nuevoProducto });
    } catch (error) {
      /* istanbul ignore next */
      console.error(error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al crear producto.' });
    }
  },

  // Obtener todos los productos (público)
  async getAllProducts(req, res) {
    try {
      const cacheKey = 'products:all';
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Si no está en caché, obtener de la base de datos
      const productos = await ProductDAO.getAllProducts();
      
      // Guardar en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(productos), {
        EX: 300 // 5 minutos
      });
      
      res.json(productos);
    } catch (error) {
      /* istanbul ignore next */
      console.error(error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al obtener productos.' });
    }
  },

  // Obtener producto por ID (público)
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `product:${id}`;
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const producto = await ProductDAO.findById(id);

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }

      // Guardar en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(producto), {
        EX: 300
      });

      res.json(producto);
    } catch (error) {
      /* istanbul ignore next */
      console.error(error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al buscar el producto.' });
    }
  },

  // Actualizar producto (solo administrador)
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { nombre, categoria, descripcion, precio } = req.body;

      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo administradores pueden actualizar productos.' });
      }

      const actualizado = await ProductDAO.updateProduct(id, { nombre, categoria, descripcion, precio });

      if (!actualizado) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }

      // Notificar al servicio de búsqueda (asíncrono)
      try {
        await axios.put(`${process.env.SEARCH_SERVICE_URL}/search/product/${id}`, actualizado,
          {headers: {
            Authorization: req.headers.authorization // Pasando el mismo token del usuario
          }
        });
      } catch (error) {
        console.error('Error al actualizar producto en búsqueda:', error.message);
        // No detener el flujo por error en servicio de búsqueda
      }

      // Invalidar caché individual y la lista
      await redisClient.del(`product:${id}`);
      await redisClient.del('products:all');

      res.json({ message: 'Producto actualizado.', producto: actualizado });
    } catch (error) {
      /* istanbul ignore next */
      console.error(error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al actualizar el producto.' });
    }
  },

  // Eliminar producto (solo administrador)
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo administradores pueden eliminar productos.' });
      }

      const eliminado = await ProductDAO.deleteProduct(id);
      
      if (!eliminado) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }

      // Notificar al servicio de búsqueda (asíncrono)
      try {
        if (process.env.SEARCH_SERVICE_URL) {
          await axios.delete(`${process.env.SEARCH_SERVICE_URL}/search/product/${id}`,
            {
              headers: {
                Authorization: req.headers.authorization
              },
              // Ignorar errores 404 (ya eliminado o no existe)
              validateStatus: function (status) {
                return (status >= 200 && status < 300) || status === 404;
              },
              timeout: 3000
            }
          );
        }
      } catch (error) {
        console.error('Error al eliminar producto de búsqueda:', error.message);
        // No detener el flujo por error en servicio de búsqueda
      }

      // Invalidar caché individual, lista de productos y PEDIDOS (porque elimina detalles)
      await redisClient.del(`product:${id}`);
      await redisClient.del('products:all');
      await redisClient.del('pedidos:all');

      res.json({ message: 'Producto eliminado correctamente.' });
    } catch (error) {
      /* istanbul ignore next */
      console.error(error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al eliminar el producto.' });
    }
  }
};

module.exports = productController;
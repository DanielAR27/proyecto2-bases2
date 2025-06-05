const PedidoDAO = require('../dao/pedidoDAO');
const ProductDAO = require('../dao/productDAO');
const redisClient = require('../config/redis');

const pedidoController = {
  // Crear pedido (usuario o admin)
  async createPedido(req, res) {
    try {
      const { id_restaurante, tipo, productos, id_usuario } = req.body;

      const rol = req.usuario.rol;
      const usuarioToken = req.usuario.id_usuario;

      // Solo admins pueden hacer pedidos para otros
      if (rol !== 'administrador' && id_usuario !== usuarioToken) {
        return res.status(403).json({ error: 'No autorizado para crear pedidos para otros usuarios.' });
      }

      if (!id_restaurante || !tipo || !productos || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'Datos incompletos o inválidos.' });
      }

      // Validar tipo y calcular subtotales
      const detalles = [];

      for (const item of productos) {
        const { id_producto, cantidad } = item;

        if (!id_producto || !cantidad || cantidad <= 0) {
          return res.status(400).json({ error: 'Producto inválido o cantidad incorrecta.' });
        }

        const producto = await ProductDAO.findById(id_producto);
        if (!producto) {
          return res.status(404).json({ error: `Producto con ID ${id_producto} no encontrado.` });
        }

        const subtotal = producto.precio * cantidad;

        detalles.push({
          id_producto,
          cantidad,
          subtotal: parseFloat(subtotal.toFixed(2))
        });
      }

      const nuevoPedido = await PedidoDAO.createPedido({
        id_usuario,
        id_restaurante,
        estado: 'pendiente',
        tipo,
        detalles
      });

      // Invalidar caché de pedidos
      await redisClient.del('pedidos:all');

      res.status(201).json({ message: 'Pedido creado exitosamente.', pedido: nuevoPedido });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error al crear el pedido.'});
    }
  },

  // Obtener todos los pedidos (admin o dueño)
  async getAllPedidos(req, res) {
    try {
      const cacheKey = 'pedidos:all';
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Si no está en caché, obtener de la base de datos
      const pedidos = await PedidoDAO.getAllPedidos();
      
      // Guardar en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(pedidos), {
        EX: 300 // 5 minutos
      });
      
      res.json(pedidos);
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error al obtener pedidos.' });
    }
  },

  // Obtener pedido por ID
  async getPedidoById(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `pedido:${id}`;
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const pedido = await PedidoDAO.findById(id);

      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      // Guardar en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(pedido), {
        EX: 300
      });

      res.json(pedido);
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error al buscar el pedido.' , details: error.message});
    }
  },

  // Eliminar pedido (solo admin o dueño)
  async deletePedido(req, res) {
    try {
      const { id } = req.params;
      const usuario = req.usuario;

      const pedido = await PedidoDAO.findById(id);
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });

      if (usuario.rol !== 'administrador' && usuario.id_usuario !== pedido.id_usuario) {
        return res.status(403).json({ error: 'No autorizado para eliminar este pedido.' });
      }

      const eliminado = await PedidoDAO.deletePedido(id);
      if (!eliminado) {
        return res.status(500).json({ error: 'No se pudo eliminar el pedido.' });
      }

      // Invalidar caché individual y la lista
      await redisClient.del(`pedido:${id}`);
      await redisClient.del('pedidos:all');

      res.json({ message: 'Pedido eliminado correctamente.' });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error al eliminar el pedido.' });
    }
  },

  // Obtener pedidos de un repartidor (con caché)
  async getPedidosByDriver(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `pedidos:driver:${id}`;
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
      
      const pedidos = await PedidoDAO.findByDriver(id);
      
      const response = {
        message: 'Pedidos del repartidor obtenidos correctamente.',
        pedidos
      };

      // Guardar en caché (expira en 2 minutos - datos más dinámicos)
      await redisClient.set(cacheKey, JSON.stringify(response), {
        EX: 120
      });
      
      res.json(response);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener pedidos del repartidor.' });
    }
  },

  // Obtener pedidos sin asignar (con caché)
  async getUnassignedOrders(req, res) {
    try {
      if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'No autorizado.' });
      }
      
      const cacheKey = 'pedidos:unassigned';
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
      
      const pedidos = await PedidoDAO.findUnassignedOrders();
      
      const response = {
        message: 'Pedidos sin asignar obtenidos correctamente.',
        total: pedidos.length,
        pedidos
      };

      // Guardar en caché (expira en 1 minuto - muy dinámico)
      await redisClient.set(cacheKey, JSON.stringify(response), {
        EX: 60
      });
      
      res.json(response);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener pedidos sin asignar.' });
    }
  },

  // Asignar repartidor (invalida múltiples cachés)
  async assignDriver(req, res) {
    try {
      const { id } = req.params;
      const { id_repartidor } = req.body;

      if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'No autorizado. Solo administradores pueden asignar repartidores.' });
      }

      if (!id_repartidor) {
        return res.status(400).json({ error: 'ID del repartidor es requerido.' });
      }

      const pedidoActualizado = await PedidoDAO.assignDriver(id, id_repartidor);
      
      if (!pedidoActualizado) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      // Invalidar múltiples cachés relacionados
      await Promise.all([
        redisClient.del(`pedido:${id}`),
        redisClient.del('pedidos:all'),
        redisClient.del('pedidos:unassigned'),
        redisClient.del(`pedidos:driver:${id_repartidor}`)
      ]);

      res.json({ 
        message: 'Repartidor asignado correctamente.', 
        pedido: pedidoActualizado 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al asignar repartidor.'});
    }
  },

  // Actualizar estado (invalida múltiples cachés)
  async updateDeliveryStatus(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      const estadosValidos = ['pendiente', 'en preparacion', 'listo', 'en camino', 'entregado', 'cancelado'];
      
      if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({ 
          error: 'Estado inválido.',
          estadosValidos 
        });
      }

      const pedidoActualizado = await PedidoDAO.updateDeliveryStatus(id, estado);
      
      if (!pedidoActualizado) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      // Invalidar cachés relacionados
      await Promise.all([
        redisClient.del(`pedido:${id}`),
        redisClient.del('pedidos:all'),
        redisClient.del('pedidos:unassigned'),
        redisClient.del(`pedidos:driver:${pedidoActualizado.id_repartidor}`)
      ]);

      res.json({
        message: 'Estado del pedido actualizado correctamente.',
        pedido: pedidoActualizado
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al actualizar estado del pedido.', details: error.message });
    }
  }
};

module.exports = pedidoController;
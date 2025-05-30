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
      res.status(500).json({ error: 'Error al crear el pedido.' });
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
      res.status(500).json({ error: 'Error al buscar el pedido.' });
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
  }
};

module.exports = pedidoController;
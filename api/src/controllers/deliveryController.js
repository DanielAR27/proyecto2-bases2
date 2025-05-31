// src/controllers/deliveryController.js

const UserGeoDAO = require('../dao/userGeoDAO');
const RestaurantGeoDAO = require('../dao/restaurantGeoDAO');
const RepartidorDAO = require('../dao/repartidorDAO');
const PedidoDAO = require('../dao/pedidoDAO');
const redisClient = require('../config/redis');

const deliveryController = {

  // FUNCIONES DE GEOLOCALIZACIÓN

  // Actualizar ubicación de restaurante
  updateRestaurantLocation: async (req, res) => {
    try {
      const { id } = req.params;
      const { latitud, longitud } = req.body;

      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo administradores pueden actualizar ubicaciones de restaurantes.' });
      }

      if (!latitud || !longitud) {
        return res.status(400).json({ error: 'Latitud y longitud son obligatorios.' });
      }

      const restauranteActualizado = await RestaurantGeoDAO.updateRestaurantLocation(id, {
        latitud, longitud
      });

      if (!restauranteActualizado) {
        return res.status(404).json({ error: 'Restaurante no encontrado.' });
      }

      // Invalidar caché del restaurante
      await redisClient.del(`restaurant:${id}`);
      await redisClient.del('restaurants:all');

      res.json({
        message: 'Ubicación del restaurante actualizada correctamente.',
        restaurante: restauranteActualizado
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // FUNCIONES DE REPARTIDORES

  // Crear repartidor
  createDriver: async (req, res) => {
    try {
      const { nombre, telefono, vehiculo, latitud_actual, longitud_actual } = req.body;

      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo administradores pueden crear repartidores.' });
      }

      if (!nombre) {
        return res.status(400).json({ error: 'El nombre es obligatorio.' });
      }

      const nuevoRepartidor = await RepartidorDAO.createRepartidor({
        nombre, telefono, vehiculo, latitud_actual, longitud_actual
      });

      res.status(201).json({
        message: 'Repartidor creado correctamente.',
        repartidor: nuevoRepartidor
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Obtener todos los repartidores
  getAllDrivers: async (req, res) => {
    try {
      const cacheKey = 'drivers:all';
      
      // Verificar caché
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const repartidores = await RepartidorDAO.getAllRepartidores();

      // Guardar en caché por 5 minutos
      await redisClient.set(cacheKey, JSON.stringify(repartidores), {
        EX: 300
      });

      res.json(repartidores);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Obtener repartidor por ID
  getDriverById: async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `driver:${id}`;
      
      // Verificar caché
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const repartidor = await RepartidorDAO.findById(id);

      if (!repartidor) {
        return res.status(404).json({ error: 'Repartidor no encontrado.' });
      }

      // Guardar en caché por 5 minutos
      await redisClient.set(cacheKey, JSON.stringify(repartidor), {
        EX: 300
      });

      res.json(repartidor);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Actualizar ubicación del repartidor
  updateDriverLocation: async (req, res) => {
    try {
      const { id } = req.params;
      const { latitud_actual, longitud_actual } = req.body;

      if (!req.usuario) {
        return res.status(401).json({ error: 'Token requerido.' });
      }

      if (!latitud_actual || !longitud_actual) {
        return res.status(400).json({ error: 'Latitud y longitud son obligatorias.' });
      }

      const repartidorActualizado = await RepartidorDAO.updateLocation(id, {
        latitud_actual, longitud_actual
      });

      if (!repartidorActualizado) {
        return res.status(404).json({ error: 'Repartidor no encontrado.' });
      }

      // Invalidar caché
      await redisClient.del(`driver:${id}`);
      await redisClient.del('drivers:all');

      res.json({
        message: 'Ubicación del repartidor actualizada correctamente.',
        repartidor: repartidorActualizado
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // FUNCIONES DE ASIGNACIÓN

  // Asignar pedido a repartidor
  assignDelivery: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { repartidorId } = req.body;

      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo administradores pueden asignar entregas.' });
      }

      // Verificar que el pedido existe
      const pedido = await PedidoDAO.findById(orderId);
      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      let repartidorAsignado;

      if (repartidorId) {
        // Asignar repartidor específico
        const repartidor = await RepartidorDAO.findById(repartidorId);
        if (!repartidor) {
          return res.status(404).json({ error: 'Repartidor no encontrado.' });
        }
        if (repartidor.estado !== 'disponible') {
          return res.status(400).json({ error: 'Repartidor no está disponible.' });
        }
        repartidorAsignado = repartidor;
      } else {
        // Buscar repartidor más cercano al restaurante
        const restaurante = await RestaurantGeoDAO.findRestaurantWithLocation(pedido.id_restaurante);
        if (!restaurante || !restaurante.latitud || !restaurante.longitud) {
          return res.status(400).json({ error: 'Restaurante sin ubicación configurada.' });
        }

        repartidorAsignado = await RepartidorDAO.findNearestAvailable(
          restaurante.latitud, restaurante.longitud
        );

        if (!repartidorAsignado) {
          return res.status(404).json({ error: 'No hay repartidores disponibles en la zona.' });
        }
      }

      // Asignar pedido
      const pedidoAsignado = await PedidoDAO.assignDriver(orderId, repartidorAsignado.id_repartidor);
      
      // Cambiar estado del repartidor a ocupado
      await RepartidorDAO.updateStatus(repartidorAsignado.id_repartidor, 'ocupado');

      // Invalidar caché relevante
      await redisClient.del(`pedido:${orderId}`);
      await redisClient.del('pedidos:all');
      await redisClient.del(`driver:${repartidorAsignado.id_repartidor}`);
      await redisClient.del('drivers:all');

      res.json({
        message: 'Pedido asignado correctamente.',
        pedido: pedidoAsignado,
        repartidor: repartidorAsignado
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  }
};

module.exports = deliveryController;
// src/controllers/restaurantController.js

const RestaurantDAO = require('../dao/restaurantDAO');
const redisClient = require('../config/redis');
require('dotenv').config();

const restaurantController = {

  // Crear un restaurante
  createRestaurant: async (req, res) => {
    try {
      const { nombre, direccion } = req.body;
      const id_admin = req.usuario.id_usuario;

      // Validar que el usuario esté autenticado y sea administrador
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden crear restaurantes.' });
      }

      if (!nombre || !direccion) {
        return res.status(400).json({ error: 'Nombre y dirección son obligatorios.' });
      }

      const nuevoRestaurante = await RestaurantDAO.createRestaurant({ nombre, direccion, id_admin });

      // Invalidar caché
      await redisClient.del('restaurants:all');

      res.status(201).json({
        message: 'Restaurante creado correctamente.',
        restaurante: nuevoRestaurante,
      });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Obtener todos los restaurantes
  getAllRestaurants: async (req, res) => {
    try {
      const cacheKey = 'restaurants:all';
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Si no está en caché, obtener de la base de datos
      const restaurantes = await RestaurantDAO.getAllRestaurants();
      
      // Guardar en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(restaurantes), {
        EX: 300 // 5 minutos
      });
      
      res.json(restaurantes);
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Obtener un restaurante por ID
  getRestaurantById: async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `restaurant:${id}`;
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const restaurante = await RestaurantDAO.findById(id);

      if (!restaurante) {
        return res.status(404).json({ error: 'Restaurante no encontrado.' });
      }

      // Guardar en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(restaurante), {
        EX: 300
      });

      res.json(restaurante);
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Actualizar un restaurante
  updateRestaurant: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, direccion } = req.body;

      // Validar si no tiene token o no es administrador
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden actualizar restaurantes.' });
      }

      if (!nombre || !direccion) {
        return res.status(400).json({ error: 'Nombre y dirección son obligatorios.' });
      }

      const restauranteExistente = await RestaurantDAO.findById(id);
      if (!restauranteExistente) {
        return res.status(404).json({ error: 'Restaurante no encontrado.' });
      }

      const restauranteActualizado = await RestaurantDAO.updateRestaurant(id, { nombre, direccion });

      // Invalidar caché individual y la lista
      await redisClient.del(`restaurant:${id}`);
      await redisClient.del('restaurants:all');

      res.json({
        message: 'Restaurante actualizado correctamente.',
        restaurante: restauranteActualizado,
      });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Eliminar un restaurante
  deleteRestaurant: async (req, res) => {
    try {
      const { id } = req.params;

      // Validar si no tiene token o no es administrador
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden eliminar restaurantes.' });
      }

      const restauranteEliminado = await RestaurantDAO.deleteRestaurant(id);

      if (!restauranteEliminado) {
        return res.status(404).json({ error: 'Restaurante no encontrado.' });
      }

      // Invalidar caché de restaurantes
      await redisClient.del(`restaurant:${id}`);
      await redisClient.del('restaurants:all');
      
      // Invalidar caché de menús (porque se eliminan menús por el middleware)
      await redisClient.del('menus:all');
      
      // Invalidar caché de productos (porque se eliminan productos a través de los menús)
      await redisClient.del('products:all');
      
      // Invalidar caché de reservas (porque se eliminan reservas)
      await redisClient.del('reservas:all');
      
      // Invalidar caché de pedidos (porque se eliminan pedidos)
      await redisClient.del('pedidos:all');

      res.json({ message: 'Restaurante eliminado correctamente.' });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },
};

module.exports = restaurantController;
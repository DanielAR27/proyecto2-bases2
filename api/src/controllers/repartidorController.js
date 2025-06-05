// src/controllers/repartidorController.js

const RepartidorDAO = require('../dao/repartidorDAO');
const redisClient = require('../config/redis');
require('dotenv').config();

const repartidorController = {

  // Crear un repartidor
  createRepartidor: async (req, res) => {
    try {
      const { nombre, telefono, vehiculo } = req.body;

      // Validar que el usuario esté autenticado y sea administrador
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden crear repartidores.' });
      }

      if (!nombre || !telefono || !vehiculo) {
        return res.status(400).json({ error: 'Nombre, teléfono y vehículo son obligatorios.' });
      }

      const nuevoRepartidor = await RepartidorDAO.createRepartidor({ nombre, telefono, vehiculo });

      // Invalidar caché
      await redisClient.del('repartidores:all');
      await redisClient.del('repartidores:available');

      res.status(201).json({
        message: 'Repartidor creado correctamente.',
        repartidor: nuevoRepartidor,
      });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Obtener todos los repartidores
  getAllRepartidores: async (req, res) => {
    try {
      // Solo administradores pueden ver todos los repartidores
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden ver todos los repartidores.' });
      }

      const cacheKey = 'repartidores:all';
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Si no está en caché, obtener de la base de datos
      const repartidores = await RepartidorDAO.getAllRepartidores();
      
      // Guardar en caché (expira en 3 minutos)
      await redisClient.set(cacheKey, JSON.stringify(repartidores), {
        EX: 180 // 3 minutos
      });
      
      res.json(repartidores);
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Obtener repartidores disponibles
  getAvailableRepartidores: async (req, res) => {
    try {
      // Solo administradores pueden acceder a esta información
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'No tiene permisos para acceder a esta información.' });
      }

      const cacheKey = 'repartidores:available';
      
      // Intentar obtener de caché (expira en 2 minutos por ser datos dinámicos)
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const repartidores = await RepartidorDAO.getAvailableRepartidores();

      const responseData = {
        message: 'Repartidores disponibles obtenidos correctamente.',
        total: repartidores.length,
        repartidores: repartidores
      };

      // Guardar en caché (expira en 2 minutos)
      await redisClient.set(cacheKey, JSON.stringify(responseData), {
        EX: 120
      });

      res.json(responseData);
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Obtener repartidores disponibles con ubicación
  getAvailableWithLocation: async (req, res) => {
    try {
      // Solo administradores pueden acceder a esta información
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'No tiene permisos para acceder a esta información.' });
      }

      const cacheKey = 'repartidores:available:location';
      
      // Intentar obtener de caché (expira en 1 minuto por ser datos de ubicación)
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const repartidores = await RepartidorDAO.getAvailableWithLocation();

      const responseData = {
        message: 'Repartidores disponibles con ubicación obtenidos correctamente.',
        total: repartidores.length,
        repartidores: repartidores
      };

      // Guardar en caché (expira en 1 minuto por ser datos de ubicación en tiempo real)
      await redisClient.set(cacheKey, JSON.stringify(responseData), {
        EX: 60
      });

      res.json(responseData);
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Obtener usuarios asignados a un repartidor
  getUsersAssignedToDriver: async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.usuario || req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'No tiene permisos para acceder a esta información.' });
    }

    const cacheKey = `repartidor:${id}:usuarios`;
    
    // Intentar obtener de caché (expira en 2 minutos por ser datos dinámicos)
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const usuarios = await RepartidorDAO.getUsersAssignedToDriver(id);

    const responseData = {
      message: 'Usuarios asignados al repartidor obtenidos correctamente.',
      total: usuarios.length,
      usuarios: usuarios
    };

    // Guardar en caché (expira en 2 minutos)
    await redisClient.set(cacheKey, JSON.stringify(responseData), {
      EX: 120
    });

    res.json(responseData);
  } catch (error) {
    /* istanbul ignore next*/
    console.error(error);
    /* istanbul ignore next*/
    res.status(500).json({ error: 'Error en el servidor.' });
  }
  },

  // Obtener un repartidor por ID
  getRepartidorById: async (req, res) => {
    try {
      const { id } = req.params;

      // Solo administradores pueden ver detalles de repartidores
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden ver detalles de repartidores.' });
      }

      const cacheKey = `repartidor:${id}`;
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const repartidor = await RepartidorDAO.findById(id);

      if (!repartidor) {
        return res.status(404).json({ error: 'Repartidor no encontrado.' });
      }

      // Guardar en caché (expira en 3 minutos)
      await redisClient.set(cacheKey, JSON.stringify(repartidor), {
        EX: 180
      });

      res.json(repartidor);
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Actualizar un repartidor
  updateRepartidor: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, telefono, vehiculo } = req.body;

      // Validar si no tiene token o no es administrador
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden actualizar repartidores.' });
      }

      if (!nombre || !telefono || !vehiculo) {
        return res.status(400).json({ error: 'Nombre, teléfono y vehículo son obligatorios.' });
      }

      const repartidorExistente = await RepartidorDAO.findById(id);
      if (!repartidorExistente) {
        return res.status(404).json({ error: 'Repartidor no encontrado.' });
      }

      const repartidorActualizado = await RepartidorDAO.updateRepartidor(id, { nombre, telefono, vehiculo });

      // Invalidar caché individual y las listas
      await redisClient.del(`repartidor:${id}`);
      await redisClient.del('repartidores:all');
      await redisClient.del('repartidores:available');
      await redisClient.del('repartidores:available:location');

      res.json({
        message: 'Repartidor actualizado correctamente.',
        repartidor: repartidorActualizado,
      });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Eliminar un repartidor
  deleteRepartidor: async (req, res) => {
    try {
      const { id } = req.params;

      // Validar si no tiene token o no es administrador
      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden eliminar repartidores.' });
      }

      const repartidorEliminado = await RepartidorDAO.deleteRepartidor(id);

      if (!repartidorEliminado) {
        return res.status(404).json({ error: 'Repartidor no encontrado.' });
      }

      // Invalidar caché de repartidores
      await redisClient.del(`repartidor:${id}`);
      await redisClient.del('repartidores:all');
      await redisClient.del('repartidores:available');
      await redisClient.del('repartidores:available:location');
      await redisClient.del(`repartidor:${id}:usuarios`);
      
      // Invalidar caché de pedidos (porque pueden tener repartidores asignados)
      await redisClient.del('pedidos:all');

      res.json({ message: 'Repartidor eliminado correctamente.' });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Actualizar ubicación de repartidor
  updateRepartidorLocation: async (req, res) => {
    try {
      const { id } = req.params;
      const { latitud_actual, longitud_actual } = req.body;

      if (!req.usuario) {
        return res.status(401).json({ error: 'Token requerido.' });
      }

      // Solo administradores pueden actualizar ubicación de repartidores
      if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'No autorizado para actualizar esta ubicación.' });
      }

      // Validación básica
      if (!latitud_actual || !longitud_actual) {
        return res.status(400).json({ error: 'Latitud y longitud son obligatorios.' });
      }
      
      // Validar que sean números válidos
      const lat = parseFloat(latitud_actual);
      const lng = parseFloat(longitud_actual);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Latitud y longitud deben ser números válidos.' });
      }
      
      // Validar rangos geográficos
      if (lat < -90 || lat > 90) {
        return res.status(400).json({ error: 'Latitud debe estar entre -90 y 90 grados.' });
      }
      
      if (lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Longitud debe estar entre -180 y 180 grados.' });
      }
      
      // Verificar que el repartidor existe
      const repartidorExistente = await RepartidorDAO.findById(id);
      if (!repartidorExistente) {
        return res.status(404).json({ error: 'Repartidor no encontrado.' });
      }

      // Usar los valores parseados
      const repartidorActualizado = await RepartidorDAO.updateRepartidorLocation(id, {
        latitud_actual: lat,
        longitud_actual: lng
      });

      if (!repartidorActualizado) {
        return res.status(404).json({ error: 'Repartidor no encontrado.' });
      }

      // Invalidar cachés relacionados
      await redisClient.del(`repartidor:${id}`);
      await redisClient.del('repartidores:all');
      await redisClient.del('repartidores:available');
      await redisClient.del('repartidores:available:location');

      res.json({
        message: 'Ubicación del repartidor actualizada correctamente.',
        repartidor: repartidorActualizado
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Actualizar estado de repartidor
  updateRepartidorStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!req.usuario) {
        return res.status(401).json({ error: 'Token requerido.' });
      }

      // Solo administradores pueden cambiar estado de repartidores
      if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'No autorizado para cambiar el estado.' });
      }

      // Validar estado
      const estadosValidos = ['disponible', 'ocupado', 'desconectado'];
      if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({ 
          error: `Estado debe ser uno de: ${estadosValidos.join(', ')}` 
        });
      }
      
      // Verificar que el repartidor existe
      const repartidorExistente = await RepartidorDAO.findById(id);
      if (!repartidorExistente) {
        return res.status(404).json({ error: 'Repartidor no encontrado.' });
      }

      const repartidorActualizado = await RepartidorDAO.updateRepartidorStatus(id, estado);

      if (!repartidorActualizado) {
        return res.status(404).json({ error: 'Repartidor no encontrado.' });
      }

      // Invalidar cachés relacionados
      await redisClient.del(`repartidor:${id}`);
      await redisClient.del('repartidores:all');
      await redisClient.del('repartidores:available');
      await redisClient.del('repartidores:available:location');
      await redisClient.del(`repartidor:${id}:usuarios`);

      res.json({
        message: 'Estado del repartidor actualizado correctamente.',
        repartidor: repartidorActualizado
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  }
};

module.exports = repartidorController;
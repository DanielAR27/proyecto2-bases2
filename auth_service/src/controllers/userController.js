// src/controllers/userController.js

const UserDAO = require('../dao/userDAO');
const axios = require('axios');
const redisClient = require('../config/redis');

const userController = {

  getMe: async (req, res) => {
    try {
      const idUsuario = req.usuario.id_usuario;
      const cacheKey = `user:${idUsuario}`;
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const usuario = await UserDAO.findById(idUsuario);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      // Guardar en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(usuario), {
        EX: 300
      });

      res.json(usuario);
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Obtener todos los usuarios con ubicación (para ETL y análisis)
  getAllUsersWithLocation: async (req, res) => {
    try {
      // Solo administradores pueden acceder a esta información
      if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'No tiene permisos para acceder a esta información.' });
      }

      const cacheKey = 'users:geo:all';
      
      // Intentar obtener de caché (expira en 10 minutos por ser datos para ETL)
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const usuarios = await UserDAO.getAllUsersWithLocation();

      // CREAR EL OBJETO COMPLETO PARA GUARDAR EN CACHÉ
      const responseData = {
        message: 'Usuarios con ubicación obtenidos correctamente.',
        total: usuarios.length,
        usuarios: usuarios
      };

      // Guardar el objeto completo en caché (expira en 10 minutos)
      await redisClient.set(cacheKey, JSON.stringify(responseData), {
        EX: 600
      });

      res.json(responseData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { nombre, email, rol } = req.body;
      const { id } = req.params;

      if (!nombre || !email || !rol) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
      }

      if (!['cliente', 'administrador'].includes(rol)) {
        return res.status(400).json({ error: "El rol debe ser 'cliente' o 'administrador'." });
      }

      if (req.usuario.rol !== 'administrador' && req.usuario.id_usuario !== Number(id)) {
        return res.status(403).json({ error: 'No tiene permisos para actualizar este usuario.' });
      }

      // Validar que un cliente NO pueda cambiar su rol a administrador
      if (req.usuario.rol !== 'administrador' && rol === 'administrador') {
        return res.status(403).json({ error: 'No tiene permisos para asignarse rol de administrador.' });
      }

      const usuarioExistente = await UserDAO.findById(id);
      if (!usuarioExistente) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      const usuarioActualizado = await UserDAO.updateUser(id, { nombre, email, rol });

      // Invalidar caché del usuario
      await redisClient.del(`user:${id}`);

      res.json({
        message: 'Usuario actualizado correctamente.',
        usuario: usuarioActualizado,
      });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'No tiene permisos para eliminar usuarios.' });
      }

      const usuarioEliminado = await UserDAO.deleteUser(id);
      if (!usuarioEliminado) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      // Si se borra un usuario, se hace un borrado en cascada para mongo.
      if (process.env.DB_TYPE === 'mongo') {
        await axios.delete(`${process.env.API_URL}/clean/user/${id}`);
      }

      // Invalidar caché del usuario
      await redisClient.del(`user:${id}`);
      
      // Invalidar caché de recursos relacionados
      await redisClient.del('restaurants:all');
      await redisClient.del('reservas:all');
      await redisClient.del('pedidos:all');
      
      res.json({ message: 'Usuario eliminado correctamente.'});

    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Actualizar la ubicación de un usuario
  updateUserLocation: async (req, res) => {
    try {
      const { id } = req.params;
      const { latitud, longitud, direccion_completa } = req.body;

      if (!req.usuario) {
        return res.status(401).json({ error: 'Token requerido.' });
      }

      // Solo admins o el mismo usuario pueden actualizar ubicación
      if (req.usuario.rol !== 'administrador' && req.usuario.id_usuario !== parseInt(id)) {
        return res.status(403).json({ error: 'No autorizado para actualizar esta ubicación.' });
      }

      // VALIDACIÓN BÁSICA EXISTENTE
      if (!latitud || !longitud) {
        return res.status(400).json({ error: 'Latitud y longitud son obligatorios.' });
      }
      
      // Validar que sean números válidos
      const lat = parseFloat(latitud);
      const lng = parseFloat(longitud);
      
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
      
      // Usar los valores parseados en lugar de los originales
      const usuarioActualizado = await UserDAO.updateUserLocation(id, {
        latitud: lat,
        longitud: lng,
        direccion_completa
      });

      if (!usuarioActualizado) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      // Invalidar caché del usuario
      await redisClient.del(`user:${id}`);

      res.json({
        message: 'Ubicación actualizada correctamente.',
        usuario: usuarioActualizado
      });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Actualizar la fecha de registro de un usuario (solo administrador).
  updateUserRegistrationDate: async (req, res) => {
    try {
      const { id } = req.params;
      const { fecha_registro } = req.body;

      // Solo administradores pueden actualizar fecha de registro
      if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'No tiene permisos para actualizar fecha de registro.' });
      }

      if (!fecha_registro) {
        return res.status(400).json({ error: 'La fecha de registro es obligatoria.' });
      }

      // Validar formato de fecha
      const fecha = new Date(fecha_registro);
      if (isNaN(fecha.getTime())) {
        return res.status(400).json({ error: 'Formato de fecha inválido.' });
      }

      const usuarioActualizado = await UserDAO.updateUserRegistrationDate(id, fecha);

      if (!usuarioActualizado) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      // Invalidar caché del usuario
      await redisClient.del(`user:${id}`);

      res.json({
        message: 'Fecha de registro actualizada correctamente.',
        usuario: usuarioActualizado
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  }
};

module.exports = userController;
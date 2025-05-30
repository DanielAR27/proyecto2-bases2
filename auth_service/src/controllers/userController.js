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

      // Validar autorización
      console.log("Token ID:", req.usuario.id_usuario);
      console.log("Token Rol:", req.usuario.rol);
      console.log("ID parámetro:", id);

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
};

module.exports = userController;
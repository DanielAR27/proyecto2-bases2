// src/controllers/reservationController.js

const ReservationDAO = require('../dao/reservationDAO');
const redisClient = require('../config/redis');

const reservationController = {
  // Crear reserva
  async createReservation(req, res) {
    try {
      const { id_usuario, id_restaurante, fecha_hora, estado } = req.body;

      if (!req.usuario) {
        return res.status(401).json({ error: 'Token requerido.' });
      }

      if (!id_usuario || !id_restaurante || !fecha_hora || !estado) {
        return res.status(400).json({ error: 'Faltan datos requeridos.' });
      }

      if (req.usuario.id_usuario !== id_usuario && req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo puede crear reservas para usted mismo o si es administrador.' });
      }

      const nueva = await ReservationDAO.createReservation({
        id_usuario,
        id_restaurante,
        fecha_hora,
        estado,
      });

      // Invalidar caché de reservas
      await redisClient.del('reservas:all');

      res.status(201).json({ message: 'Reserva creada.', reserva: nueva });
    } catch (error) {
      /* istanbul ignore next */
      console.error(error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al crear la reserva.' });
    }
  },

  // Obtener todas las reservas
  async getAllReservations(req, res) {
    try {
      const cacheKey = 'reservas:all';
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Si no está en caché, obtener de la base de datos
      const reservas = await ReservationDAO.getAllReservations();
      
      // Guardar en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(reservas), {
        EX: 300 // 5 minutos
      });
      
      res.json(reservas);
    } catch (error) {
      /* istanbul ignore next */
      console.error(error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al obtener reservas.' });
    }
  },

  // Obtener una reserva por ID
  async getReservationById(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `reserva:${id}`;
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const reserva = await ReservationDAO.findById(id);

      if (!reserva) {
        return res.status(404).json({ error: 'Reserva no encontrada.' });
      }

      // Guardar en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(reserva), {
        EX: 300
      });

      res.json(reserva);
    } catch (error) {
      /* istanbul ignore next */
      console.error(error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al buscar la reserva.' });
    }
  },

  // Actualizar reserva (fecha_hora y/o estado opcionales)
  async updateReservation(req, res) {
    try {
      const { id } = req.params;
      const { fecha_hora, estado } = req.body;

      if (!req.usuario) {
        return res.status(401).json({ error: 'Token requerido.' });
      }

      // Validar que al menos un campo venga para actualizar
      if (!fecha_hora && !estado) {
        return res.status(400).json({ 
          error: 'Se debe proporcionar al menos un campo para actualizar: fecha_hora o estado.' 
        });
      }

      // Validar estado si viene
      if (estado) {
        const estadosValidos = ['pendiente', 'confirmada', 'cancelada'];
        if (!estadosValidos.includes(estado)) {
          return res.status(400).json({
            error: 'Estado inválido.',
            estadosValidos
          });
        }
      }

      // Validar formato de fecha si viene
      if (fecha_hora) {
        const fechaValida = new Date(fecha_hora);
        if (isNaN(fechaValida.getTime())) {
          return res.status(400).json({
            error: 'Formato de fecha inválido. Use formato ISO: YYYY-MM-DDTHH:MM:SSZ'
          });
        }
      }

      const reserva = await ReservationDAO.findById(id);
      if (!reserva) {
        return res.status(404).json({ error: 'Reserva no encontrada.' });
      }

      if (req.usuario.rol !== 'administrador' && req.usuario.id_usuario !== reserva.id_usuario) {
        return res.status(403).json({ error: 'No tienes permiso para actualizar esta reserva.' });
      }

      const actualizada = await ReservationDAO.updateReservation(id, { fecha_hora, estado });

      if (!actualizada) {
        return res.status(400).json({ error: 'No se pudo actualizar la reserva.' });
      }

      // Invalidar cachés relacionados
      if (redisClient && redisClient.isOpen) {
        try {
          await redisClient.del(`reserva:${id}`);
          await redisClient.del('reservas:all');
        } catch (cacheError) {
          console.error('Error al invalidar caché:', cacheError);
        }
      }

      res.json({ 
        message: 'Reserva actualizada correctamente.', 
        reserva: actualizada 
      });
    } catch (error) {
      console.error('Error al actualizar reserva:', error);
      res.status(500).json({ error: 'Error al actualizar la reserva.' });
    }
  },

  // Eliminar reserva
  async deleteReservation(req, res) {
    try {
      const { id } = req.params;

      if (!req.usuario) {
        return res.status(401).json({ error: 'Token requerido.' });
      }

      const reserva = await ReservationDAO.findById(id);
      if (!reserva) {
        return res.status(404).json({ error: 'Reserva no encontrada.' });
      }

      if (req.usuario.rol !== 'administrador' && req.usuario.id_usuario !== reserva.id_usuario) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar esta reserva.' });
      }

      const eliminada = await ReservationDAO.deleteReservation(id);

      // Invalidar caché individual y la lista
      await redisClient.del(`reserva:${id}`);
      await redisClient.del('reservas:all');

      res.json({ message: 'Reserva eliminada correctamente.' });
    } catch (error) {
      /* istanbul ignore next */
      console.error(error);
      /* istanbul ignore next */
      res.status(500).json({ error: 'Error al eliminar la reserva.' });
    }
  }
};

module.exports = reservationController;
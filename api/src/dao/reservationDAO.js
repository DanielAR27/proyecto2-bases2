// src/dao/reservationDAO.js

const pool = require('../db/db_postgres');
const ReservationModelMongo = require('../models/reservationMongoModel');
const dbType = process.env.DB_TYPE || 'postgres';

const ReservationDAO = {
  // Crear reserva
  async createReservation({ id_usuario, id_restaurante, fecha_hora, estado }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `INSERT INTO Reserva (id_usuario, id_restaurante, fecha_hora, estado)
         VALUES ($1, $2, $3, $4)
         RETURNING id_reserva, id_usuario, id_restaurante, fecha_hora, estado`,
        [id_usuario, id_restaurante, fecha_hora, estado]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const reserva = new ReservationModelMongo({ id_usuario, id_restaurante, fecha_hora, estado });
      const savedReservation = await reserva.save();
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_reserva: savedReservation.id_reserva,
        id_usuario: savedReservation.id_usuario,
        id_restaurante: savedReservation.id_restaurante,
        fecha_hora: savedReservation.fecha_hora,
        estado: savedReservation.estado
      };
    }
  },

  // Obtener todas las reservas
  async getAllReservations() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_reserva, id_usuario, id_restaurante, fecha_hora, estado 
         FROM Reserva 
         ORDER BY id_reserva`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      const reservations = await ReservationModelMongo.find({})
        .sort({ id_reserva: 1 })
        .lean();
      
      // Retornar en formato consistente con PostgreSQL
      return reservations.map(reservation => ({
        id_reserva: reservation.id_reserva,
        id_usuario: reservation.id_usuario,
        id_restaurante: reservation.id_restaurante,
        fecha_hora: reservation.fecha_hora,
        estado: reservation.estado
      }));
    }
  },

  // Buscar reserva por ID
  async findById(id_reserva) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_reserva, id_usuario, id_restaurante, fecha_hora, estado
         FROM Reserva
         WHERE id_reserva = $1`,
        [id_reserva]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const reservation = await ReservationModelMongo.findOne({ id_reserva }).lean();
      
      if (!reservation) return null;
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_reserva: reservation.id_reserva,
        id_usuario: reservation.id_usuario,
        id_restaurante: reservation.id_restaurante,
        fecha_hora: reservation.fecha_hora,
        estado: reservation.estado
      };
    }
  },

  // Actualizar reserva
  async updateReservation(id_reserva, { fecha_hora, estado }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Reserva
         SET fecha_hora = $1, estado = $2
         WHERE id_reserva = $3
         RETURNING id_reserva, id_usuario, id_restaurante, fecha_hora, estado`,
        [fecha_hora, estado, id_reserva]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const reservation = await ReservationModelMongo.findOneAndUpdate(
        { id_reserva },
        { fecha_hora, estado },
        { new: true, runValidators: true }
      ).lean();
      
      if (!reservation) return null;
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_reserva: reservation.id_reserva,
        id_usuario: reservation.id_usuario,
        id_restaurante: reservation.id_restaurante,
        fecha_hora: reservation.fecha_hora,
        estado: reservation.estado
      };
    }
  },

  // Eliminar reserva
  async deleteReservation(id_reserva) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `DELETE FROM Reserva
         WHERE id_reserva = $1
         RETURNING id_reserva`,
        [id_reserva]
      );
      return result.rowCount > 0;
    } else if (dbType === 'mongo') {
      const resultado = await ReservationModelMongo.findOneAndDelete({ id_reserva });
      return resultado !== null;
    }
  },
};

module.exports = ReservationDAO;
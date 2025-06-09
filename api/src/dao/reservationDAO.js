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

  // Actualizar reserva (fecha_hora y/o estado opcionales)
  async updateReservation(id_reserva, { fecha_hora = null, estado = null }) {
    if (dbType === 'postgres') {
      // Construir la query dinámicamente
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (fecha_hora !== null) {
        fields.push(`fecha_hora = $${paramCount}`);
        values.push(fecha_hora);
        paramCount++;
      }

      if (estado !== null) {
        fields.push(`estado = $${paramCount}`);
        values.push(estado);
        paramCount++;
      }

      // Si no hay campos para actualizar, retornar null
      if (fields.length === 0) {
        return null;
      }

      values.push(id_reserva);
      
      const result = await pool.query(
        `UPDATE Reserva 
        SET ${fields.join(', ')}
        WHERE id_reserva = $${paramCount}
        RETURNING id_reserva, id_usuario, id_restaurante, fecha_hora, estado`,
        values
      );
      return result.rows[0];

    } else if (dbType === 'mongo') {
      const updateFields = {};
      
      if (fecha_hora !== null) {
        updateFields.fecha_hora = new Date(fecha_hora);
      }
      
      if (estado !== null) {
        updateFields.estado = estado;
      }

      // Si no hay campos para actualizar, retornar null
      if (Object.keys(updateFields).length === 0) {
        return null;
      }

      const reservation = await ReservationModelMongo.findOneAndUpdate(
        { id_reserva },
        updateFields,
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
  }
};

module.exports = ReservationDAO;
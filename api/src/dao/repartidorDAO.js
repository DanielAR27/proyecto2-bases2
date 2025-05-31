// src/dao/repartidorDAO.js

const pool = require('../db/db_postgres');
const RepartidorModelMongo = require('../models/repartidorMongoModel');
const dbType = process.env.DB_TYPE || 'postgres';

const RepartidorDAO = {
  // Crear repartidor
  async createRepartidor({ nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado = 'disponible' }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `INSERT INTO Repartidor (nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id_repartidor, nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado, fecha_registro`,
        [nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const repartidor = new RepartidorModelMongo({ 
        nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado 
      });
      return await repartidor.save();
    }
  },

  // Obtener todos los repartidores
  async getAllRepartidores() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_repartidor, nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado, fecha_registro
         FROM Repartidor
         ORDER BY fecha_registro DESC`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      return await RepartidorModelMongo.find({}).lean();
    }
  },

  // Buscar repartidor por ID
  async findById(id_repartidor) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_repartidor, nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado, fecha_registro
         FROM Repartidor
         WHERE id_repartidor = $1`,
        [id_repartidor]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      return await RepartidorModelMongo.findOne({ id_repartidor }).lean();
    }
  },

  // Actualizar ubicación del repartidor
  async updateLocation(id_repartidor, { latitud_actual, longitud_actual }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Repartidor 
         SET latitud_actual = $1, longitud_actual = $2
         WHERE id_repartidor = $3
         RETURNING id_repartidor, nombre, latitud_actual, longitud_actual, estado`,
        [latitud_actual, longitud_actual, id_repartidor]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      return await RepartidorModelMongo.findOneAndUpdate(
        { id_repartidor },
        { latitud_actual, longitud_actual },
        { new: true, runValidators: true }
      ).lean();
    }
  },

  // Actualizar estado del repartidor
  async updateStatus(id_repartidor, estado) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Repartidor 
         SET estado = $1
         WHERE id_repartidor = $2
         RETURNING id_repartidor, nombre, estado`,
        [estado, id_repartidor]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      return await RepartidorModelMongo.findOneAndUpdate(
        { id_repartidor },
        { estado },
        { new: true, runValidators: true }
      ).lean();
    }
  },

  // Buscar repartidores disponibles
  async findAvailableDrivers() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_repartidor, nombre, telefono, vehiculo, latitud_actual, longitud_actual
         FROM Repartidor
         WHERE estado = 'disponible' 
         AND latitud_actual IS NOT NULL 
         AND longitud_actual IS NOT NULL`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      return await RepartidorModelMongo.find({
        estado: 'disponible',
        latitud_actual: { $exists: true, $ne: null },
        longitud_actual: { $exists: true, $ne: null }
      }).lean();
    }
  },

  // Eliminar repartidor
  async deleteRepartidor(id_repartidor) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `DELETE FROM Repartidor
         WHERE id_repartidor = $1
         RETURNING id_repartidor`,
        [id_repartidor]
      );
      return result.rowCount > 0;
    } else if (dbType === 'mongo') {
      return await RepartidorModelMongo.findOneAndDelete({ id_repartidor });
    }
  }
};

module.exports = RepartidorDAO;
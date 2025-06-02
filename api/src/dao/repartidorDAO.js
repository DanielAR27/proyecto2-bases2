// src/dao/repartidorDAO.js

const pool = require('../db/db_postgres');
const RepartidorModelMongo = require('../models/repartidorMongoModel');
const UserModelMongo = require('../models/userMongoModel');
const PedidoModelMongo = require('../models/pedidoMongoModel');
const dbType = process.env.DB_TYPE || 'postgres';

const RepartidorDAO = {
  // Crear repartidor
  async createRepartidor({ nombre, telefono, vehiculo }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `INSERT INTO Repartidor (nombre, telefono, vehiculo)
         VALUES ($1, $2, $3)
         RETURNING id_repartidor, nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado, fecha_registro`,
        [nombre, telefono, vehiculo]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const repartidor = new RepartidorModelMongo({ 
        nombre, 
        telefono, 
        vehiculo 
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
      return await RepartidorModelMongo.find({})
        .select('id_repartidor nombre telefono vehiculo latitud_actual longitud_actual estado fecha_registro')
        .sort({ fecha_registro: -1 })
        .lean();
    }
  },

  // Obtener repartidores disponibles
  async getAvailableRepartidores() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_repartidor, nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado
         FROM Repartidor 
         WHERE estado = 'disponible'`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      return await RepartidorModelMongo.find({
        estado: 'disponible'
      }).lean();
    }
  },

  // Obtener repartidores disponibles con ubicación
  async getAvailableWithLocation() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_repartidor, nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado
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

  // Obtener usuarios asignados a un repartidor
  async getUsersAssignedToDriver(id_repartidor) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT DISTINCT u.id_usuario, u.latitud, u.longitud
        FROM Pedido p
        JOIN Usuario u ON p.id_usuario = u.id_usuario
        WHERE p.id_repartidor = $1 AND p.estado != 'entregado'`,
        [id_repartidor]
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      // Obtener pedidos del repartidor
      const pedidos = await PedidoModelMongo.find({
        id_repartidor: parseInt(id_repartidor),
        estado: { $ne: 'entregado' }
      }).distinct('id_usuario'); // ← Cambiado a id_usuario
      
      // Obtener usuarios con sus ubicaciones
      const usuarios = await UserModelMongo.find({
        id_usuario: { $in: pedidos } // ← Cambiado a id_usuario
      }).select('id_usuario latitud longitud').lean(); // ← Corregido el typo
      
      return usuarios;
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
      // Intentar buscar por id_repartidor primero
      let repartidor = await RepartidorModelMongo.findOne({ id_repartidor }).lean();
      return repartidor;
    }
  },

  // Actualizar información básica del repartidor
  async updateRepartidor(id_repartidor, { nombre, telefono, vehiculo }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Repartidor
         SET nombre = $1, telefono = $2, vehiculo = $3
         WHERE id_repartidor = $4
         RETURNING id_repartidor, nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado, fecha_registro`,
        [nombre, telefono, vehiculo, id_repartidor]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      return await RepartidorModelMongo.findOneAndUpdate(
        { id_repartidor },
        { nombre, telefono, vehiculo },
        { new: true, runValidators: true }
      ).lean();
    }
  },

  // Actualizar ubicación del repartidor
  async updateRepartidorLocation(id_repartidor, { latitud_actual, longitud_actual }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Repartidor 
         SET latitud_actual = $1, longitud_actual = $2
         WHERE id_repartidor = $3
         RETURNING id_repartidor, nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado`,
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
  async updateRepartidorStatus(id_repartidor, estado) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Repartidor 
         SET estado = $1
         WHERE id_repartidor = $2
         RETURNING id_repartidor, nombre, telefono, vehiculo, latitud_actual, longitud_actual, estado`,
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
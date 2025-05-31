// src/dao/userDAO.js

const pool = require('../db/db_postgres'); // Conexión Postgres
const UserModelMongo = require('../models/userMongoModel'); // Modelo Mongo
const dbType = process.env.DB_TYPE || 'postgres';

const UserDAO = {
  // Buscar usuario por email
  async findByEmail(email) {
    if (dbType === 'postgres') {
      const result = await pool.query('SELECT * FROM Usuario WHERE email = $1', [email]);
      return result.rows[0];
    } else if (dbType === 'mongo') {
      return await UserModelMongo.findOne({ email }).lean();
    }
  },

  // Crear nuevo usuario
  async createUser({ nombre, email, contrasena_hash, rol }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        'INSERT INTO Usuario (nombre, email, contrasena_hash, rol) VALUES ($1, $2, $3, $4) RETURNING *',
        [nombre, email, contrasena_hash, rol]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const user = new UserModelMongo({ nombre, email, contrasena_hash, rol });
      return (await user.save()).toObject();
    }
  },

  // Obtener todos los usuarios con ubicación (para ETL y análisis OLAP)
  async getAllUsersWithLocation() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_usuario, nombre, email, rol, latitud, longitud, direccion_completa, fecha_registro
         FROM Usuario 
         WHERE latitud IS NOT NULL 
         AND longitud IS NOT NULL
         ORDER BY fecha_registro DESC`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      return await UserModelMongo.find({
        latitud: { $exists: true, $ne: null },
        longitud: { $exists: true, $ne: null }
      }).lean();
    }
  },

  // Buscar usuario por ID
  async findById(id_usuario) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_usuario, nombre, email, rol, latitud, longitud, direccion_completa
         FROM Usuario 
         WHERE id_usuario = $1`,
        [id_usuario]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      return await UserModelMongo.findOne({ id_usuario }).lean();
    }
  },

  // Actualizar usuario
  async updateUser(id_usuario, { nombre, email, rol }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        'UPDATE Usuario SET nombre = $1, email = $2, rol = $3 WHERE id_usuario = $4 RETURNING id_usuario, nombre, email, rol',
        [nombre, email, rol, id_usuario]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      return await UserModelMongo.findOneAndUpdate(
        { id_usuario },
        { nombre, email, rol },
        { new: true, runValidators: true }
      ).lean();
    }
  },

  // Eliminar usuario
  async deleteUser(id_usuario) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        'DELETE FROM Usuario WHERE id_usuario = $1 RETURNING *',
        [id_usuario]
      );
      return result.rowCount > 0;
    } else if (dbType === 'mongo') {
      return await UserModelMongo.findOneAndDelete({ id_usuario });
    }
  },

 // Actualizar ubicación de usuario
  async updateUserLocation(id_usuario, { latitud, longitud, direccion_completa }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Usuario 
         SET latitud = $1, longitud = $2, direccion_completa = $3
         WHERE id_usuario = $4
         RETURNING id_usuario, nombre, email, rol, latitud, longitud, direccion_completa`,
        [latitud, longitud, direccion_completa, id_usuario]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      return await UserModelMongo.findOneAndUpdate(
        { id_usuario },
        { latitud, longitud, direccion_completa },
        { new: true, runValidators: true }
      ).lean();
    }
  }

};

module.exports = UserDAO;

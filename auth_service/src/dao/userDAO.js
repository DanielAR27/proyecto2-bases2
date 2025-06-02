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
  async createUser({ nombre, email, contrasena_hash, rol, id_referido = null }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `INSERT INTO Usuario (nombre, email, contrasena_hash, rol, id_referido)
         VALUES ($1, $2, $3, $4, $5) RETURNING id_usuario, nombre, email, rol, id_referido`,
        [nombre, email, contrasena_hash, rol, id_referido]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const user = new UserModelMongo({ nombre, email, contrasena_hash, rol, id_referido });
      const savedUser = await user.save();
  
      // Retornar solo los campos necesarios en el mismo orden que PostgreSQL
      return {
        id_usuario: savedUser.id_usuario,
        nombre: savedUser.nombre,
        email: savedUser.email,
        rol: savedUser.rol,
        id_referido: savedUser.id_referido || null
      };
    }
  },

  // Obtener todos los usuarios con ubicación (para ETL y análisis OLAP)
  async getAllUsersWithLocation() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_usuario, nombre, email, rol, latitud, longitud, direccion_completa, fecha_registro, id_referido
         FROM Usuario 
         WHERE latitud IS NOT NULL 
         AND longitud IS NOT NULL
         ORDER BY fecha_registro DESC`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      const users = await UserModelMongo.find({
        latitud: { $exists: true, $ne: null },
        longitud: { $exists: true, $ne: null }})
        .sort({fecha_registro: -1})
        .lean();
  
      return users.map(user => ({
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        latitud: user.latitud,
        longitud: user.longitud,
        direccion_completa: user.direccion_completa,
        fecha_registro: user.fecha_registro,
        id_referido: user.id_referido || null
      }));
    }
  },

  // Buscar usuario por ID
  async findById(id_usuario) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_usuario, nombre, email, rol, latitud, longitud, direccion_completa, id_referido
         FROM Usuario 
         WHERE id_usuario = $1`,
        [id_usuario]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const user = await UserModelMongo.findOne({ id_usuario })
      .lean();

      if (!user) return null;

      // Retornar solo los campos necesarios en el mismo orden que PostgreSQL
      return {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        latitud: user.latitud || null,
        longitud: user.longitud || null ,
        direccion_completa: user.direccion_completa || null,
        id_referido: user.id_referido || null
      };
    }
  },

  // Actualizar usuario
  async updateUser(id_usuario, { nombre, email, rol }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Usuario SET nombre = $1, email = $2, rol = $3 WHERE id_usuario = $4
         RETURNING id_usuario, nombre, email, rol`,
        [nombre, email, rol, id_usuario]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const user = await UserModelMongo.findOneAndUpdate(
        { id_usuario },
        { nombre, email, rol },
        { new: true, runValidators: true }
      ).lean();

      if (!user) return null;

      // Retornar solo los campos necesarios en el mismo orden que PostgreSQL
      return {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      };
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
      const user = await UserModelMongo.findOneAndUpdate(
        { id_usuario },
        { latitud, longitud, direccion_completa },
        { new: true, runValidators: true }
      ).lean();

      if (!user) return null;

      // Retornar solo los campos necesarios en el mismo orden que PostgreSQL
      return {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        latitud: user.latitud,
        longitud: user.longitud,
        direccion_completa: user.direccion_completa
      };
    }
  },

  // Actualizar fecha de registro de usuario (solo admin)
  async updateUserRegistrationDate(id_usuario, fecha_registro) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Usuario 
        SET fecha_registro = $1
        WHERE id_usuario = $2
        RETURNING id_usuario, nombre, email, fecha_registro`,
        [fecha_registro, id_usuario]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const user =  await UserModelMongo.findOneAndUpdate(
        { id_usuario },
        { fecha_registro },
        { new: true, runValidators: true }
      ).lean();

      if (!user) return null;

      // Retornar solo los campos necesarios en el mismo orden que PostgreSQL
      return {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        fecha_registro: user.fecha_registro
      };
    }
  }

};

module.exports = UserDAO;

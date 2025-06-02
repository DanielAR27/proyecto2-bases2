// src/dao/restaurantDAO.js

const pool = require('../db/db_postgres');
const RestaurantModelMongo = require('../models/restaurantMongoModel');
const dbType = process.env.DB_TYPE || 'postgres';

const RestaurantDAO = {
  // Crear restaurante
  async createRestaurant({ nombre, direccion, id_admin }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `INSERT INTO Restaurante (nombre, direccion, id_admin)
         VALUES ($1, $2, $3)
         RETURNING id_restaurante, nombre, direccion, id_admin`,
        [nombre, direccion, id_admin]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const restaurant = new RestaurantModelMongo({ nombre, direccion, id_admin });
      return await restaurant.save();
    }
  },

  // Obtener todos los restaurantes
  async getAllRestaurants() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_restaurante, nombre, direccion, id_admin
         FROM Restaurante`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      return await RestaurantModelMongo.find({}, 'id_restaurante nombre direccion id_admin').lean();
    }
  },

  // Obtener todos los restaurantes con ubicación (para delivery)
  async getAllRestaurantsWithLocation() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_restaurante, nombre, direccion, id_admin, latitud, longitud
         FROM Restaurante 
         WHERE latitud IS NOT NULL 
         AND longitud IS NOT NULL`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      return await RestaurantModelMongo.find({
        latitud: { $exists: true, $ne: null },
        longitud: { $exists: true, $ne: null }
      }).lean();
    }
  },

  // Buscar restaurante por ID
  async findById(id_restaurante) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_restaurante, nombre, direccion, id_admin, latitud, longitud
         FROM Restaurante 
         WHERE id_restaurante = $1`,
        [id_restaurante]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      return await RestaurantModelMongo.findOne({ id_restaurante }).lean();
    }
  },

  // Actualizar restaurante
  async updateRestaurant(id_restaurante, { nombre, direccion }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Restaurante
         SET nombre = $1, direccion = $2
         WHERE id_restaurante = $3
         RETURNING id_restaurante, nombre, direccion, id_admin`,
        [nombre, direccion, id_restaurante]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      return await RestaurantModelMongo.findOneAndUpdate(
        { id_restaurante },
        { nombre, direccion },
        { new: true, runValidators: true }
      ).lean();
    }
  },

  // Eliminar restaurante
  async deleteRestaurant(id_restaurante) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `DELETE FROM Restaurante
         WHERE id_restaurante = $1
         RETURNING id_restaurante`,
        [id_restaurante]
      );
      return result.rowCount > 0;
    } else if (dbType === 'mongo') {
      return await RestaurantModelMongo.findOneAndDelete({ id_restaurante });
    }
  },

  // Actualizar ubicación de restaurante
  async updateRestaurantLocation(id_restaurante, { latitud, longitud }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Restaurante 
         SET latitud = $1, longitud = $2
         WHERE id_restaurante = $3
         RETURNING id_restaurante, nombre, direccion, id_admin, latitud, longitud`,
        [latitud, longitud, id_restaurante]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      return await RestaurantModelMongo.findOneAndUpdate(
        { id_restaurante },
        { latitud, longitud },
        { new: true, runValidators: true }
      ).lean();
    }
  }
};

module.exports = RestaurantDAO;

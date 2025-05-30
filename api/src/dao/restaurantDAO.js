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

  // Buscar restaurante por ID
  async findById(id_restaurante) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_restaurante, nombre, direccion, id_admin
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
};

module.exports = RestaurantDAO;

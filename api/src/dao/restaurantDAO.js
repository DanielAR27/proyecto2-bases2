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
      const savedRestaurant = await restaurant.save();
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_restaurante: savedRestaurant.id_restaurante,
        nombre: savedRestaurant.nombre,
        direccion: savedRestaurant.direccion,
        id_admin: savedRestaurant.id_admin
      };
    }
  },

  // Obtener todos los restaurantes
  async getAllRestaurants() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_restaurante, nombre, direccion, id_admin
         FROM Restaurante
         ORDER BY id_restaurante`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      const restaurants = await RestaurantModelMongo.find({})
        .sort({ id_restaurante: 1 })
        .lean();
      
      // Retornar en formato consistente con PostgreSQL
      return restaurants.map(restaurant => ({
        id_restaurante: restaurant.id_restaurante,
        nombre: restaurant.nombre,
        direccion: restaurant.direccion,
        id_admin: restaurant.id_admin
      }));
    }
  },

  // Obtener todos los restaurantes con ubicación (para delivery)
  async getAllRestaurantsWithLocation() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_restaurante, nombre, direccion, id_admin, latitud, longitud
         FROM Restaurante 
         WHERE latitud IS NOT NULL 
         AND longitud IS NOT NULL
         ORDER BY id_restaurante`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      const restaurants = await RestaurantModelMongo.find({
        latitud: { $exists: true, $ne: null },
        longitud: { $exists: true, $ne: null }
      })
      .sort({ id_restaurante: 1 })
      .lean();
      
      // Retornar en formato consistente con PostgreSQL
      return restaurants.map(restaurant => ({
        id_restaurante: restaurant.id_restaurante,
        nombre: restaurant.nombre,
        direccion: restaurant.direccion,
        id_admin: restaurant.id_admin,
        latitud: restaurant.latitud,
        longitud: restaurant.longitud
      }));
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
      const restaurant = await RestaurantModelMongo.findOne({ id_restaurante }).lean();
      
      if (!restaurant) return null;
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_restaurante: restaurant.id_restaurante,
        nombre: restaurant.nombre,
        direccion: restaurant.direccion,
        id_admin: restaurant.id_admin,
        latitud: restaurant.latitud || null,
        longitud: restaurant.longitud || null
      };
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
      const restaurant = await RestaurantModelMongo.findOneAndUpdate(
        { id_restaurante },
        { nombre, direccion },
        { new: true, runValidators: true }
      ).lean();
      
      if (!restaurant) return null;
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_restaurante: restaurant.id_restaurante,
        nombre: restaurant.nombre,
        direccion: restaurant.direccion,
        id_admin: restaurant.id_admin
      };
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
      const resultado = await RestaurantModelMongo.findOneAndDelete({ id_restaurante });
      return resultado !== null;
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
      const restaurant = await RestaurantModelMongo.findOneAndUpdate(
        { id_restaurante },
        { latitud, longitud },
        { new: true, runValidators: true }
      ).lean();
      
      if (!restaurant) return null;
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_restaurante: restaurant.id_restaurante,
        nombre: restaurant.nombre,
        direccion: restaurant.direccion,
        id_admin: restaurant.id_admin,
        latitud: restaurant.latitud,
        longitud: restaurant.longitud
      };
    }
  }
};

module.exports = RestaurantDAO;
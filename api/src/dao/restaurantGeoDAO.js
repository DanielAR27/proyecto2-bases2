// src/dao/restaurantGeoDAO.js

const pool = require('../db/db_postgres');
const RestaurantModelMongo = require('../models/restaurantMongoModel');
const dbType = process.env.DB_TYPE || 'postgres';

const RestaurantGeoDAO = {
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
  },

  // Obtener restaurante con ubicación
  async findRestaurantWithLocation(id_restaurante) {
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


};



module.exports = RestaurantGeoDAO;
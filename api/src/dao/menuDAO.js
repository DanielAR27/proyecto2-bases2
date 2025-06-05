// src/dao/menuDAO.js

const pool = require('../db/db_postgres');
const MenuModelMongo = require('../models/menuMongoModel');
const dbType = process.env.DB_TYPE || 'postgres';

const MenuDAO = {
  // Crear menú
  async createMenu({ id_restaurante, nombre, descripcion }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `INSERT INTO Menu (id_restaurante, nombre, descripcion)
         VALUES ($1, $2, $3)
         RETURNING id_menu, id_restaurante, nombre, descripcion`,
        [id_restaurante, nombre, descripcion]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const menu = new MenuModelMongo({ id_restaurante, nombre, descripcion });
      const savedMenu = await menu.save();
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_menu: savedMenu.id_menu,
        id_restaurante: savedMenu.id_restaurante,
        nombre: savedMenu.nombre,
        descripcion: savedMenu.descripcion
      };
    }
  },

  // Obtener todos los menús
  async getAllMenus() {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_menu, id_restaurante, nombre, descripcion 
         FROM Menu 
         ORDER BY id_menu`
      );
      return result.rows;
    } else if (dbType === 'mongo') {
      const menus = await MenuModelMongo.find({})
        .sort({ id_menu: 1 })
        .lean();
      
      // Retornar en formato consistente con PostgreSQL
      return menus.map(menu => ({
        id_menu: menu.id_menu,
        id_restaurante: menu.id_restaurante,
        nombre: menu.nombre,
        descripcion: menu.descripcion
      }));
    }
  },

  // Buscar menú por ID
  async findById(id_menu) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `SELECT id_menu, id_restaurante, nombre, descripcion
         FROM Menu
         WHERE id_menu = $1`,
        [id_menu]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const menu = await MenuModelMongo.findOne({ id_menu }).lean();
      
      if (!menu) return null;
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_menu: menu.id_menu,
        id_restaurante: menu.id_restaurante,
        nombre: menu.nombre,
        descripcion: menu.descripcion
      };
    }
  },

  // Actualizar menú
  async updateMenu(id_menu, { nombre, descripcion }) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `UPDATE Menu
         SET nombre = $1, descripcion = $2
         WHERE id_menu = $3
         RETURNING id_menu, id_restaurante, nombre, descripcion`,
        [nombre, descripcion, id_menu]
      );
      return result.rows[0];
    } else if (dbType === 'mongo') {
      const menu = await MenuModelMongo.findOneAndUpdate(
        { id_menu },
        { nombre, descripcion },
        { new: true, runValidators: true }
      ).lean();
      
      if (!menu) return null;
      
      // Retornar en formato consistente con PostgreSQL
      return {
        id_menu: menu.id_menu,
        id_restaurante: menu.id_restaurante,
        nombre: menu.nombre,
        descripcion: menu.descripcion
      };
    }
  },

  // Eliminar menú
  async deleteMenu(id_menu) {
    if (dbType === 'postgres') {
      const result = await pool.query(
        `DELETE FROM Menu
         WHERE id_menu = $1
         RETURNING id_menu`,
        [id_menu]
      );
      return result.rowCount > 0;
    } else if (dbType === 'mongo') {
      const resultado = await MenuModelMongo.findOneAndDelete({ id_menu });
      return resultado !== null;
    }
  },
};

module.exports = MenuDAO;
// src/controllers/menuController.js

const MenuDAO = require('../dao/menuDAO');
const redisClient = require('../config/redis');

const menuController = {
  // Crear un menú
  createMenu: async (req, res) => {
    try {
      const { id_restaurante, nombre, descripcion } = req.body;

      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden crear menús.' });
      }

      if (!id_restaurante || !nombre) {
        return res.status(400).json({ error: 'id_restaurante y nombre son obligatorios.' });
      }

      const nuevoMenu = await MenuDAO.createMenu({ id_restaurante, nombre, descripcion });

      // Invalidar caché de menús general
      await redisClient.del('menus:all');

      res.status(201).json({
        message: 'Menú creado correctamente.',
        menu: nuevoMenu,
      });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Obtener todos los menús
  getAllMenus: async (req, res) => {
    try {
      const cacheKey = 'menus:all';
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Si no está en caché, obtener de la base de datos
      const menus = await MenuDAO.getAllMenus();
      
      // Guardar en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(menus), {
        EX: 300 // 5 minutos
      });
      
      res.json(menus);
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Obtener un menú por ID
  getMenuById: async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `menu:${id}`;
      
      // Intentar obtener de caché
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const menu = await MenuDAO.findById(id);

      if (!menu) {
        return res.status(404).json({ error: 'Menú no encontrado.' });
      }

      // Guardar en caché (expira en 5 minutos)
      await redisClient.set(cacheKey, JSON.stringify(menu), {
        EX: 300
      });

      res.json(menu);
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Actualizar un menú
  updateMenu: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, descripcion } = req.body;

      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden actualizar menús.' });
      }

      if (!nombre) {
        return res.status(400).json({ error: 'El nombre del menú es obligatorio.' });
      }

      const menuActualizado = await MenuDAO.updateMenu(id, { nombre, descripcion });

      if (!menuActualizado) {
        return res.status(404).json({ error: 'Menú no encontrado.' });
      }

      // Invalidar caché individual y la lista
      await redisClient.del(`menu:${id}`);
      await redisClient.del('menus:all');

      res.json({
        message: 'Menú actualizado correctamente.',
        menu: menuActualizado,
      });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },

  // Eliminar un menú
  deleteMenu: async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.usuario || req.usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden eliminar menús.' });
      }

      const eliminado = await MenuDAO.deleteMenu(id);

      if (!eliminado) {
        return res.status(404).json({ error: 'Menú no encontrado.' });
      }

      // Invalidar caché de menú
      await redisClient.del(`menu:${id}`);
      await redisClient.del('menus:all');
      
      // Invalidar caché de productos (porque se eliminan productos por el middleware)
      await redisClient.del('products:all');

      res.json({ message: 'Menú eliminado correctamente.' });
    } catch (error) {
      /* istanbul ignore next*/
      console.error(error);
      /* istanbul ignore next*/
      res.status(500).json({ error: 'Error en el servidor.' });
    }
  },
};

module.exports = menuController;
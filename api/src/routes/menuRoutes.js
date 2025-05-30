// src/routes/menuRoutes.js

const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Menús
 *   description: Operaciones relacionadas con menús
 */

/**
 * @swagger
 * /menus:
 *   post:
 *     summary: Crear un nuevo menú
 *     tags: [Menús]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_restaurante
 *               - nombre
 *             properties:
 *               id_restaurante:
 *                 type: integer
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Menú creado correctamente.
 *       400:
 *         description: Datos inválidos.
 *       403:
 *         description: No autorizado. El usuario no tiene permisos de administrador o el token no es válido.
 *       500:
 *         description: Error del servidor.
 */
router.post('/', authMiddleware, menuController.createMenu);

/**
 * @swagger
 * /menus:
 *   get:
 *     summary: Obtener todos los menús
 *     tags: [Menús]
 *     responses:
 *       200:
 *         description: Lista de menús.
 *       500:
 *         description: Error del servidor.
 */
router.get('/', menuController.getAllMenus);

/**
 * @swagger
 * /menus/{id}:
 *   get:
 *     summary: Obtener un menú por ID
 *     tags: [Menús]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del menú
 *     responses:
 *       200:
 *         description: Menú encontrado.
 *       404:
 *         description: Menú no encontrado.
 *       500:
 *         description: Error del servidor.
 */
router.get('/:id', menuController.getMenuById);

/**
 * @swagger
 * /menus/{id}:
 *   put:
 *     summary: Actualizar un menú
 *     tags: [Menús]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del menú
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Menú actualizado correctamente.
 *       400:
 *         description: Datos inválidos.
 *       403:
 *         description: No autorizado. El usuario no tiene permisos de administrador o el token no es válido.
 *       404:
 *         description: Menú no encontrado.
 *       500:
 *         description: Error del servidor.
 */
router.put('/:id', authMiddleware, menuController.updateMenu);

/**
 * @swagger
 * /menus/{id}:
 *   delete:
 *     summary: Eliminar un menú
 *     tags: [Menús]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del menú
 *     responses:
 *       200:
 *         description: Menú eliminado correctamente.
 *       403:
 *         description: No autorizado. El usuario no tiene permisos de administrador o el token no es válido.
 *       404:
 *         description: Menú no encontrado.
 *       500:
 *         description: Error del servidor.
 */
router.delete('/:id', authMiddleware, menuController.deleteMenu);

module.exports = router;

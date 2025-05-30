// src/routes/restaurantRoutes.js

const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Restaurantes
 *   description: Operaciones relacionadas con restaurantes
 */

/**
 * @swagger
 * /restaurants:
 *   post:
 *     summary: Crear un nuevo restaurante
 *     tags: [Restaurantes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - direccion
 *             properties:
 *               nombre:
 *                 type: string
 *               direccion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Restaurante creado correctamente.
 *       400:
 *         description: Datos inválidos.
 *       403:
 *         description: No autorizado. El usuario no tiene permisos de administrador o el token no es válido.
 *       500:
 *         description: Error del servidor.
 */
router.post('/', authMiddleware, restaurantController.createRestaurant);

/**
 * @swagger
 * /restaurants:
 *   get:
 *     summary: Obtener todos los restaurantes
 *     tags: [Restaurantes]
 *     responses:
 *       200:
 *         description: Lista de restaurantes.
 *       500:
 *         description: Error del servidor.
 */
router.get('/', restaurantController.getAllRestaurants);

/**
 * @swagger
 * /restaurants/{id}:
 *   get:
 *     summary: Obtener un restaurante por ID
 *     tags: [Restaurantes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del restaurante
 *     responses:
 *       200:
 *         description: Restaurante encontrado.
 *       404:
 *         description: Restaurante no encontrado.
 *       500:
 *         description: Error del servidor.
 */
router.get('/:id', restaurantController.getRestaurantById);

/**
 * @swagger
 * /restaurants/{id}:
 *   put:
 *     summary: Actualizar un restaurante
 *     tags: [Restaurantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del restaurante
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - direccion
 *             properties:
 *               nombre:
 *                 type: string
 *               direccion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Restaurante actualizado correctamente.
 *       400:
 *         description: Datos inválidos.
 *       403:
 *         description: No autorizado. El usuario no tiene permisos de administrador o el token no es válido.
 *       404:
 *         description: Restaurante no encontrado.
 *       500:
 *         description: Error del servidor.
 */
router.put('/:id', authMiddleware, restaurantController.updateRestaurant);

/**
 * @swagger
 * /restaurants/{id}:
 *   delete:
 *     summary: Eliminar un restaurante
 *     tags: [Restaurantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del restaurante
 *     responses:
 *       200:
 *         description: Restaurante eliminado correctamente.
 *       403:
 *         description: No autorizado. El usuario no tiene permisos de administrador o el token no es válido.
 *       404:
 *         description: Restaurante no encontrado.
 *       500:
 *         description: Error del servidor.
 */
router.delete('/:id', authMiddleware, restaurantController.deleteRestaurant);

module.exports = router;

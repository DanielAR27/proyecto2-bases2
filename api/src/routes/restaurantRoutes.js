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
 * /restaurants/location:
 *   get:
 *     summary: Obtener todos los restaurantes con ubicación geográfica
 *     description: Endpoint para ETL y análisis OLAP. Solo accesible por administradores.
 *     tags: [Restaurantes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de restaurantes con ubicación obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Restaurantes con ubicación obtenidos correctamente."
 *                 total:
 *                   type: integer
 *                   example: 15
 *                 restaurantes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_restaurante:
 *                         type: integer
 *                         example: 1
 *                       nombre:
 *                         type: string
 *                         example: "Restaurante El Buen Sabor"
 *                       direccion:
 *                         type: string
 *                         example: "Avenida Central, San José"
 *                       id_admin:
 *                         type: integer
 *                         example: 2
 *                       latitud:
 *                         type: number
 *                         format: float
 *                         example: 9.9281
 *                       longitud:
 *                         type: number
 *                         format: float
 *                         example: -84.0907
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No tiene permisos para acceder a esta información."
 *       500:
 *         description: Error interno del servidor
 */
router.get('/location', authMiddleware, restaurantController.getAllRestaurantsWithLocation);

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

/**
 * @swagger
 * /restaurants/{id}/location:
 *   put:
 *     summary: Actualizar ubicación geográfica de un restaurante
 *     tags: [Restaurantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del restaurante cuya ubicación se va a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitud
 *               - longitud
 *             properties:
 *               latitud:
 *                 type: number
 *                 format: float
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitud en grados decimales
 *               longitud:
 *                 type: number
 *                 format: float
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitud en grados decimales
 *             example:
 *               latitud: 9.9281
 *               longitud: -84.0907
 *     responses:
 *       200:
 *         description: Ubicación del restaurante actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ubicación del restaurante actualizada correctamente."
 *                 restaurante:
 *                   type: object
 *                   properties:
 *                     id_restaurante:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     direccion:
 *                       type: string
 *                     id_admin:
 *                       type: integer
 *                     latitud:
 *                       type: number
 *                     longitud:
 *                       type: number
 *       400:
 *         description: Error de validación (latitud y longitud son obligatorios)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Latitud y longitud son obligatorios."
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No autorizado para actualizar esta ubicación."
 *       404:
 *         description: Restaurante no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Restaurante no encontrado."
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id/location', authMiddleware, restaurantController.updateRestaurantLocation);

module.exports = router;

// src/routes/restaurantRoutes.js

const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Restaurantes
 *   description: Endpoints para gestión de restaurantes y sus ubicaciones
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Restaurant:
 *       type: object
 *       properties:
 *         id_restaurante:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: "Restaurante El Buen Sabor"
 *         direccion:
 *           type: string
 *           example: "Avenida Central, San José"
 *         id_admin:
 *           type: integer
 *           example: 2
 *         latitud:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: null
 *         longitud:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: null
 *     RestaurantWithLocation:
 *       type: object
 *       properties:
 *         id_restaurante:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: "Restaurante El Buen Sabor"
 *         direccion:
 *           type: string
 *           example: "Avenida Central, San José"
 *         id_admin:
 *           type: integer
 *           example: 2
 *         latitud:
 *           type: number
 *           format: float
 *           example: 9.9281
 *         longitud:
 *           type: number
 *           format: float
 *           example: -84.0907
 *     RestaurantCreate:
 *       type: object
 *       required:
 *         - nombre
 *         - direccion
 *       properties:
 *         nombre:
 *           type: string
 *           maxLength: 100
 *           example: "Restaurante El Buen Sabor"
 *         direccion:
 *           type: string
 *           maxLength: 200
 *           example: "Avenida Central, San José"
 *     RestaurantUpdate:
 *       type: object
 *       required:
 *         - nombre
 *         - direccion
 *       properties:
 *         nombre:
 *           type: string
 *           maxLength: 100
 *           example: "Restaurante El Exquisito Sabor"
 *         direccion:
 *           type: string
 *           maxLength: 200
 *           example: "Boulevard Los Yoses, San Pedro"
 *     LocationUpdate:
 *       type: object
 *       required:
 *         - latitud
 *         - longitud
 *       properties:
 *         latitud:
 *           type: number
 *           format: float
 *           minimum: -90
 *           maximum: 90
 *           description: Latitud en grados decimales
 *           example: 9.9281
 *         longitud:
 *           type: number
 *           format: float
 *           minimum: -180
 *           maximum: 180
 *           description: Longitud en grados decimales
 *           example: -84.0907
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /restaurants:
 *   post:
 *     summary: Crear un nuevo restaurante
 *     description: Crea un nuevo restaurante en el sistema. Solo administradores pueden realizar esta acción. También invalida el caché de restaurantes.
 *     tags: [Restaurantes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestaurantCreate'
 *           example:
 *             nombre: "Restaurante El Buen Sabor"
 *             direccion: "Avenida Central, San José"
 *     responses:
 *       201:
 *         description: Restaurante creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Restaurante creado correctamente."
 *                 restaurante:
 *                   type: object
 *                   properties:
 *                     id_restaurante:
 *                       type: integer
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       example: "Restaurante El Buen Sabor"
 *                     direccion:
 *                       type: string
 *                       example: "Avenida Central, San José"
 *                     id_admin:
 *                       type: integer
 *                       example: 2
 *             example:
 *               message: "Restaurante creado correctamente."
 *               restaurante:
 *                 id_restaurante: 1
 *                 nombre: "Restaurante El Buen Sabor"
 *                 direccion: "Avenida Central, San José"
 *                 id_admin: 2
 *       400:
 *         description: Error de validación - campos requeridos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Nombre y dirección son obligatorios."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden crear restaurantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo los administradores pueden crear restaurantes."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.post('/', authMiddleware, restaurantController.createRestaurant);

/**
 * @swagger
 * /restaurants:
 *   get:
 *     summary: Obtener todos los restaurantes
 *     description: Retorna una lista de todos los restaurantes disponibles ordenados por ID. Los datos pueden venir de caché Redis.
 *     tags: [Restaurantes]
 *     responses:
 *       200:
 *         description: Lista de restaurantes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Restaurant'
 *             example:
 *               - id_restaurante: 1
 *                 nombre: "Restaurante El Buen Sabor"
 *                 direccion: "Avenida Central, San José"
 *                 id_admin: 2
 *                 latitud: null
 *                 longitud: null
 *               - id_restaurante: 2
 *                 nombre: "Pizzería Italiana"
 *                 direccion: "Calle 5, Cartago"
 *                 id_admin: 3
 *                 latitud: 9.9341
 *                 longitud: -84.0877
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.get('/', restaurantController.getAllRestaurants);

/**
 * @swagger
 * /restaurants/location:
 *   get:
 *     summary: Obtener todos los restaurantes con ubicación geográfica
 *     description: Endpoint para ETL y análisis OLAP. Solo accesible por administradores. Retorna restaurantes que tienen latitud y longitud definidas. Los datos pueden venir de caché Redis.
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
 *                     $ref: '#/components/schemas/RestaurantWithLocation'
 *             example:
 *               message: "Restaurantes con ubicación obtenidos correctamente."
 *               total: 2
 *               restaurantes:
 *                 - id_restaurante: 1
 *                   nombre: "Restaurante El Buen Sabor"
 *                   direccion: "Avenida Central, San José"
 *                   id_admin: 2
 *                   latitud: 9.9281
 *                   longitud: -84.0907
 *                 - id_restaurante: 3
 *                   nombre: "Marisquería del Puerto"
 *                   direccion: "Puerto de Puntarenas"
 *                   id_admin: 4
 *                   latitud: 9.9756
 *                   longitud: -84.8339
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "No tiene permisos para acceder a esta información."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.get('/location', authMiddleware, restaurantController.getAllRestaurantsWithLocation);

/**
 * @swagger
 * /restaurants/{id}:
 *   get:
 *     summary: Obtener un restaurante por ID
 *     description: Retorna la información detallada de un restaurante específico con su ubicación si está disponible. Los datos pueden venir de caché Redis.
 *     tags: [Restaurantes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del restaurante
 *         example: 1
 *     responses:
 *       200:
 *         description: Restaurante encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *             example:
 *               id_restaurante: 1
 *               nombre: "Restaurante El Buen Sabor"
 *               direccion: "Avenida Central, San José"
 *               id_admin: 2
 *               latitud: 9.9281
 *               longitud: -84.0907
 *       404:
 *         description: Restaurante no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Restaurante no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.get('/:id', restaurantController.getRestaurantById);

/**
 * @swagger
 * /restaurants/{id}:
 *   put:
 *     summary: Actualizar un restaurante existente
 *     description: Actualiza la información básica de un restaurante existente. Solo administradores pueden realizar esta acción. También invalida los cachés relacionados.
 *     tags: [Restaurantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del restaurante a actualizar
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestaurantUpdate'
 *           example:
 *             nombre: "Restaurante El Exquisito Sabor"
 *             direccion: "Boulevard Los Yoses, San Pedro"
 *     responses:
 *       200:
 *         description: Restaurante actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Restaurante actualizado correctamente."
 *                 restaurante:
 *                   type: object
 *                   properties:
 *                     id_restaurante:
 *                       type: integer
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       example: "Restaurante El Exquisito Sabor"
 *                     direccion:
 *                       type: string
 *                       example: "Boulevard Los Yoses, San Pedro"
 *                     id_admin:
 *                       type: integer
 *                       example: 2
 *             example:
 *               message: "Restaurante actualizado correctamente."
 *               restaurante:
 *                 id_restaurante: 1
 *                 nombre: "Restaurante El Exquisito Sabor"
 *                 direccion: "Boulevard Los Yoses, San Pedro"
 *                 id_admin: 2
 *       400:
 *         description: Error de validación - campos requeridos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Nombre y dirección son obligatorios."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden actualizar restaurantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo los administradores pueden actualizar restaurantes."
 *       404:
 *         description: Restaurante no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Restaurante no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.put('/:id', authMiddleware, restaurantController.updateRestaurant);

/**
 * @swagger
 * /restaurants/{id}:
 *   delete:
 *     summary: Eliminar un restaurante
 *     description: Elimina un restaurante del sistema permanentemente. Solo administradores pueden realizar esta acción. También elimina menús, productos, reservas y pedidos asociados e invalida múltiples cachés.
 *     tags: [Restaurantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del restaurante a eliminar
 *         example: 1
 *     responses:
 *       200:
 *         description: Restaurante eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Restaurante eliminado correctamente."
 *             example:
 *               message: "Restaurante eliminado correctamente."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden eliminar restaurantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo los administradores pueden eliminar restaurantes."
 *       404:
 *         description: Restaurante no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Restaurante no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.delete('/:id', authMiddleware, restaurantController.deleteRestaurant);

/**
 * @swagger
 * /restaurants/{id}/location:
 *   put:
 *     summary: Actualizar ubicación geográfica de un restaurante
 *     description: Actualiza las coordenadas geográficas de un restaurante específico. Solo administradores pueden realizar esta acción. Valida rangos geográficos e invalida múltiples cachés relacionados.
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
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LocationUpdate'
 *           example:
 *             latitud: 9.9281
 *             longitud: -84.0907
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
 *                   $ref: '#/components/schemas/RestaurantWithLocation'
 *             example:
 *               message: "Ubicación del restaurante actualizada correctamente."
 *               restaurante:
 *                 id_restaurante: 1
 *                 nombre: "Restaurante El Buen Sabor"
 *                 direccion: "Avenida Central, San José"
 *                 id_admin: 2
 *                 latitud: 9.9281
 *                 longitud: -84.0907
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               campos_faltantes:
 *                 summary: Latitud y longitud son obligatorios
 *                 value:
 *                   error: "Latitud y longitud son obligatorios."
 *               numeros_invalidos:
 *                 summary: Valores no numéricos
 *                 value:
 *                   error: "Latitud y longitud deben ser números válidos."
 *               latitud_fuera_rango:
 *                 summary: Latitud fuera del rango válido
 *                 value:
 *                   error: "Latitud debe estar entre -90 y 90 grados."
 *               longitud_fuera_rango:
 *                 summary: Longitud fuera del rango válido
 *                 value:
 *                   error: "Longitud debe estar entre -180 y 180 grados."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token requerido."
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "No autorizado para actualizar esta ubicación."
 *       404:
 *         description: Restaurante no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Restaurante no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.put('/:id/location', authMiddleware, restaurantController.updateRestaurantLocation);

module.exports = router;
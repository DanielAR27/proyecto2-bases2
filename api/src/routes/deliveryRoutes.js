// src/routes/deliveryRoutes.js

const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Delivery
 *   description: Endpoints para gestión de entregas, repartidores y geolocalización
 */

/**
 * @swagger
 * /delivery/users/{id}/location:
 *   put:
 *     summary: Actualizar ubicación de un usuario
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
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
 *                 format: double
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitud de la ubicación
 *                 example: 9.9347
 *               longitud:
 *                 type: number
 *                 format: double
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitud de la ubicación
 *                 example: -84.0789
 *               direccion_completa:
 *                 type: string
 *                 maxLength: 500
 *                 description: Dirección completa (opcional)
 *                 example: "Avenida Central, San José, Costa Rica"
 *     responses:
 *       200:
 *         description: Ubicación actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ubicación actualizada correctamente."
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     id_usuario:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     email:
 *                       type: string
 *                     latitud:
 *                       type: number
 *                     longitud:
 *                       type: number
 *                     direccion_completa:
 *                       type: string
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: Token requerido
 *       403:
 *         description: No autorizado para actualizar esta ubicación
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/users/:id/location', authMiddleware, deliveryController.updateUserLocation);

/**
 * @swagger
 * /delivery/restaurants/{id}/location:
 *   put:
 *     summary: Actualizar ubicación de un restaurante
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del restaurante
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
 *                 format: double
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitud de la ubicación
 *                 example: 9.9315
 *               longitud:
 *                 type: number
 *                 format: double
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitud de la ubicación
 *                 example: -84.0743
 *     responses:
 *       200:
 *         description: Ubicación del restaurante actualizada correctamente
 *       400:
 *         description: Datos de entrada inválidos
 *       403:
 *         description: Solo administradores pueden actualizar ubicaciones de restaurantes
 *       404:
 *         description: Restaurante no encontrado
 */
router.put('/restaurants/:id/location', authMiddleware, deliveryController.updateRestaurantLocation);

/**
 * @swagger
 * /delivery/drivers:
 *   get:
 *     summary: Obtener todos los repartidores
 *     tags: [Delivery]
 *     responses:
 *       200:
 *         description: Lista de repartidores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_repartidor:
 *                     type: integer
 *                   nombre:
 *                     type: string
 *                   telefono:
 *                     type: string
 *                   vehiculo:
 *                     type: string
 *                   latitud_actual:
 *                     type: number
 *                   longitud_actual:
 *                     type: number
 *                   estado:
 *                     type: string
 *                     enum: [disponible, ocupado, desconectado]
 *                   fecha_registro:
 *                     type: string
 *                     format: date-time
 */
router.get('/drivers', deliveryController.getAllDrivers);

/**
 * @swagger
 * /delivery/drivers:
 *   post:
 *     summary: Crear un nuevo repartidor
 *     tags: [Delivery]
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
 *             properties:
 *               nombre:
 *                 type: string
 *                 maxLength: 100
 *                 description: Nombre completo del repartidor
 *                 example: "Carlos Rodríguez"
 *               telefono:
 *                 type: string
 *                 maxLength: 20
 *                 description: Número de teléfono
 *                 example: "+506 8888-8888"
 *               vehiculo:
 *                 type: string
 *                 maxLength: 50
 *                 description: Tipo de vehículo
 *                 example: "Motocicleta Honda"
 *               latitud_actual:
 *                 type: number
 *                 format: double
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitud actual del repartidor
 *                 example: 9.9330
 *               longitud_actual:
 *                 type: number
 *                 format: double
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitud actual del repartidor
 *                 example: -84.0765
 *     responses:
 *       201:
 *         description: Repartidor creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Repartidor creado correctamente."
 *                 repartidor:
 *                   type: object
 *                   properties:
 *                     id_repartidor:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     telefono:
 *                       type: string
 *                     vehiculo:
 *                       type: string
 *                     estado:
 *                       type: string
 *                       enum: [disponible]
 *       400:
 *         description: Datos de entrada inválidos
 *       403:
 *         description: Solo administradores pueden crear repartidores
 */
router.post('/drivers', authMiddleware, deliveryController.createDriver);

/**
 * @swagger
 * /delivery/drivers/{id}:
 *   get:
 *     summary: Obtener un repartidor por ID
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del repartidor
 *     responses:
 *       200:
 *         description: Datos del repartidor
 *       404:
 *         description: Repartidor no encontrado
 */
router.get('/drivers/:id', deliveryController.getDriverById);

/**
 * @swagger
 * /delivery/drivers/{id}/location:
 *   put:
 *     summary: Actualizar ubicación de un repartidor
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del repartidor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitud_actual
 *               - longitud_actual
 *             properties:
 *               latitud_actual:
 *                 type: number
 *                 format: double
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Nueva latitud del repartidor
 *                 example: 9.9350
 *               longitud_actual:
 *                 type: number
 *                 format: double
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Nueva longitud del repartidor
 *                 example: -84.0770
 *     responses:
 *       200:
 *         description: Ubicación del repartidor actualizada correctamente
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: Token requerido
 *       404:
 *         description: Repartidor no encontrado
 */
router.put('/drivers/:id/location', authMiddleware, deliveryController.updateDriverLocation);

/**
 * @swagger
 * /delivery/assign/{orderId}:
 *   put:
 *     summary: Asignar pedido a repartidor
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pedido a asignar
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               repartidorId:
 *                 type: integer
 *                 description: ID del repartidor específico (opcional). Si no se proporciona, se asigna automáticamente el más cercano.
 *                 example: 1
 *     responses:
 *       200:
 *         description: Pedido asignado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Pedido asignado correctamente."
 *                 pedido:
 *                   type: object
 *                   properties:
 *                     id_pedido:
 *                       type: integer
 *                     id_repartidor:
 *                       type: integer
 *                     estado:
 *                       type: string
 *                 repartidor:
 *                   type: object
 *                   properties:
 *                     id_repartidor:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     estado:
 *                       type: string
 *       400:
 *         description: Pedido inválido o repartidor no disponible
 *       403:
 *         description: Solo administradores pueden asignar entregas
 *       404:
 *         description: Pedido o repartidor no encontrado, o no hay repartidores disponibles
 */
router.put('/assign/:orderId', authMiddleware, deliveryController.assignDelivery);

module.exports = router;
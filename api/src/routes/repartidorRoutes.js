// src/routes/repartidorRoutes.js

const express = require('express');
const router = express.Router();
const repartidorController = require('../controllers/repartidorController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Repartidores
 *   description: Operaciones relacionadas con repartidores
 */

/**
 * @swagger
 * /drivers:
 *   post:
 *     summary: Crear un nuevo repartidor
 *     tags: [Repartidores]
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
 *               - telefono
 *               - vehiculo
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre completo del repartidor
 *                 example: "Juan Carlos Pérez"
 *               telefono:
 *                 type: string
 *                 description: Número de teléfono del repartidor
 *                 example: "+506 8888-9999"
 *               vehiculo:
 *                 type: string
 *                 description: Tipo de vehículo que utiliza
 *                 example: "Motocicleta Honda 150cc"
 *     responses:
 *       201:
 *         description: Repartidor creado correctamente.
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
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       example: "Juan Carlos Pérez"
 *                     telefono:
 *                       type: string
 *                       example: "+506 8888-9999"
 *                     vehiculo:
 *                       type: string
 *                       example: "Motocicleta Honda 150cc"
 *                     latitud_actual:
 *                       type: number
 *                       nullable: true
 *                       example: null
 *                     longitud_actual:
 *                       type: number
 *                       nullable: true
 *                       example: null
 *                     estado:
 *                       type: string
 *                       example: "disponible"
 *                     fecha_registro:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Datos inválidos.
 *       403:
 *         description: No autorizado. Solo administradores pueden crear repartidores.
 *       500:
 *         description: Error del servidor.
 */
router.post('/', authMiddleware, repartidorController.createRepartidor);

/**
 * @swagger
 * /drivers:
 *   get:
 *     summary: Obtener todos los repartidores
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de todos los repartidores.
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
 *                     nullable: true
 *                   longitud_actual:
 *                     type: number
 *                     nullable: true
 *                   estado:
 *                     type: string
 *                     enum: [disponible, ocupado, desconectado]
 *                   fecha_registro:
 *                     type: string
 *                     format: date-time
 *       403:
 *         description: No autorizado. Solo administradores pueden ver todos los repartidores.
 *       500:
 *         description: Error del servidor.
 */
router.get('/', authMiddleware, repartidorController.getAllRepartidores);

/**
 * @swagger
 * /drivers/available:
 *   get:
 *     summary: Obtener repartidores disponibles
 *     description: Endpoint para obtener repartidores con estado "disponible". Útil para asignación de pedidos.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de repartidores disponibles obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Repartidores disponibles obtenidos correctamente."
 *                 total:
 *                   type: integer
 *                   example: 8
 *                 repartidores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_repartidor:
 *                         type: integer
 *                         example: 1
 *                       nombre:
 *                         type: string
 *                         example: "Juan Carlos Pérez"
 *                       telefono:
 *                         type: string
 *                         example: "+506 8888-9999"
 *                       vehiculo:
 *                         type: string
 *                         example: "Motocicleta Honda 150cc"
 *                       latitud_actual:
 *                         type: number
 *                         nullable: true
 *                         example: 9.9342
 *                       longitud_actual:
 *                         type: number
 *                         nullable: true
 *                         example: -84.0875
 *                       estado:
 *                         type: string
 *                         example: "disponible"
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *       500:
 *         description: Error interno del servidor
 */
router.get('/available', authMiddleware, repartidorController.getAvailableRepartidores);

/**
 * @swagger
 * /drivers/available/location:
 *   get:
 *     summary: Obtener repartidores disponibles con ubicación
 *     description: Endpoint para Neo4J y sistemas de ruteo. Solo repartidores disponibles que tienen ubicación registrada.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de repartidores disponibles con ubicación obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Repartidores disponibles con ubicación obtenidos correctamente."
 *                 total:
 *                   type: integer
 *                   example: 5
 *                 repartidores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_repartidor:
 *                         type: integer
 *                         example: 1
 *                       nombre:
 *                         type: string
 *                         example: "Juan Carlos Pérez"
 *                       telefono:
 *                         type: string
 *                         example: "+506 8888-9999"
 *                       vehiculo:
 *                         type: string
 *                         example: "Motocicleta Honda 150cc"
 *                       latitud_actual:
 *                         type: number
 *                         example: 9.9342
 *                       longitud_actual:
 *                         type: number
 *                         example: -84.0875
 *                       estado:
 *                         type: string
 *                         example: "disponible"
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *       500:
 *         description: Error interno del servidor
 */
router.get('/available/location', authMiddleware, repartidorController.getAvailableWithLocation);

/**
 * @swagger
 * /drivers/{id}/users:
 *   get:
 *     summary: Obtener usuarios asignados a un repartidor
 *     description: Endpoint para obtener la lista de usuarios con pedidos asignados a un repartidor específico
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del repartidor
 *     responses:
 *       200:
 *         description: Lista de usuarios asignados obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuarios asignados obtenidos correctamente."
 *                 total:
 *                   type: integer
 *                   example: 3
 *                 usuarios:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_usuario:
 *                         type: integer
 *                         example: 123
 *                       latitud:
 *                         type: number
 *                         example: 9.9320
 *                       longitud:
 *                         type: number
 *                         example: -84.0850
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id/users', authMiddleware, repartidorController.getUsersAssignedToDriver);

/**
 * @swagger
 * /drivers/{id}:
 *   get:
 *     summary: Obtener un repartidor por ID
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del repartidor
 *     responses:
 *       200:
 *         description: Repartidor encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_repartidor:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                 telefono:
 *                   type: string
 *                 vehiculo:
 *                   type: string
 *                 latitud_actual:
 *                   type: number
 *                   nullable: true
 *                 longitud_actual:
 *                   type: number
 *                   nullable: true
 *                 estado:
 *                   type: string
 *                 fecha_registro:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: No autorizado. Solo administradores pueden ver detalles de repartidores.
 *       404:
 *         description: Repartidor no encontrado.
 *       500:
 *         description: Error del servidor.
 */
router.get('/:id', authMiddleware, repartidorController.getRepartidorById);

/**
 * @swagger
 * /drivers/{id}:
 *   put:
 *     summary: Actualizar información básica de un repartidor
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del repartidor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - telefono
 *               - vehiculo
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre completo del repartidor
 *                 example: "Juan Carlos Pérez González"
 *               telefono:
 *                 type: string
 *                 description: Número de teléfono del repartidor
 *                 example: "+506 8888-0000"
 *               vehiculo:
 *                 type: string
 *                 description: Tipo de vehículo que utiliza
 *                 example: "Motocicleta Yamaha 200cc"
 *     responses:
 *       200:
 *         description: Repartidor actualizado correctamente.
 *       400:
 *         description: Datos inválidos.
 *       403:
 *         description: No autorizado. Solo administradores pueden actualizar repartidores.
 *       404:
 *         description: Repartidor no encontrado.
 *       500:
 *         description: Error del servidor.
 */
router.put('/:id', authMiddleware, repartidorController.updateRepartidor);

/**
 * @swagger
 * /drivers/{id}:
 *   delete:
 *     summary: Eliminar un repartidor
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del repartidor
 *     responses:
 *       200:
 *         description: Repartidor eliminado correctamente.
 *       403:
 *         description: No autorizado. Solo administradores pueden eliminar repartidores.
 *       404:
 *         description: Repartidor no encontrado.
 *       500:
 *         description: Error del servidor.
 */
router.delete('/:id', authMiddleware, repartidorController.deleteRepartidor);

/**
 * @swagger
 * /drivers/{id}/location:
 *   put:
 *     summary: Actualizar ubicación geográfica de un repartidor
 *     description: Endpoint para tracking en tiempo real de repartidores
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del repartidor cuya ubicación se va a actualizar
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
 *                 format: float
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitud actual en grados decimales
 *                 example: 9.9342
 *               longitud_actual:
 *                 type: number
 *                 format: float
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitud actual en grados decimales
 *                 example: -84.0875
 *     responses:
 *       200:
 *         description: Ubicación del repartidor actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ubicación del repartidor actualizada correctamente."
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
 *                     latitud_actual:
 *                       type: number
 *                     longitud_actual:
 *                       type: number
 *                     estado:
 *                       type: string
 *       400:
 *         description: Error de validación (latitud y longitud son obligatorios)
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *       404:
 *         description: Repartidor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id/location', authMiddleware, repartidorController.updateRepartidorLocation);

/**
 * @swagger
 * /drivers/{id}/status:
 *   put:
 *     summary: Actualizar estado de un repartidor
 *     description: Cambiar estado entre disponible, ocupado y desconectado
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del repartidor cuyo estado se va a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [disponible, ocupado, desconectado]
 *                 description: Nuevo estado del repartidor
 *                 example: "ocupado"
 *     responses:
 *       200:
 *         description: Estado del repartidor actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Estado del repartidor actualizado correctamente."
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
 *                     latitud_actual:
 *                       type: number
 *                       nullable: true
 *                     longitud_actual:
 *                       type: number
 *                       nullable: true
 *                     estado:
 *                       type: string
 *                       example: "ocupado"
 *       400:
 *         description: Estado inválido - debe ser disponible, ocupado o desconectado
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *       404:
 *         description: Repartidor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id/status', authMiddleware, repartidorController.updateRepartidorStatus);

module.exports = router;
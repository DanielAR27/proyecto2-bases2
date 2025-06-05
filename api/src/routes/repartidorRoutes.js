// src/routes/repartidorRoutes.js

const express = require('express');
const router = express.Router();
const repartidorController = require('../controllers/repartidorController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Repartidores
 *   description: Endpoints para gestión de repartidores y tracking de entregas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Driver:
 *       type: object
 *       properties:
 *         id_repartidor:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: "Juan Carlos Pérez"
 *         telefono:
 *           type: string
 *           example: "+506 8888-9999"
 *         vehiculo:
 *           type: string
 *           example: "Motocicleta Honda 150cc"
 *         latitud_actual:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: null
 *         longitud_actual:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: null
 *         estado:
 *           type: string
 *           enum: [disponible, ocupado, desconectado]
 *           example: "disponible"
 *         fecha_registro:
 *           type: string
 *           format: date-time
 *           example: "2025-06-04T10:30:00Z"
 *     DriverWithLocation:
 *       type: object
 *       properties:
 *         id_repartidor:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: "Juan Carlos Pérez"
 *         telefono:
 *           type: string
 *           example: "+506 8888-9999"
 *         vehiculo:
 *           type: string
 *           example: "Motocicleta Honda 150cc"
 *         latitud_actual:
 *           type: number
 *           format: float
 *           example: 9.9342
 *         longitud_actual:
 *           type: number
 *           format: float
 *           example: -84.0875
 *         estado:
 *           type: string
 *           example: "disponible"
 *     DriverCreate:
 *       type: object
 *       required:
 *         - nombre
 *         - telefono
 *         - vehiculo
 *       properties:
 *         nombre:
 *           type: string
 *           maxLength: 100
 *           description: Nombre completo del repartidor
 *           example: "Juan Carlos Pérez"
 *         telefono:
 *           type: string
 *           maxLength: 20
 *           description: Número de teléfono del repartidor
 *           example: "+506 8888-9999"
 *         vehiculo:
 *           type: string
 *           maxLength: 50
 *           description: Tipo de vehículo que utiliza
 *           example: "Motocicleta Honda 150cc"
 *     DriverUpdate:
 *       type: object
 *       required:
 *         - nombre
 *         - telefono
 *         - vehiculo
 *       properties:
 *         nombre:
 *           type: string
 *           maxLength: 100
 *           description: Nombre completo del repartidor
 *           example: "Juan Carlos Pérez González"
 *         telefono:
 *           type: string
 *           maxLength: 20
 *           description: Número de teléfono del repartidor
 *           example: "+506 8888-0000"
 *         vehiculo:
 *           type: string
 *           maxLength: 50
 *           description: Tipo de vehículo que utiliza
 *           example: "Motocicleta Yamaha 200cc"
 *     LocationUpdate:
 *       type: object
 *       required:
 *         - latitud_actual
 *         - longitud_actual
 *       properties:
 *         latitud_actual:
 *           type: number
 *           format: float
 *           minimum: -90
 *           maximum: 90
 *           description: Latitud actual en grados decimales
 *           example: 9.9342
 *         longitud_actual:
 *           type: number
 *           format: float
 *           minimum: -180
 *           maximum: 180
 *           description: Longitud actual en grados decimales
 *           example: -84.0875
 *     StatusUpdate:
 *       type: object
 *       required:
 *         - estado
 *       properties:
 *         estado:
 *           type: string
 *           enum: [disponible, ocupado, desconectado]
 *           description: Nuevo estado del repartidor
 *           example: "ocupado"
 *     AssignedUser:
 *       type: object
 *       properties:
 *         id_usuario:
 *           type: integer
 *           example: 123
 *         nombre:
 *           type: string
 *           example: "Juan Pérez"
 *         email:
 *           type: string
 *           example: "juan.perez@example.com"
 *         rol:
 *           type: string
 *           example: "cliente"
 *         latitud:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: 9.9320
 *         longitud:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: -84.0850
 *         direccion_completa:
 *           type: string
 *           nullable: true
 *           example: "Cartago, Costa Rica"
 *         id_referido:
 *           type: integer
 *           nullable: true
 *           example: null
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /drivers:
 *   post:
 *     summary: Crear un nuevo repartidor
 *     description: Crea un nuevo repartidor en el sistema con estado inicial "disponible". Solo administradores pueden realizar esta acción. También invalida los cachés relacionados.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DriverCreate'
 *           example:
 *             nombre: "Juan Carlos Pérez"
 *             telefono: "+506 8888-9999"
 *             vehiculo: "Motocicleta Honda 150cc"
 *     responses:
 *       201:
 *         description: Repartidor creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Repartidor creado correctamente."
 *                 repartidor:
 *                   $ref: '#/components/schemas/Driver'
 *             example:
 *               message: "Repartidor creado correctamente."
 *               repartidor:
 *                 id_repartidor: 1
 *                 nombre: "Juan Carlos Pérez"
 *                 telefono: "+506 8888-9999"
 *                 vehiculo: "Motocicleta Honda 150cc"
 *                 latitud_actual: null
 *                 longitud_actual: null
 *                 estado: "disponible"
 *                 fecha_registro: "2025-06-04T10:30:00Z"
 *       400:
 *         description: Error de validación - campos requeridos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Nombre, teléfono y vehículo son obligatorios."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden crear repartidores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo los administradores pueden crear repartidores."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.post('/', authMiddleware, repartidorController.createRepartidor);

/**
 * @swagger
 * /drivers:
 *   get:
 *     summary: Obtener todos los repartidores
 *     description: Retorna una lista de todos los repartidores ordenados por fecha de registro (más recientes primero). Solo administradores pueden acceder. Los datos pueden venir de caché Redis.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de repartidores obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Driver'
 *             example:
 *               - id_repartidor: 2
 *                 nombre: "María González"
 *                 telefono: "+506 7777-8888"
 *                 vehiculo: "Bicicleta eléctrica"
 *                 latitud_actual: 9.9341
 *                 longitud_actual: -84.0877
 *                 estado: "ocupado"
 *                 fecha_registro: "2025-06-04T14:20:00Z"
 *               - id_repartidor: 1
 *                 nombre: "Juan Carlos Pérez"
 *                 telefono: "+506 8888-9999"
 *                 vehiculo: "Motocicleta Honda 150cc"
 *                 latitud_actual: null
 *                 longitud_actual: null
 *                 estado: "disponible"
 *                 fecha_registro: "2025-06-04T10:30:00Z"
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden ver todos los repartidores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo los administradores pueden ver todos los repartidores."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.get('/', authMiddleware, repartidorController.getAllRepartidores);

/**
 * @swagger
 * /drivers/available:
 *   get:
 *     summary: Obtener repartidores disponibles
 *     description: Endpoint para obtener repartidores con estado "disponible", útil para asignación de pedidos. Solo administradores pueden acceder. Los datos pueden venir de caché Redis.
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
 *                   example: 3
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
 *                         format: float
 *                         nullable: true
 *                         example: 9.9342
 *                       longitud_actual:
 *                         type: number
 *                         format: float
 *                         nullable: true
 *                         example: -84.0875
 *                       estado:
 *                         type: string
 *                         example: "disponible"
 *             example:
 *               message: "Repartidores disponibles obtenidos correctamente."
 *               total: 3
 *               repartidores:
 *                 - id_repartidor: 1
 *                   nombre: "Juan Carlos Pérez"
 *                   telefono: "+506 8888-9999"
 *                   vehiculo: "Motocicleta Honda 150cc"
 *                   latitud_actual: 9.9342
 *                   longitud_actual: -84.0875
 *                   estado: "disponible"
 *                 - id_repartidor: 3
 *                   nombre: "Carlos López"
 *                   telefono: "+506 6666-7777"
 *                   vehiculo: "Automóvil sedán"
 *                   latitud_actual: null
 *                   longitud_actual: null
 *                   estado: "disponible"
 *                 - id_repartidor: 5
 *                   nombre: "Ana Rodríguez"
 *                   telefono: "+506 5555-4444"
 *                   vehiculo: "Scooter eléctrico"
 *                   latitud_actual: 9.9280
 *                   longitud_actual: -84.0910
 *                   estado: "disponible"
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
router.get('/available', authMiddleware, repartidorController.getAvailableRepartidores);

/**
 * @swagger
 * /drivers/available/location:
 *   get:
 *     summary: Obtener repartidores disponibles con ubicación
 *     description: Endpoint para Neo4J y sistemas de ruteo. Solo repartidores disponibles que tienen ubicación GPS registrada. Solo administradores pueden acceder. Los datos pueden venir de caché Redis.
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
 *                   example: 2
 *                 repartidores:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DriverWithLocation'
 *             example:
 *               message: "Repartidores disponibles con ubicación obtenidos correctamente."
 *               total: 2
 *               repartidores:
 *                 - id_repartidor: 1
 *                   nombre: "Juan Carlos Pérez"
 *                   telefono: "+506 8888-9999"
 *                   vehiculo: "Motocicleta Honda 150cc"
 *                   latitud_actual: 9.9342
 *                   longitud_actual: -84.0875
 *                   estado: "disponible"
 *                 - id_repartidor: 5
 *                   nombre: "Ana Rodríguez"
 *                   telefono: "+506 5555-4444"
 *                   vehiculo: "Scooter eléctrico"
 *                   latitud_actual: 9.9280
 *                   longitud_actual: -84.0910
 *                   estado: "disponible"
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
router.get('/available/location', authMiddleware, repartidorController.getAvailableWithLocation);

/**
 * @swagger
 * /drivers/{id}/users:
 *   get:
 *     summary: Obtener usuarios asignados a un repartidor
 *     description: Endpoint para obtener información completa de usuarios con pedidos no entregados asignados a un repartidor específico. Útil para ruteo y tracking. Solo administradores pueden acceder. Los datos pueden venir de caché Redis.
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
 *         example: 1
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
 *                   example: "Usuarios asignados al repartidor obtenidos correctamente."
 *                 total:
 *                   type: integer
 *                   example: 3
 *                 usuarios:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssignedUser'
 *             example:
 *               message: "Usuarios asignados al repartidor obtenidos correctamente."
 *               total: 3
 *               usuarios:
 *                 - id_usuario: 123
 *                   nombre: "Juan Pérez"
 *                   email: "juan.perez@example.com"
 *                   rol: "cliente"
 *                   latitud: 9.9320
 *                   longitud: -84.0850
 *                   direccion_completa: "Cartago, Costa Rica"
 *                   id_referido: null
 *                 - id_usuario: 125
 *                   nombre: "María González"
 *                   email: "maria.gonzalez@example.com"
 *                   rol: "cliente"
 *                   latitud: 9.9341
 *                   longitud: -84.0877
 *                   direccion_completa: "San José, Costa Rica"
 *                   id_referido: 120
 *                 - id_usuario: 130
 *                   nombre: "Carlos López"
 *                   email: "carlos.lopez@example.com"
 *                   rol: "cliente"
 *                   latitud: null
 *                   longitud: null
 *                   direccion_completa: null
 *                   id_referido: null
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
router.get('/:id/users', authMiddleware, repartidorController.getUsersAssignedToDriver);

/**
 * @swagger
 * /drivers/{id}:
 *   get:
 *     summary: Obtener un repartidor por ID
 *     description: Retorna la información detallada de un repartidor específico incluyendo su ubicación actual. Solo administradores pueden acceder. Los datos pueden venir de caché Redis.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del repartidor
 *         example: 1
 *     responses:
 *       200:
 *         description: Repartidor encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Driver'
 *             example:
 *               id_repartidor: 1
 *               nombre: "Juan Carlos Pérez"
 *               telefono: "+506 8888-9999"
 *               vehiculo: "Motocicleta Honda 150cc"
 *               latitud_actual: 9.9342
 *               longitud_actual: -84.0875
 *               estado: "disponible"
 *               fecha_registro: "2025-06-04T10:30:00Z"
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden ver detalles de repartidores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo los administradores pueden ver detalles de repartidores."
 *       404:
 *         description: Repartidor no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Repartidor no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.get('/:id', authMiddleware, repartidorController.getRepartidorById);

/**
 * @swagger
 * /drivers/{id}:
 *   put:
 *     summary: Actualizar información básica de un repartidor
 *     description: Actualiza nombre, teléfono y vehículo de un repartidor existente. Solo administradores pueden realizar esta acción. También invalida los cachés relacionados.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del repartidor a actualizar
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DriverUpdate'
 *           example:
 *             nombre: "Juan Carlos Pérez González"
 *             telefono: "+506 8888-0000"
 *             vehiculo: "Motocicleta Yamaha 200cc"
 *     responses:
 *       200:
 *         description: Repartidor actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Repartidor actualizado correctamente."
 *                 repartidor:
 *                   $ref: '#/components/schemas/Driver'
 *             example:
 *               message: "Repartidor actualizado correctamente."
 *               repartidor:
 *                 id_repartidor: 1
 *                 nombre: "Juan Carlos Pérez González"
 *                 telefono: "+506 8888-0000"
 *                 vehiculo: "Motocicleta Yamaha 200cc"
 *                 latitud_actual: 9.9342
 *                 longitud_actual: -84.0875
 *                 estado: "disponible"
 *                 fecha_registro: "2025-06-04T10:30:00Z"
 *       400:
 *         description: Error de validación - campos requeridos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Nombre, teléfono y vehículo son obligatorios."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden actualizar repartidores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo los administradores pueden actualizar repartidores."
 *       404:
 *         description: Repartidor no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Repartidor no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.put('/:id', authMiddleware, repartidorController.updateRepartidor);

/**
 * @swagger
 * /drivers/{id}:
 *   delete:
 *     summary: Eliminar un repartidor
 *     description: Elimina un repartidor del sistema permanentemente. Solo administradores pueden realizar esta acción. También invalida múltiples cachés relacionados incluidos los pedidos.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del repartidor a eliminar
 *         example: 1
 *     responses:
 *       200:
 *         description: Repartidor eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Repartidor eliminado correctamente."
 *             example:
 *               message: "Repartidor eliminado correctamente."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden eliminar repartidores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo los administradores pueden eliminar repartidores."
 *       404:
 *         description: Repartidor no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Repartidor no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error en el servidor."
 */
router.delete('/:id', authMiddleware, repartidorController.deleteRepartidor);

module.exports = router;
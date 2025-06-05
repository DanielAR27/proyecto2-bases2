// src/routes/reservationRoutes.js

const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Reservas
 *   description: Endpoints para gestión de reservas de restaurantes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Reservation:
 *       type: object
 *       properties:
 *         id_reserva:
 *           type: integer
 *           example: 1
 *         id_usuario:
 *           type: integer
 *           example: 5
 *         id_restaurante:
 *           type: integer
 *           example: 1
 *         fecha_hora:
 *           type: string
 *           format: date-time
 *           example: "2025-06-05T19:30:00Z"
 *         estado:
 *           type: string
 *           enum: [pendiente, confirmada, cancelada]
 *           example: "pendiente"
 *     ReservationCreate:
 *       type: object
 *       required:
 *         - id_usuario
 *         - id_restaurante
 *         - fecha_hora
 *         - estado
 *       properties:
 *         id_usuario:
 *           type: integer
 *           example: 5
 *         id_restaurante:
 *           type: integer
 *           example: 1
 *         fecha_hora:
 *           type: string
 *           format: date-time
 *           example: "2025-06-05T19:30:00Z"
 *         estado:
 *           type: string
 *           enum: [pendiente, confirmada, cancelada]
 *           example: "pendiente"
 *     ReservationUpdate:
 *       type: object
 *       properties:
 *         fecha_hora:
 *           type: string
 *           format: date-time
 *           example: "2025-06-05T20:00:00Z"
 *         estado:
 *           type: string
 *           enum: [pendiente, confirmada, cancelada]
 *           example: "confirmada"
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /reservations:
 *   get:
 *     summary: Obtener todas las reservas
 *     description: Retorna una lista de todas las reservas disponibles ordenadas por ID. Los datos pueden venir de caché Redis.
 *     tags: [Reservas]
 *     responses:
 *       200:
 *         description: Lista de reservas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reservation'
 *             example:
 *               - id_reserva: 1
 *                 id_usuario: 5
 *                 id_restaurante: 1
 *                 fecha_hora: "2025-06-05T19:30:00Z"
 *                 estado: "pendiente"
 *               - id_reserva: 2
 *                 id_usuario: 7
 *                 id_restaurante: 2
 *                 fecha_hora: "2025-06-06T20:00:00Z"
 *                 estado: "confirmada"
 *               - id_reserva: 3
 *                 id_usuario: 5
 *                 id_restaurante: 1
 *                 fecha_hora: "2025-06-07T18:45:00Z"
 *                 estado: "cancelada"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al obtener reservas."
 */
router.get('/', reservationController.getAllReservations);

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     summary: Obtener una reserva por ID
 *     description: Retorna la información detallada de una reserva específica. Los datos pueden venir de caché Redis.
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único de la reserva
 *         example: 1
 *     responses:
 *       200:
 *         description: Reserva encontrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *             example:
 *               id_reserva: 1
 *               id_usuario: 5
 *               id_restaurante: 1
 *               fecha_hora: "2025-06-05T19:30:00Z"
 *               estado: "pendiente"
 *       404:
 *         description: Reserva no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Reserva no encontrada."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al buscar la reserva."
 */
router.get('/:id', reservationController.getReservationById);

/**
 * @swagger
 * /reservations:
 *   post:
 *     summary: Crear una nueva reserva
 *     description: Crea una nueva reserva en el sistema. Los usuarios solo pueden crear reservas para sí mismos, excepto los administradores que pueden crear para cualquier usuario. También invalida el caché de reservas.
 *     tags: [Reservas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservationCreate'
 *           example:
 *             id_usuario: 5
 *             id_restaurante: 1
 *             fecha_hora: "2025-06-05T19:30:00Z"
 *             estado: "pendiente"
 *     responses:
 *       201:
 *         description: Reserva creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reserva creada."
 *                 reserva:
 *                   $ref: '#/components/schemas/Reservation'
 *             example:
 *               message: "Reserva creada."
 *               reserva:
 *                 id_reserva: 1
 *                 id_usuario: 5
 *                 id_restaurante: 1
 *                 fecha_hora: "2025-06-05T19:30:00Z"
 *                 estado: "pendiente"
 *       400:
 *         description: Error de validación - campos requeridos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Faltan datos requeridos."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token requerido."
 *       403:
 *         description: No autorizado para crear reservas para otros usuarios
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo puede crear reservas para usted mismo o si es administrador."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al crear la reserva."
 */
router.post('/', authMiddleware, reservationController.createReservation);

/**
 * @swagger
 * /reservations/{id}:
 *   put:
 *     summary: Actualizar una reserva existente
 *     description: Actualiza la fecha/hora y estado de una reserva existente. Solo administradores o el propietario de la reserva pueden actualizarla. También invalida los cachés relacionados.
 *     tags: [Reservas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único de la reserva a actualizar
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservationUpdate'
 *           example:
 *             fecha_hora: "2025-06-05T20:00:00Z"
 *             estado: "confirmada"
 *     responses:
 *       200:
 *         description: Reserva actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reserva actualizada."
 *                 reserva:
 *                   $ref: '#/components/schemas/Reservation'
 *             example:
 *               message: "Reserva actualizada."
 *               reserva:
 *                 id_reserva: 1
 *                 id_usuario: 5
 *                 id_restaurante: 1
 *                 fecha_hora: "2025-06-05T20:00:00Z"
 *                 estado: "confirmada"
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token requerido."
 *       403:
 *         description: No autorizado para actualizar esta reserva
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "No tienes permiso para actualizar esta reserva."
 *       404:
 *         description: Reserva no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Reserva no encontrada."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al actualizar la reserva."
 */
router.put('/:id', authMiddleware, reservationController.updateReservation);

/**
 * @swagger
 * /reservations/{id}:
 *   delete:
 *     summary: Eliminar una reserva
 *     description: Elimina una reserva del sistema permanentemente. Solo administradores o el propietario de la reserva pueden eliminarla. También invalida los cachés relacionados.
 *     tags: [Reservas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único de la reserva a eliminar
 *         example: 1
 *     responses:
 *       200:
 *         description: Reserva eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reserva eliminada correctamente."
 *             example:
 *               message: "Reserva eliminada correctamente."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token requerido."
 *       403:
 *         description: No autorizado para eliminar esta reserva
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "No tienes permiso para eliminar esta reserva."
 *       404:
 *         description: Reserva no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Reserva no encontrada."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al eliminar la reserva."
 */
router.delete('/:id', authMiddleware, reservationController.deleteReservation);

module.exports = router;
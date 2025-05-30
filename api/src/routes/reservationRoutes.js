// src/routes/reservationRoutes.js

const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Reservas
 *   description: Endpoints para gestión de reservas
 */

/**
 * @swagger
 * /reservations:
 *   get:
 *     summary: Obtener todas las reservas
 *     tags: [Reservas]
 *     responses:
 *       200:
 *         description: Lista de reservas
 */
router.get('/', reservationController.getAllReservations);

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     summary: Obtener una reserva por ID
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la reserva
 *     responses:
 *       200:
 *         description: Datos de la reserva
 *       404:
 *         description: Reserva no encontrada
 */
router.get('/:id', reservationController.getReservationById);

/**
 * @swagger
 * /reservations:
 *   post:
 *     summary: Crear una nueva reserva
 *     tags: [Reservas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_usuario
 *               - id_restaurante
 *               - fecha_hora
 *               - estado
 *             properties:
 *               id_usuario:
 *                 type: number
 *               id_restaurante:
 *                 type: number
 *               fecha_hora:
 *                 type: string
 *                 format: date-time
 *               estado:
 *                 type: string
 *                 enum: [pendiente, confirmada, cancelada]
 *     responses:
 *       201:
 *         description: Reserva creada
 *       400:
 *         description: Datos incompletos
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Acceso denegado
 */
router.post('/', authMiddleware, reservationController.createReservation);

/**
 * @swagger
 * /reservations/{id}:
 *   put:
 *     summary: Actualizar una reserva
 *     tags: [Reservas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la reserva
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha_hora:
 *                 type: string
 *                 format: date-time
 *               estado:
 *                 type: string
 *                 enum: [pendiente, confirmada, cancelada]
 *     responses:
 *       200:
 *         description: Reserva actualizada
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Sin permiso
 *       404:
 *         description: No encontrada
 */
router.put('/:id', authMiddleware, reservationController.updateReservation);

/**
 * @swagger
 * /reservations/{id}:
 *   delete:
 *     summary: Eliminar una reserva
 *     tags: [Reservas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la reserva
 *     responses:
 *       200:
 *         description: Reserva eliminada
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Sin permiso
 *       404:
 *         description: No encontrada
 */
router.delete('/:id', authMiddleware, reservationController.deleteReservation);

module.exports = router;

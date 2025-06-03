const express = require('express');
const router = express.Router();
const routingController = require('../controllers/routingController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Routing
 *   description: Optimización de rutas y asignación automática de repartidores
 */

/**
 * @swagger
 * /routing/assign:
 *   post:
 *     summary: Asignar repartidor automáticamente a un pedido
 *     description: Encuentra el repartidor más cercano al restaurante usando Neo4J y lo asigna al pedido
 *     tags: [Routing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_pedido
 *             properties:
 *               id_pedido:
 *                 type: integer
 *                 description: ID del pedido al que asignar repartidor
 *                 example: 123
 *     responses:
 *       200:
 *         description: Repartidor asignado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Repartidor asignado correctamente"
 *                 repartidor:
 *                   type: object
 *                   properties:
 *                     id_repartidor:
 *                       type: integer
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       example: "Juan Pérez"
 *                     coordenadas:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                           example: 9.9300
 *                         lng:
 *                           type: number
 *                           example: -84.0850
 *                     distancia:
 *                       type: number
 *                       description: Distancia en kilómetros
 *                       example: 1.2
 *       400:
 *         description: ID de pedido requerido o pedido no válido
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *       404:
 *         description: Pedido no encontrado o no hay repartidores disponibles
 *       500:
 *         description: Error interno del servidor
 */
router.post('/assign', authMiddleware, routingController.assignDriver);

module.exports = router;
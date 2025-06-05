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
 * /routing/optimize/{id}:
 *   get:
 *     summary: Optimizar ruta de entrega para un repartidor
 *     description: Encuentra la ruta óptima usando TSP para que el repartidor visite a todos sus usuarios asignados
 *     tags: [Routing]
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
 *         description: Ruta optimizada calculada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ruta optimizada calculada correctamente"
 *                 repartidor:
 *                   type: object
 *                   properties:
 *                     id_repartidor:
 *                       type: integer
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       example: "Juan Pérez"
 *                     ubicacion_actual:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                           example: 9.9300
 *                         lng:
 *                           type: number
 *                           example: -84.0850
 *                 ruta_optimizada:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_usuario:
 *                         type: integer
 *                         example: 5
 *                       nombre:
 *                         type: string
 *                         example: "María González"
 *                       coordenadas:
 *                         type: object
 *                         properties:
 *                           lat:
 *                             type: number
 *                             example: 9.9280
 *                           lng:
 *                             type: number
 *                             example: -84.0830
 *                       orden:
 *                         type: integer
 *                         example: 1
 *                         description: Orden de visita recomendado
 *                       distancia_desde_repartidor:
 *                         type: number
 *                         example: 1.2
 *                         description: Distancia desde repartidor (solo en primera parada)
 *                       distancia_desde_anterior:
 *                         type: number
 *                         example: 0.8
 *                         description: Distancia desde parada anterior
 *                       distancia_acumulada:
 *                         type: number
 *                         example: 2.0
 *                         description: Distancia total acumulada
 *                 distancia_total:
 *                   type: number
 *                   example: 5.7
 *                   description: Distancia total del recorrido en kilómetros
 *                 total_paradas:
 *                   type: integer
 *                   example: 3
 *                   description: Número total de paradas
 *       400:
 *         description: ID de repartidor requerido o repartidor sin ubicación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               id_faltante:
 *                 summary: ID de repartidor requerido
 *                 value:
 *                   error: "ID del repartidor es requerido."
 *               sin_ubicacion:
 *                 summary: Repartidor sin ubicación
 *                 value:
 *                   error: "Repartidor no tiene ubicación actual configurada."
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Solo los administradores pueden optimizar rutas."
 *       404:
 *         description: No hay usuarios asignados al repartidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No hay usuarios asignados a este repartidor."
 *                 ruta_optimizada:
 *                   type: array
 *                   example: []
 *                 distancia_total:
 *                   type: number
 *                   example: 0
 *                 total_paradas:
 *                   type: integer
 *                   example: 0
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No se pudieron calcular las distancias."
 */
router.get('/optimize/:id', authMiddleware, routingController.optimizeRoute);

/**
* @swagger
* /routing/assign/{id}:
*   post:
*     summary: Asignar repartidor automáticamente a un pedido
*     description: Encuentra el repartidor más cercano al restaurante usando Neo4J y lo asigna al pedido
*     tags: [Routing]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: integer
*         description: ID del pedido
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
*         description: 	ID de pedido requerido o pedido no válido
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*             examples:
*               id_faltante:
*                 summary: ID de pedido requerido
*                 value:
*                   error: "ID del pedido es requerido."
*               pedido_no_pendiente:
*                 summary: Pedido no pendiente
*                 value:
*                   error: "El pedido no está en estado pendiente."
*               restaurante_sin_ubicacion:
*                 summary: Restaurante sin ubicación
*                 value:
*                   error: "Restaurante no tiene ubicación configurada."
*       403:
*         description: No autorizado - requiere rol de administrador
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   example: "Solo los administradores pueden asignar repartidores."
*       404:
*         description: Pedido no encontrado o no hay repartidores disponibles
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*             examples:
*               pedido_no_encontrado:
*                 summary: Pedido no encontrado
*                 value:
*                   error: "Pedido no encontrado."
*               sin_repartidores:
*                 summary: No hay repartidores disponibles
*                 value:
*                   error: "No hay repartidores disponibles con ubicación."
*       500:
*         description: Error interno del servidor
*/

// El nombre "id_pedido" debe concordar con lo que hay dentro del controller
router.post('/assign/:id_pedido', authMiddleware, routingController.assignDriver);

module.exports = router;
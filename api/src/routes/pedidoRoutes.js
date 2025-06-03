const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Pedidos
 *   description: Endpoints para gestionar pedidos
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Obtener todos los pedidos
 *     tags: [Pedidos]
 *     responses:
 *       200:
 *         description: Lista de pedidos
 */
router.get('/', pedidoController.getAllPedidos);

/**
 * @swagger
 * /orders/unassigned:
 *   get:
 *     summary: Obtener pedidos sin repartidor asignado
 *     description: Obtiene todos los pedidos pendientes que no tienen repartidor asignado
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pedidos sin asignar obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Pedidos sin asignar obtenidos correctamente."
 *                 total:
 *                   type: integer
 *                   example: 5
 *                 pedidos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_pedido:
 *                         type: integer
 *                       id_usuario:
 *                         type: integer
 *                       id_restaurante:
 *                         type: integer
 *                       estado:
 *                         type: string
 *                         example: "pendiente"
 *                       tipo:
 *                         type: string
 *                       fecha_hora:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: No autorizado - requiere rol de administrador
 *       500:
 *         description: Error interno del servidor
 */
router.get('/unassigned', authMiddleware, pedidoController.getUnassignedOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Obtener un pedido por ID
 *     tags: [Pedidos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del pedido
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pedido encontrado
 *       404:
 *         description: Pedido no encontrado
 */
router.get('/:id', pedidoController.getPedidoById);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Crear un nuevo pedido
 *     tags: [Pedidos]
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
 *               - tipo
 *               - productos
 *             properties:
 *               id_usuario:
 *                 type: number
 *               id_restaurante:
 *                 type: number
 *               tipo:
 *                 type: string
 *                 enum: [en restaurante, para recoger]
 *               productos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id_producto
 *                     - cantidad
 *                   properties:
 *                     id_producto:
 *                       type: number
 *                     cantidad:
 *                       type: number
 *     responses:
 *       201:
 *         description: Pedido creado
 *       403:
 *         description: No autorizado
 */
router.post('/', authMiddleware, pedidoController.createPedido);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Eliminar un pedido
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del pedido
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pedido eliminado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Pedido no encontrado
 */
router.delete('/:id', authMiddleware, pedidoController.deletePedido);


/**
 * @swagger
 * /orders/driver/{id}:
 *   get:
 *     summary: Obtener pedidos asignados a un repartidor
 *     description: Obtiene todos los pedidos pendientes, en preparación o listos asignados a un repartidor específico
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del repartidor
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pedidos del repartidor obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Pedidos del repartidor obtenidos correctamente."
 *                 pedidos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_pedido:
 *                         type: integer
 *                       id_usuario:
 *                         type: integer
 *                       id_restaurante:
 *                         type: integer
 *                       id_repartidor:
 *                         type: integer
 *                       estado:
 *                         type: string
 *                         enum: [pendiente, en preparacion, listo]
 *                       tipo:
 *                         type: string
 *                       fecha_hora:
 *                         type: string
 *                         format: date-time
 *                       detalles:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id_producto:
 *                               type: integer
 *                             cantidad:
 *                               type: integer
 *                             subtotal:
 *                               type: number
 *       401:
 *         description: Token inválido o no proporcionado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/driver/:id', authMiddleware, pedidoController.getPedidosByDriver);


/**
 * @swagger
 * /orders/{id}/assign:
 *   put:
 *     summary: Asignar repartidor a un pedido
 *     description: Asigna un repartidor específico a un pedido pendiente
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del pedido al que se asignará el repartidor
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_repartidor
 *             properties:
 *               id_repartidor:
 *                 type: integer
 *                 description: ID del repartidor a asignar
 *                 example: 5
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
 *                   example: "Repartidor asignado correctamente."
 *                 pedido:
 *                   type: object
 *                   properties:
 *                     id_pedido:
 *                       type: integer
 *                     id_usuario:
 *                       type: integer
 *                     id_restaurante:
 *                       type: integer
 *                     id_repartidor:
 *                       type: integer
 *                     estado:
 *                       type: string
 *                     tipo:
 *                       type: string
 *                     fecha_hora:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: ID del repartidor es requerido
 *       401:
 *         description: Token inválido o no proporcionado
 *       403:
 *         description: No autorizado - solo administradores pueden asignar repartidores
 *       404:
 *         description: Pedido no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id/assign', authMiddleware, pedidoController.assignDriver);

/**
 * @swagger
 * /orders/{id}/status:
 *   put:
 *     summary: Actualizar estado de entrega de un pedido
 *     description: Cambia el estado de un pedido en el proceso de entrega
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del pedido cuyo estado se va a actualizar
 *         schema:
 *           type: integer
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
 *                 enum: [pendiente, en preparacion, listo, entregado]
 *                 description: Nuevo estado del pedido
 *                 example: "en preparacion"
 *     responses:
 *       200:
 *         description: Estado del pedido actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Estado del pedido actualizado correctamente."
 *                 pedido:
 *                   type: object
 *                   properties:
 *                     id_pedido:
 *                       type: integer
 *                     id_repartidor:
 *                       type: integer
 *                     estado:
 *                       type: string
 *                       example: "en camino"
 *       400:
 *         description: Estado inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Estado inválido."
 *                 estadosValidos:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["pendiente", "en preparacion", "listo", "en camino", "entregado", "cancelado"]
 *       401:
 *         description: Token inválido o no proporcionado
 *       404:
 *         description: Pedido no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id/status', authMiddleware, pedidoController.updateDeliveryStatus);

module.exports = router;

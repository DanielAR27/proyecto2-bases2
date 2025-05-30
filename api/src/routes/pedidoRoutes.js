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

module.exports = router;

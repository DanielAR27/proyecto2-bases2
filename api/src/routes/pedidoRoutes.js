const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Pedidos
 *   description: Endpoints para gestionar pedidos y entregas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderDetail:
 *       type: object
 *       properties:
 *         id_producto:
 *           type: integer
 *           example: 1
 *         cantidad:
 *           type: integer
 *           minimum: 1
 *           example: 2
 *         subtotal:
 *           type: number
 *           format: float
 *           example: 25.98
 *     Order:
 *       type: object
 *       properties:
 *         id_pedido:
 *           type: integer
 *           example: 1
 *         id_usuario:
 *           type: integer
 *           example: 5
 *         id_restaurante:
 *           type: integer
 *           example: 1
 *         id_repartidor:
 *           type: integer
 *           nullable: true
 *           example: null
 *         estado:
 *           type: string
 *           enum: [pendiente, en preparacion, listo, en camino, entregado, cancelado]
 *           example: "pendiente"
 *         tipo:
 *           type: string
 *           enum: [en restaurante, para recoger]
 *           example: "para recoger"
 *         fecha_hora:
 *           type: string
 *           format: date-time
 *           example: "2025-06-04T14:30:00Z"
 *         detalles:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderDetail'
 *     OrderCreate:
 *       type: object
 *       required:
 *         - id_usuario
 *         - id_restaurante
 *         - tipo
 *         - productos
 *       properties:
 *         id_usuario:
 *           type: integer
 *           example: 5
 *         id_restaurante:
 *           type: integer
 *           example: 1
 *         tipo:
 *           type: string
 *           enum: [en restaurante, para recoger]
 *           example: "para recoger"
 *         productos:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required:
 *               - id_producto
 *               - cantidad
 *             properties:
 *               id_producto:
 *                 type: integer
 *                 example: 1
 *               cantidad:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Obtener todos los pedidos
 *     description: Retorna una lista de todos los pedidos con sus detalles. Los datos pueden venir de caché Redis.
 *     tags: [Pedidos]
 *     responses:
 *       200:
 *         description: Lista de pedidos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *             example:
 *               - id_pedido: 1
 *                 id_usuario: 5
 *                 id_restaurante: 1
 *                 id_repartidor: null
 *                 estado: "pendiente"
 *                 tipo: "para recoger"
 *                 fecha_hora: "2025-06-04T14:30:00Z"
 *                 detalles:
 *                   - id_producto: 1
 *                     cantidad: 2
 *                     subtotal: 25.98
 *                   - id_producto: 3
 *                     cantidad: 1
 *                     subtotal: 8.50
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al obtener pedidos."
 */
router.get('/', pedidoController.getAllPedidos);

/**
 * @swagger
 * /orders/unassigned:
 *   get:
 *     summary: Obtener pedidos sin repartidor asignado
 *     description: Obtiene todos los pedidos pendientes que no tienen repartidor asignado. Solo administradores pueden acceder. Los datos pueden venir de caché Redis.
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
 *                         example: 1
 *                       id_usuario:
 *                         type: integer
 *                         example: 5
 *                       id_restaurante:
 *                         type: integer
 *                         example: 1
 *                       id_repartidor:
 *                         type: integer
 *                         nullable: true
 *                         example: null
 *                       estado:
 *                         type: string
 *                         example: "pendiente"
 *                       tipo:
 *                         type: string
 *                         example: "para recoger"
 *                       fecha_hora:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-06-04T14:30:00Z"
 *             example:
 *               message: "Pedidos sin asignar obtenidos correctamente."
 *               total: 2
 *               pedidos:
 *                 - id_pedido: 1
 *                   id_usuario: 5
 *                   id_restaurante: 1
 *                   id_repartidor: null
 *                   estado: "pendiente"
 *                   tipo: "para recoger"
 *                   fecha_hora: "2025-06-04T14:30:00Z"
 *                 - id_pedido: 2
 *                   id_usuario: 7
 *                   id_restaurante: 2
 *                   id_repartidor: null
 *                   estado: "pendiente"
 *                   tipo: "en restaurante"
 *                   fecha_hora: "2025-06-04T15:00:00Z"
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
 *               error: "No autorizado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al obtener pedidos sin asignar."
 */
router.get('/unassigned', authMiddleware, pedidoController.getUnassignedOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Obtener un pedido por ID
 *     description: Retorna la información detallada de un pedido específico con sus detalles. Los datos pueden venir de caché Redis.
 *     tags: [Pedidos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del pedido
 *         example: 1
 *     responses:
 *       200:
 *         description: Pedido encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *             example:
 *               id_pedido: 1
 *               id_usuario: 5
 *               id_restaurante: 1
 *               id_repartidor: null
 *               estado: "pendiente"
 *               tipo: "para recoger"
 *               fecha_hora: "2025-06-04T14:30:00Z"
 *               detalles:
 *                 - id_producto: 1
 *                   cantidad: 2
 *                   subtotal: 25.98
 *                 - id_producto: 3
 *                   cantidad: 1
 *                   subtotal: 8.50
 *       404:
 *         description: Pedido no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Pedido no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al buscar el pedido."
 */
router.get('/:id', pedidoController.getPedidoById);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Crear un nuevo pedido
 *     description: Crea un nuevo pedido en el sistema. Solo usuarios autenticados pueden crear pedidos para sí mismos, administradores pueden crear para cualquier usuario. Valida productos y calcula subtotales automáticamente.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderCreate'
 *           example:
 *             id_usuario: 5
 *             id_restaurante: 1
 *             tipo: "para recoger"
 *             productos:
 *               - id_producto: 1
 *                 cantidad: 2
 *               - id_producto: 3
 *                 cantidad: 1
 *     responses:
 *       201:
 *         description: Pedido creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Pedido creado exitosamente."
 *                 pedido:
 *                   $ref: '#/components/schemas/Order'
 *             example:
 *               message: "Pedido creado exitosamente."
 *               pedido:
 *                 id_pedido: 1
 *                 id_usuario: 5
 *                 id_restaurante: 1
 *                 estado: "pendiente"
 *                 tipo: "para recoger"
 *                 fecha_hora: "2025-06-04T14:30:00Z"
 *                 detalles:
 *                   - id_producto: 1
 *                     cantidad: 2
 *                     subtotal: 25.98
 *                   - id_producto: 3
 *                     cantidad: 1
 *                     subtotal: 8.50
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               datos_incompletos:
 *                 summary: Datos incompletos o inválidos
 *                 value:
 *                   error: "Datos incompletos o inválidos."
 *               producto_invalido:
 *                 summary: Producto inválido o cantidad incorrecta
 *                 value:
 *                   error: "Producto inválido o cantidad incorrecta."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado para crear pedidos para otros usuarios
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "No autorizado para crear pedidos para otros usuarios."
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Producto con ID 999 no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al crear el pedido."
 */
router.post('/', authMiddleware, pedidoController.createPedido);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Eliminar un pedido
 *     description: Elimina un pedido del sistema permanentemente. Solo administradores o el propietario del pedido pueden eliminarlo. También invalida los cachés relacionados.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del pedido a eliminar
 *         example: 1
 *     responses:
 *       200:
 *         description: Pedido eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Pedido eliminado correctamente."
 *             example:
 *               message: "Pedido eliminado correctamente."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado para eliminar este pedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "No autorizado para eliminar este pedido."
 *       404:
 *         description: Pedido no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Pedido no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               no_se_pudo_eliminar:
 *                 summary: No se pudo eliminar el pedido
 *                 value:
 *                   error: "No se pudo eliminar el pedido."
 *               error_general:
 *                 summary: Error general del servidor
 *                 value:
 *                   error: "Error al eliminar el pedido."
 */
router.delete('/:id', authMiddleware, pedidoController.deletePedido);

/**
 * @swagger
 * /orders/driver/{id}:
 *   get:
 *     summary: Obtener pedidos asignados a un repartidor
 *     description: Obtiene todos los pedidos pendientes, en preparación o listos asignados a un repartidor específico con sus detalles. Los datos pueden venir de caché Redis.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del repartidor
 *         example: 3
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
 *                     $ref: '#/components/schemas/Order'
 *             example:
 *               message: "Pedidos del repartidor obtenidos correctamente."
 *               pedidos:
 *                 - id_pedido: 5
 *                   id_usuario: 7
 *                   id_restaurante: 2
 *                   id_repartidor: 3
 *                   estado: "en preparacion"
 *                   tipo: "para recoger"
 *                   fecha_hora: "2025-06-04T15:00:00Z"
 *                   detalles:
 *                     - id_producto: 2
 *                       cantidad: 1
 *                       subtotal: 12.99
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al obtener pedidos del repartidor."
 */
router.get('/driver/:id', authMiddleware, pedidoController.getPedidosByDriver);

/**
 * @swagger
 * /orders/{id}/assign:
 *   put:
 *     summary: Asignar repartidor a un pedido
 *     description: Asigna un repartidor específico a un pedido pendiente. Solo administradores pueden realizar esta acción. Invalida múltiples cachés relacionados.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pedido al que se asignará el repartidor
 *         example: 1
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
 *                 example: 3
 *           example:
 *             id_repartidor: 3
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
 *                       example: 1
 *                     id_usuario:
 *                       type: integer
 *                       example: 5
 *                     id_restaurante:
 *                       type: integer
 *                       example: 1
 *                     id_repartidor:
 *                       type: integer
 *                       example: 3
 *                     estado:
 *                       type: string
 *                       example: "pendiente"
 *                     tipo:
 *                       type: string
 *                       example: "para recoger"
 *                     fecha_hora:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-06-04T14:30:00Z"
 *             example:
 *               message: "Repartidor asignado correctamente."
 *               pedido:
 *                 id_pedido: 1
 *                 id_usuario: 5
 *                 id_restaurante: 1
 *                 id_repartidor: 3
 *                 estado: "pendiente"
 *                 tipo: "para recoger"
 *                 fecha_hora: "2025-06-04T14:30:00Z"
 *       400:
 *         description: ID del repartidor es requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "ID del repartidor es requerido."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden asignar repartidores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "No autorizado. Solo administradores pueden asignar repartidores."
 *       404:
 *         description: Pedido no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Pedido no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al asignar repartidor."
 */
router.put('/:id/assign', authMiddleware, pedidoController.assignDriver);

/**
 * @swagger
 * /orders/{id}/status:
 *   put:
 *     summary: Actualizar estado de entrega de un pedido
 *     description: Cambia el estado de un pedido en el proceso de entrega. Valida que el estado sea uno de los permitidos e invalida múltiples cachés relacionados.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pedido cuyo estado se va a actualizar
 *         example: 1
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
 *                 enum: [pendiente, en preparacion, listo, en camino, entregado, cancelado]
 *                 description: Nuevo estado del pedido
 *                 example: "en preparacion"
 *           example:
 *             estado: "en preparacion"
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
 *                       example: 1
 *                     id_usuario:
 *                       type: integer
 *                       example: 5
 *                     id_restaurante:
 *                       type: integer
 *                       example: 1
 *                     id_repartidor:
 *                       type: integer
 *                       nullable: true
 *                       example: 3
 *                     estado:
 *                       type: string
 *                       example: "en preparacion"
 *                     tipo:
 *                       type: string
 *                       example: "para recoger"
 *                     fecha_hora:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-06-04T14:30:00Z"
 *             example:
 *               message: "Estado del pedido actualizado correctamente."
 *               pedido:
 *                 id_pedido: 1
 *                 id_usuario: 5
 *                 id_restaurante: 1
 *                 id_repartidor: 3
 *                 estado: "en preparacion"
 *                 tipo: "para recoger"
 *                 fecha_hora: "2025-06-04T14:30:00Z"
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
 *             example:
 *               error: "Estado inválido."
 *               estadosValidos: ["pendiente", "en preparacion", "listo", "en camino", "entregado", "cancelado"]
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       404:
 *         description: Pedido no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Pedido no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al actualizar estado del pedido."
 */
router.put('/:id/status', authMiddleware, pedidoController.updateDeliveryStatus);

module.exports = router;
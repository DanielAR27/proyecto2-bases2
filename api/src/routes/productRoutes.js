const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Productos
 *   description: Endpoints para gestión de productos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id_producto:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: "Pizza Margherita"
 *         categoria:
 *           type: string
 *           example: "Pizza"
 *         descripcion:
 *           type: string
 *           example: "Pizza con tomate, mozzarella y albahaca"
 *         precio:
 *           type: number
 *           format: float
 *           example: 12.99
 *         id_menu:
 *           type: integer
 *           example: 1
 *     ProductCreate:
 *       type: object
 *       required:
 *         - nombre
 *         - categoria
 *         - precio
 *         - id_menu
 *       properties:
 *         nombre:
 *           type: string
 *           example: "Pizza Margherita"
 *         categoria:
 *           type: string
 *           example: "Pizza"
 *         descripcion:
 *           type: string
 *           example: "Pizza con tomate, mozzarella y albahaca"
 *         precio:
 *           type: number
 *           format: float
 *           example: 12.99
 *         id_menu:
 *           type: integer
 *           example: 1
 *     ProductUpdate:
 *       type: object
 *       properties:
 *         nombre:
 *           type: string
 *           example: "Pizza Margherita Especial"
 *         categoria:
 *           type: string
 *           example: "Pizza"
 *         descripcion:
 *           type: string
 *           example: "Pizza gourmet con tomate, mozzarella fresca y albahaca"
 *         precio:
 *           type: number
 *           format: float
 *           example: 15.99
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Obtener todos los productos
 *     description: Retorna una lista de todos los productos disponibles. Los datos pueden venir de caché Redis.
 *     tags: [Productos]
 *     responses:
 *       200:
 *         description: Lista de productos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *             example:
 *               - id_producto: 1
 *                 nombre: "Pizza Margherita"
 *                 categoria: "Pizza"
 *                 descripcion: "Pizza con tomate, mozzarella y albahaca"
 *                 precio: 12.99
 *                 id_menu: 1
 *               - id_producto: 2
 *                 nombre: "Hamburguesa Clásica"
 *                 categoria: "Hamburguesa"
 *                 descripcion: "Hamburguesa con carne, lechuga y tomate"
 *                 precio: 8.50
 *                 id_menu: 1
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al obtener productos."
 */
router.get('/', productController.getAllProducts);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Obtener un producto por ID
 *     description: Retorna la información detallada de un producto específico. Los datos pueden venir de caché Redis.
 *     tags: [Productos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del producto
 *         example: 1
 *     responses:
 *       200:
 *         description: Producto encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *             example:
 *               id_producto: 1
 *               nombre: "Pizza Margherita"
 *               categoria: "Pizza"
 *               descripcion: "Pizza con tomate, mozzarella y albahaca"
 *               precio: 12.99
 *               id_menu: 1
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Producto no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al buscar el producto."
 */
router.get('/:id', productController.getProductById);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Crear un nuevo producto
 *     description: Crea un nuevo producto en el sistema. Solo administradores pueden realizar esta acción. También notifica al servicio de búsqueda e invalida el caché.
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *           example:
 *             nombre: "Pizza Margherita"
 *             categoria: "Pizza"
 *             descripcion: "Pizza con tomate, mozzarella y albahaca"
 *             precio: 12.99
 *             id_menu: 1
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Producto creado."
 *                 producto:
 *                   $ref: '#/components/schemas/Product'
 *             example:
 *               message: "Producto creado."
 *               producto:
 *                 id_producto: 1
 *                 nombre: "Pizza Margherita"
 *                 categoria: "Pizza"
 *                 descripcion: "Pizza con tomate, mozzarella y albahaca"
 *                 precio: 12.99
 *                 id_menu: 1
 *       400:
 *         description: Error de validación - campos requeridos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Faltan campos requeridos."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden crear productos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo administradores pueden crear productos."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al crear producto."
 */
router.post('/', authMiddleware, productController.createProduct);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Actualizar un producto existente
 *     description: Actualiza la información de un producto existente. Solo administradores pueden realizar esta acción. También notifica al servicio de búsqueda e invalida el caché.
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del producto a actualizar
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *           example:
 *             nombre: "Pizza Margherita Especial"
 *             categoria: "Pizza"
 *             descripcion: "Pizza gourmet con tomate, mozzarella fresca y albahaca"
 *             precio: 15.99
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Producto actualizado."
 *                 producto:
 *                   $ref: '#/components/schemas/Product'
 *             example:
 *               message: "Producto actualizado."
 *               producto:
 *                 id_producto: 1
 *                 nombre: "Pizza Margherita Especial"
 *                 categoria: "Pizza"
 *                 descripcion: "Pizza gourmet con tomate, mozzarella fresca y albahaca"
 *                 precio: 15.99
 *                 id_menu: 1
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden actualizar productos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo administradores pueden actualizar productos."
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Producto no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al actualizar el producto."
 */
router.put('/:id', authMiddleware, productController.updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Eliminar un producto
 *     description: Elimina un producto del sistema permanentemente. Solo administradores pueden realizar esta acción. También notifica al servicio de búsqueda e invalida múltiples cachés.
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del producto a eliminar
 *         example: 1
 *     responses:
 *       200:
 *         description: Producto eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Producto eliminado correctamente."
 *             example:
 *               message: "Producto eliminado correctamente."
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Token inválido o expirado."
 *       403:
 *         description: No autorizado - solo administradores pueden eliminar productos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Solo administradores pueden eliminar productos."
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Producto no encontrado."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Error al eliminar el producto."
 */
router.delete('/:id', authMiddleware, productController.deleteProduct);

module.exports = router;
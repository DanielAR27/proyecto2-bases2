// src/routes/searchRoutes.js
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Búsqueda de Productos
 *     description: Endpoints para buscar y reindexar productos desde Elasticsearch.
 *   - name: Gestión de Productos Indexados
 *     description: Endpoints para agregar, actualizar o eliminar productos en el índice de búsqueda.
 */

/**
 * @swagger
 * /search/products:
 *   get:
 *     summary: Buscar productos por texto
 *     tags: [Búsqueda de Productos]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Término de búsqueda
 *     responses:
*       200:
 *         description: Lista de productos encontrados
 *         content:
 *           application/json:
 *             example:
 *               total: 45
 *               products:
 *                 - nombre: Pasta
 *                   categoria: Ración pequeña
 *                   descripcion: pasta sabrosa empanizada
 *                   precio: 140.35
 *                   id_menu: 123
 *                   id_producto: 601
 *                   score: 9.084343
 *                 - nombre: Sushi
 *                   categoria: Entrada
 *                   descripcion: sushi crujiente glaseada
 *                   precio: 235.90
 *                   id_menu: 122
 *                   id_producto: 602
 *                   score: 8.782100
 *                 - ...
 *       400:
 *         description: Término de búsqueda no proporcionado
 *       500:
 *         description: Error al buscar productos
 */
router.get('/products', searchController.searchProducts);

/**
 * @swagger
 * /search/products/category/{categoria}:
 *   get:
 *     summary: Buscar productos por categoría
 *     tags: [Búsqueda de Productos]
 *     parameters:
 *       - in: path
 *         name: categoria
 *         schema:
 *           type: string
 *         required: true
 *         description: Categoría de los productos
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Página de resultados
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de resultados por página
 *     responses:
 *       200:
 *         description: Lista de productos filtrados por categoría
 *         content:
 *           application/json:
 *             example:
 *               total: 546
 *               products:
 *                 - nombre: Pasta
 *                   categoria: Combo
 *                   descripcion: pasta sabrosa de la casa
 *                   precio: 957.59
 *                   id_menu: 570
 *                   id_producto: 5077
 *                   score: 2.2218251
 *                 - nombre: Sandwich
 *                   categoria: Combo
 *                   descripcion: sandwich crujiente con especias
 *                   precio: 455.29
 *                   id_menu: 573
 *                   id_producto: 5107
 *                   score: 2.2218251
 *                 - ...
 *       500:
 *         description: Error al realizar la búsqueda por categoría
 */
router.get('/products/category/:categoria', searchController.searchProductsByCategory);

/**
 * @swagger
 * /search/reindex:
 *   post:
 *     summary: Reindexar todos los productos desde la base de datos
 *     tags: [Búsqueda de Productos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reindexación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Productos reindexados correctamente"
 *                 count:
 *                   type: integer
 *                   description: Número de productos reindexados
 *                   example: 150
 *       403:
 *         description: No autorizado para realizar reindexación
 *       500:
 *         description: Error al reindexar productos
 */
router.post('/reindex', authMiddleware, searchController.reindexProducts);

/**
 * @swagger
 * /search/product:
 *   post:
 *     summary: Indexar producto individual
 *     tags: [Gestión de Productos Indexados]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_producto:
 *                 type: integer
 *                 description: Identificador del producto
 *               nombre:
 *                 type: string
 *                 description: Nombre actualizado del producto
 *               descripcion:
 *                 type: string
 *                 description: Descripción actualizada del producto
 *               categoria:
 *                 type: string
 *                 description: Categoría actualizada del producto
 *             required:
 *               - nombre
 *               - categoria
 *     responses:
 *       201:
 *         description: Producto indexado correctamente
 *       400:
 *         description: Datos de producto incompletos
 *       403:
 *         description: No autorizado para crear índice del producto
 *       500:
 *         description: Error al indexar producto
 */
router.post('/product', authMiddleware, searchController.indexProduct);

/**
 * @swagger
 * /search/product/{id}:
 *   put:
 *     summary: Actualizar producto en el índice
 *     tags: [Gestión de Productos Indexados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre actualizado del producto
 *               descripcion:
 *                 type: string
 *                 description: Descripción actualizada del producto
 *               categoria:
 *                 type: string
 *                 description: Categoría actualizada del producto
 *             required:
 *               - nombre
 *               - categoria
 *     responses:
 *       200:
 *         description: Producto actualizado en índice correctamente
 *       400:
 *         description: Datos de producto incompletos
 *       403:
 *         description: No autorizado para actualizar índice del producto
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error al actualizar producto en índice
 */
router.put('/product/:id', authMiddleware, searchController.updateProduct);

/**
 * @swagger
 * /search/product/{id}:
 *   delete:
 *     summary: Eliminar producto del índice
 *     tags: [Gestión de Productos Indexados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto eliminado del índice correctamente
 *       403:
 *         description: No autorizado para eliminar índice del producto
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error al eliminar producto del índice
 */
router.delete('/product/:id', authMiddleware, searchController.deleteProduct);

module.exports = router;